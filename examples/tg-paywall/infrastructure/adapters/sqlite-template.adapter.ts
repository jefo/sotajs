import { FeaturePorts } from "../../../../lib";
import { MessagingFeature } from "../../application/features/messaging.feature";
import { getTemplatePort, saveTemplatePort, deleteTemplatePort, MessageTemplateDto } from "../../application/ports/paywall.ports";
import Database from "bun:sqlite";

export class SqliteTemplateAdapter
	implements FeaturePorts<typeof MessagingFeature>
{
	private db: Database;

	constructor(dbOrPath: Database | string = process.env.SQLITE_PATH || "paywall.sqlite") {
		if (dbOrPath instanceof Database) {
			this.db = dbOrPath;
		} else {
			// Очищаем путь от префикса file:, если он есть
			const path = typeof dbOrPath === 'string' ? dbOrPath.replace('file:', '') : dbOrPath;
			this.db = new Database(path);
		}
		this.initSchema();
	}

	private initSchema(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS templates (
				key TEXT PRIMARY KEY,
				content TEXT NOT NULL
			)
		`);
	}

	async getTemplate(input: { key: string }): Promise<MessageTemplateDto | null> {
		const row = this.db.prepare("SELECT * FROM templates WHERE key = ?").get(input.key) as any;
		return row ? { key: row.key, content: row.content } : null;
	}

	async saveTemplate(input: { key: string; content: string }): Promise<void> {
		this.db.prepare("INSERT OR REPLACE INTO templates (key, content) VALUES (?, ?)").run(input.key, input.content);
	}

	async deleteTemplate(input: { key: string }): Promise<void> {
		this.db.prepare("DELETE FROM templates WHERE key = ?").run(input.key);
	}
}
