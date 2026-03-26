import { FeaturePorts } from "../../../../lib";
import { PlanManagementFeature } from "../../application/features/plan-management.feature";
import { PlanDto } from "../../application/ports/paywall.ports";
import { Pool } from "pg";

/**
 * Адаптер для Yandex Managed PostgreSQL.
 * 
 * Требования к БД:
 * - Создать базу данных в Yandex Cloud Managed PostgreSQL
 * - Получить connection string из консоли Yandex Cloud
 * - Установить переменную окружения DATABASE_URL
 * 
 * Пример connection string:
 * postgresql://user:password@host:port/database?sslmode=require
 */
export class YandexPostgresPlanAdapter
	implements FeaturePorts<typeof PlanManagementFeature>
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
			// Для serverless важно ограничить размер пула
			max: 10,
			// Таймаут ожидания соединения (важно для cold start)
			connectionTimeoutMillis: 5000,
			// Таймаут запроса
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
				CREATE TABLE IF NOT EXISTS plans (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					plan_group TEXT NOT NULL DEFAULT 'standard',
					access_level TEXT NOT NULL DEFAULT 'base',
					price INTEGER NOT NULL,
					currency TEXT NOT NULL,
					duration_days INTEGER NOT NULL,
					trial_days INTEGER NOT NULL DEFAULT 0,
					is_recurring INTEGER NOT NULL DEFAULT 0,
					channel_id TEXT NOT NULL,
					created_at TIMESTAMPTZ NOT NULL,
					updated_at TIMESTAMPTZ NOT NULL
				)
			`);

			// Индексы для ускорения поиска
			await client.query(`
				CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
				CREATE INDEX IF NOT EXISTS idx_plans_channel_id ON plans(channel_id);
			`);
			console.log('[PostgreSQL] Plans table initialized');
		} catch (err) {
			console.error('[PostgreSQL] Failed to initialize plans table:', err);
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

	async savePlan(input: { plan: PlanDto }): Promise<void> {
		await this.ensureInitialized();
		const client = await this.pool.connect();
		try {
			await client.query(
				`
				INSERT INTO plans
				(id, name, plan_group, access_level, price, currency, duration_days, trial_days, is_recurring, channel_id, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				ON CONFLICT (id) DO UPDATE SET
					name = EXCLUDED.name,
					plan_group = EXCLUDED.plan_group,
					access_level = EXCLUDED.access_level,
					price = EXCLUDED.price,
					currency = EXCLUDED.currency,
					duration_days = EXCLUDED.duration_days,
					trial_days = EXCLUDED.trial_days,
					is_recurring = EXCLUDED.is_recurring,
					channel_id = EXCLUDED.channel_id,
					updated_at = EXCLUDED.updated_at
				`,
				[
					input.plan.id,
					input.plan.name,
					input.plan.group,
					input.plan.accessLevel,
					input.plan.price,
					input.plan.currency,
					input.plan.durationDays,
					input.plan.trialDays,
					input.plan.isRecurring ? 1 : 0,
					input.plan.channelId,
					input.plan.createdAt.toISOString(),
					input.plan.updatedAt.toISOString(),
				]
			);
		} finally {
			client.release();
		}
	}

	async findPlanById(input: { id: string }): Promise<PlanDto | null> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM plans WHERE id = $1`,
			[input.id]
		);

		const row = result.rows[0];
		if (!row) return null;

		return this.mapRowToDto(row);
	}

	async findPlanByName(input: { name: string }): Promise<PlanDto | null> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM plans WHERE name = $1`,
			[input.name]
		);

		const row = result.rows[0];
		if (!row) return null;

		return this.mapRowToDto(row);
	}

	async listPlans(): Promise<PlanDto[]> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM plans ORDER BY created_at DESC`
		);

		return result.rows.map((row) => this.mapRowToDto(row));
	}

	private mapRowToDto(row: any): PlanDto {
		return {
			id: row.id,
			name: row.name,
			group: row.plan_group,
			accessLevel: row.access_level,
			price: row.price,
			currency: row.currency,
			durationDays: row.duration_days,
			trialDays: row.trial_days,
			isRecurring: row.is_recurring === 1,
			channelId: row.channel_id,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};
	}

	/**
	 * Закрыть пул соединений.
	 * Важно вызывать при shutdown функции.
	 */
	async close(): Promise<void> {
		await this.pool.end();
	}
}
