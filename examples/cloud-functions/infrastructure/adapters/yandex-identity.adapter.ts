import { FeaturePorts } from "../../../../lib";
import { IdentityFeature } from "../ports/identity-feature";
import { CloudProfileDto } from "../ports/identity.ports";
import { Database } from "bun:sqlite";

/**
 * Yandex Identity Adapter: Control Plane (Provider Registry)
 * 
 * В этой БД мы храним «Мост» между пользователем и реальным Облаком.
 */
export class YandexIdentityAdapter implements FeaturePorts<typeof IdentityFeature> {
  private db: Database;

  constructor(dbPath: string = "cloud-profiles.sqlite") {
    this.db = new Database(dbPath);
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        name TEXT PRIMARY KEY,
        folderId TEXT,
        oauthToken TEXT,
        updated_at DATETIME
      )
    `);
  }

  async saveProfile(input: CloudProfileDto): Promise<void> {
    console.log(`💾 [SotaJS Cloud] Linking provider to profile: ${input.name}...`);
    this.db.prepare(`
      INSERT OR REPLACE INTO profiles (name, folderId, oauthToken, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(
      input.name,
      input.folderId,
      input.oauthToken || null,
      new Date().toISOString()
    );
  }

  async getProfile(name: string): Promise<CloudProfileDto | null> {
    const row = this.db.prepare("SELECT * FROM profiles WHERE name = ?").get(name) as any;
    if (!row) return null;

    return {
      name: row.name,
      folderId: row.folderId,
      oauthToken: row.oauthToken,
    };
  }
}
