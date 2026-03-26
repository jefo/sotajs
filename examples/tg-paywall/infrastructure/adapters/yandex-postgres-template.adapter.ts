import { FeaturePorts } from "../../../../lib";
import { MessagingFeature } from "../../application/features/messaging.feature";
import { Pool } from "pg";

/**
 * Адаптер для Yandex Managed PostgreSQL.
 * 
 * Требования к БД:
 * - Создать базу данных в Yandex Cloud Managed PostgreSQL
 * - Получить connection string из консоли Yandex Cloud
 * - Установить переменную окружения DATABASE_URL
 */
export class YandexPostgresTemplateAdapter
	implements FeaturePorts<typeof MessagingFeature>
{
	private pool: Pool;
	private initialized: Promise<void>;

	constructor(connectionString?: string) {
		const dbUrl = connectionString || process.env.DATABASE_URL;
		
		if (!dbUrl) {
			throw new Error(
				"DATABASE_URL is required. Set it in environment or pass connection string to constructor."
			);
		}

		this.pool = new Pool({
			connectionString: dbUrl,
			max: 10,
			connectionTimeoutMillis: 5000,
			statement_timeout: 10000,
			// SSL обязателен для Supabase и облачных БД
			ssl: {
				rejectUnauthorized: false,
			},
		});

		// Инициализация схемы - ждём завершения перед использованием
		this.initialized = this.initSchema();
	}

	private async initSchema(): Promise<void> {
		const client = await this.pool.connect();
		try {
			await client.query(`
				CREATE TABLE IF NOT EXISTS templates (
					key TEXT PRIMARY KEY,
					content TEXT NOT NULL,
					created_at TIMESTAMPTZ NOT NULL,
					updated_at TIMESTAMPTZ NOT NULL
				)
			`);
			console.log('[PostgreSQL] Templates table initialized');
		} catch (err) {
			console.error('[PostgreSQL] Failed to initialize templates table:', err);
			throw err;
		} finally {
			client.release();
		}
	}

	/**
	 * Ждём завершения инициализации перед выполнением запросов
	 */
	private async ensureInitialized(): Promise<void> {
		await this.initialized;
	}

	async getTemplate(input: { key: string }): Promise<{ key: string; content: string } | null> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM templates WHERE key = $1`,
			[input.key]
		);

		const row = result.rows[0];
		if (!row) return null;

		return {
			key: row.key,
			content: row.content,
		};
	}

	async saveTemplate(input: { key: string; content: string }): Promise<void> {
		await this.ensureInitialized();
		const client = await this.pool.connect();
		try {
			await client.query(
				`
				INSERT INTO templates (key, content, created_at, updated_at)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (key) DO UPDATE SET
					content = EXCLUDED.content,
					updated_at = EXCLUDED.updated_at
				`,
				[input.key, input.content, new Date().toISOString(), new Date().toISOString()]
			);
		} finally {
			client.release();
		}
	}

	async deleteTemplate(input: { key: string }): Promise<void> {
		await this.ensureInitialized();
		await this.pool.query(
			`DELETE FROM templates WHERE key = $1`,
			[input.key]
		);
	}

	/**
	 * Закрыть пул соединений.
	 */
	async close(): Promise<void> {
		await this.pool.end();
	}
}
