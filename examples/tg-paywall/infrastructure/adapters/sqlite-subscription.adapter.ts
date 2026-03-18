import { FeaturePorts } from "../../../../lib";
import { SubscriptionFeature } from "../../application/features/subscription.feature";
import {
	SubscriptionDto,
	AccessGrantDto,
} from "../../application/ports/paywall.ports";
import Database from "bun:sqlite";

export class SqliteSubscriptionAdapter
	implements FeaturePorts<typeof SubscriptionFeature>
{
	private db: Database;

	constructor(dbOrPath: Database | string = ":memory:") {
		if (dbOrPath instanceof Database) {
			this.db = dbOrPath;
		} else {
			this.db = new Database(dbOrPath);
		}
		this.initSchema();
	}

	private initSchema(): void {
		// Создаем таблицу подписок
		this.db.run(`
			CREATE TABLE IF NOT EXISTS subscriptions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				plan_id TEXT NOT NULL,
				status TEXT NOT NULL,
				expires_at TEXT,
				price INTEGER NOT NULL,
				currency TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)
		`);

		// Создаем таблицу доступов
		this.db.run(`
			CREATE TABLE IF NOT EXISTS access_grants (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				resource_id TEXT NOT NULL,
				resource_type TEXT NOT NULL,
				status TEXT NOT NULL,
				subscription_id TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)
		`);
	}

	// Subscription methods
	async saveSubscription(input: {
		subscription: SubscriptionDto;
	}): Promise<void> {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO subscriptions
			(id, user_id, plan_id, status, expires_at, price, currency, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			input.subscription.id,
			input.subscription.userId,
			input.subscription.planId,
			input.subscription.status,
			input.subscription.expiresAt?.toISOString() || null,
			input.subscription.price,
			input.subscription.currency,
			input.subscription.createdAt.toISOString(),
			input.subscription.updatedAt.toISOString(),
		);
	}

	async updateSubscription(input: {
		subscription: SubscriptionDto;
	}): Promise<void> {
		await this.saveSubscription(input); // SQLite использует INSERT OR REPLACE
	}

	async findSubscriptionById(input: {
		id: string;
	}): Promise<SubscriptionDto | null> {
		const stmt = this.db.prepare(`
			SELECT * FROM subscriptions WHERE id = ?
		`);

		const row = stmt.get(input.id) as any;

		if (!row) return null;

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

	async findSubscriptionsByUserId(input: {
		userId: string;
	}): Promise<SubscriptionDto[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC
		`);

		const rows = stmt.all(input.userId) as any[];

		return rows.map((row) => ({
			id: row.id,
			userId: row.user_id,
			planId: row.plan_id,
			status: row.status as any,
			expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
			price: row.price,
			currency: row.currency,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		}));
	}

	async listAllSubscriptions(): Promise<SubscriptionDto[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM subscriptions ORDER BY created_at DESC
		`);

		const rows = stmt.all() as any[];

		return rows.map((row) => ({
			id: row.id,
			userId: row.user_id,
			planId: row.plan_id,
			status: row.status as any,
			expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
			price: row.price,
			currency: row.currency,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		}));
	}

	async findExpiredSubscriptions(input: {
		now: Date;
	}): Promise<SubscriptionDto[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM subscriptions
			WHERE status = 'active'
			AND expires_at IS NOT NULL
			AND expires_at < ?
		`);

		const rows = stmt.all(input.now.toISOString()) as any[];

		return rows.map((row) => ({
			id: row.id,
			userId: row.user_id,
			planId: row.plan_id,
			status: row.status as any,
			expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
			price: row.price,
			currency: row.currency,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		}));
	}

	// AccessGrant methods
	async saveAccessGrant(input: { accessGrant: AccessGrantDto }): Promise<void> {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO access_grants
			(id, user_id, resource_id, resource_type, status, subscription_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			input.accessGrant.id,
			input.accessGrant.userId,
			input.accessGrant.resourceId,
			input.accessGrant.resourceType,
			input.accessGrant.status,
			input.accessGrant.subscriptionId,
			input.accessGrant.createdAt.toISOString(),
			input.accessGrant.updatedAt.toISOString(),
		);
	}

	async updateAccessGrant(input: {
		accessGrant: AccessGrantDto;
	}): Promise<void> {
		await this.saveAccessGrant(input);
	}

	async findAccessGrantBySubscriptionId(input: {
		subscriptionId: string;
	}): Promise<AccessGrantDto | null> {
		const stmt = this.db.prepare(`
			SELECT * FROM access_grants WHERE subscription_id = ?
		`);

		const row = stmt.get(input.subscriptionId) as any;

		if (!row) return null;

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

	async findAccessGrantsByUserId(input: {
		userId: string;
	}): Promise<AccessGrantDto[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM access_grants WHERE user_id = ?
		`);

		const rows = stmt.all(input.userId) as any[];

		return rows.map((row) => ({
			id: row.id,
			userId: row.user_id,
			resourceId: row.resource_id,
			resourceType: row.resource_type as any,
			status: row.status as any,
			subscriptionId: row.subscription_id,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		}));
	}

	close(): void {
		this.db.close();
	}
}
