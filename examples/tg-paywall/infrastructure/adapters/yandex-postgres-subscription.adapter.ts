import { FeaturePorts } from "../../../../lib";
import { SubscriptionFeature } from "../../application/features/subscription.feature";
import {
	SubscriptionDto,
	AccessGrantDto,
} from "../../application/ports/paywall.ports";
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
export class YandexPostgresSubscriptionAdapter
	implements FeaturePorts<typeof SubscriptionFeature>
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
			// Таблица подписок
			await client.query(`
				CREATE TABLE IF NOT EXISTS subscriptions (
					id TEXT PRIMARY KEY,
					user_id TEXT NOT NULL,
					plan_id TEXT NOT NULL,
					status TEXT NOT NULL,
					expires_at TIMESTAMPTZ,
					price INTEGER NOT NULL,
					currency TEXT NOT NULL,
					created_at TIMESTAMPTZ NOT NULL,
					updated_at TIMESTAMPTZ NOT NULL,
					CONSTRAINT fk_plan
						FOREIGN KEY (plan_id)
						REFERENCES plans(id)
						ON DELETE CASCADE
				)
			`);

			// Таблица доступов
			await client.query(`
				CREATE TABLE IF NOT EXISTS access_grants (
					id TEXT PRIMARY KEY,
					user_id TEXT NOT NULL,
					resource_id TEXT NOT NULL,
					resource_type TEXT NOT NULL,
					status TEXT NOT NULL,
					subscription_id TEXT NOT NULL,
					created_at TIMESTAMPTZ NOT NULL,
					updated_at TIMESTAMPTZ NOT NULL,
					CONSTRAINT fk_subscription
						FOREIGN KEY (subscription_id)
						REFERENCES subscriptions(id)
						ON DELETE CASCADE
				)
			`);

			// Индексы для ускорения поиска
			await client.query(`
				CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
				CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
				CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);
				CREATE INDEX IF NOT EXISTS idx_access_grants_user_id ON access_grants(user_id);
				CREATE INDEX IF NOT EXISTS idx_access_grants_subscription_id ON access_grants(subscription_id);
			`);
			console.log('[PostgreSQL] Subscriptions and Access Grants tables initialized');
		} catch (err) {
			console.error('[PostgreSQL] Failed to initialize subscription tables:', err);
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

	// Subscription methods
	async saveSubscription(input: {
		subscription: SubscriptionDto;
	}): Promise<void> {
		await this.ensureInitialized();
		const client = await this.pool.connect();
		try {
			await client.query(
				`
				INSERT INTO subscriptions
				(id, user_id, plan_id, status, expires_at, price, currency, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
				ON CONFLICT (id) DO UPDATE SET
					user_id = EXCLUDED.user_id,
					plan_id = EXCLUDED.plan_id,
					status = EXCLUDED.status,
					expires_at = EXCLUDED.expires_at,
					price = EXCLUDED.price,
					currency = EXCLUDED.currency,
					updated_at = EXCLUDED.updated_at
				`,
				[
					input.subscription.id,
					input.subscription.userId,
					input.subscription.planId,
					input.subscription.status,
					input.subscription.expiresAt?.toISOString() || null,
					input.subscription.price,
					input.subscription.currency,
					input.subscription.createdAt.toISOString(),
					input.subscription.updatedAt.toISOString(),
				]
			);
		} finally {
			client.release();
		}
	}

	async updateSubscription(input: {
		subscription: SubscriptionDto;
	}): Promise<void> {
		await this.ensureInitialized();
		await this.saveSubscription(input);
	}

	async findSubscriptionById(input: {
		id: string;
	}): Promise<SubscriptionDto | null> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM subscriptions WHERE id = $1`,
			[input.id]
		);

		const row = result.rows[0];
		if (!row) return null;

		return this.mapSubscriptionRowToDto(row);
	}

	async findSubscriptionsByUserId(input: {
		userId: string;
	}): Promise<SubscriptionDto[]> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
			[input.userId]
		);

		return result.rows.map((row) => this.mapSubscriptionRowToDto(row));
	}

	async listAllSubscriptions(): Promise<SubscriptionDto[]> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM subscriptions ORDER BY created_at DESC`
		);

		return result.rows.map((row) => this.mapSubscriptionRowToDto(row));
	}

	async findExpiredSubscriptions(input: {
		now: Date;
	}): Promise<SubscriptionDto[]> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`
			SELECT * FROM subscriptions
			WHERE status = $1
			AND expires_at IS NOT NULL
			AND expires_at < $2
			`,
			["active", input.now.toISOString()]
		);

		return result.rows.map((row) => this.mapSubscriptionRowToDto(row));
	}

	// AccessGrant methods
	async saveAccessGrant(input: { accessGrant: AccessGrantDto }): Promise<void> {
		await this.ensureInitialized();
		const client = await this.pool.connect();
		try {
			await client.query(
				`
				INSERT INTO access_grants
				(id, user_id, resource_id, resource_type, status, subscription_id, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (id) DO UPDATE SET
					user_id = EXCLUDED.user_id,
					resource_id = EXCLUDED.resource_id,
					resource_type = EXCLUDED.resource_type,
					status = EXCLUDED.status,
					subscription_id = EXCLUDED.subscription_id,
					updated_at = EXCLUDED.updated_at
				`,
				[
					input.accessGrant.id,
					input.accessGrant.userId,
					input.accessGrant.resourceId,
					input.accessGrant.resourceType,
					input.accessGrant.status,
					input.accessGrant.subscriptionId,
					input.accessGrant.createdAt.toISOString(),
					input.accessGrant.updatedAt.toISOString(),
				]
			);
		} finally {
			client.release();
		}
	}

	async updateAccessGrant(input: {
		accessGrant: AccessGrantDto;
	}): Promise<void> {
		await this.ensureInitialized();
		await this.saveAccessGrant(input);
	}

	async findAccessGrantBySubscriptionId(input: {
		subscriptionId: string;
	}): Promise<AccessGrantDto | null> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM access_grants WHERE subscription_id = $1`,
			[input.subscriptionId]
		);

		const row = result.rows[0];
		if (!row) return null;

		return this.mapAccessGrantRowToDto(row);
	}

	async findAccessGrantsByUserId(input: {
		userId: string;
	}): Promise<AccessGrantDto[]> {
		await this.ensureInitialized();
		const result = await this.pool.query(
			`SELECT * FROM access_grants WHERE user_id = $1`,
			[input.userId]
		);

		return result.rows.map((row) => this.mapAccessGrantRowToDto(row));
	}

	private mapSubscriptionRowToDto(row: any): SubscriptionDto {
		return {
			id: row.id,
			userId: row.user_id,
			planId: row.plan_id,
			status: row.status as any,
			expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
			price: row.price,
			currency: row.currency,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};
	}

	private mapAccessGrantRowToDto(row: any): AccessGrantDto {
		return {
			id: row.id,
			userId: row.user_id,
			resourceId: row.resource_id,
			resourceType: row.resource_type as any,
			status: row.status as any,
			subscriptionId: row.subscription_id,
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
