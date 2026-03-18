import { FeaturePorts } from "../../../../lib";
import { PlanManagementFeature } from "../../application/features/plan-management.feature";
import { PlanDto } from "../../application/ports/paywall.ports";
import Database from "bun:sqlite";

export class SqlitePlanAdapter
	implements FeaturePorts<typeof PlanManagementFeature>
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
		// Создаем таблицу планов
		this.db.run(`
			CREATE TABLE IF NOT EXISTS plans (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				price INTEGER NOT NULL,
				currency TEXT NOT NULL,
				duration_days INTEGER NOT NULL,
				channel_id TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)
		`);
	}

	async savePlan(input: { plan: PlanDto }): Promise<void> {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO plans
			(id, name, price, currency, duration_days, channel_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			input.plan.id,
			input.plan.name,
			input.plan.price,
			input.plan.currency,
			input.plan.durationDays,
			input.plan.channelId,
			input.plan.createdAt.toISOString(),
			input.plan.updatedAt.toISOString(),
		);
	}

	async findPlanById(input: { id: string }): Promise<PlanDto | null> {
		const stmt = this.db.prepare(`
			SELECT * FROM plans WHERE id = ?
		`);

		const row = stmt.get(input.id) as any;

		if (!row) return null;

		return {
			id: row.id,
			name: row.name,
			price: row.price,
			currency: row.currency,
			durationDays: row.duration_days,
			channelId: row.channel_id,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};
	}

	async findPlanByName(input: { name: string }): Promise<PlanDto | null> {
		const stmt = this.db.prepare(`
			SELECT * FROM plans WHERE name = ?
		`);

		const row = stmt.get(input.name) as any;

		if (!row) return null;

		return {
			id: row.id,
			name: row.name,
			price: row.price,
			currency: row.currency,
			durationDays: row.duration_days,
			channelId: row.channel_id,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};
	}

	async listPlans(): Promise<PlanDto[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM plans ORDER BY created_at DESC
		`);

		const rows = stmt.all() as any[];

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			price: row.price,
			currency: row.currency,
			durationDays: row.duration_days,
			channelId: row.channel_id,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		}));
	}

	close(): void {
		this.db.close();
	}
}
