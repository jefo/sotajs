import Database from "bun:sqlite";

const dbPath = `${import.meta.dir}/paywall.sqlite`;
const db = new Database(dbPath);

console.log(`🧹 Cleaning database and creating Product Accelerator plans...`);

db.run("DROP TABLE IF EXISTS plans");
db.run("DROP TABLE IF EXISTS subscriptions");
db.run("DROP TABLE IF EXISTS access_grants");

db.run(`
  CREATE TABLE plans (
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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const plans = [
  {
    id: crypto.randomUUID(),
    name: "🚀 Career Accelerator (30 days)",
    plan_group: "career_accelerator",
    access_level: "resident",
    price: 2990,
    currency: "RUB",
    duration_days: 30,
    trial_days: 0,
    is_recurring: 0,
    channel_id: "-1003582757505"
  },
  {
    id: crypto.randomUUID(),
    name: "👑 Lifetime Legend (Forever)",
    plan_group: "career_accelerator",
    access_level: "legend",
    price: 14990,
    currency: "RUB",
    duration_days: 9999,
    trial_days: 0,
    is_recurring: 0,
    channel_id: "-1003582757505"
  }
];

const stmt = db.prepare(`
  INSERT INTO plans (id, name, plan_group, access_level, price, currency, duration_days, trial_days, is_recurring, channel_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();

plans.forEach(p => {
  stmt.run(p.id, p.name, p.plan_group, p.access_level, p.price, p.currency, p.duration_days, p.trial_days, p.is_recurring, p.channel_id, now, now);
});

console.log(`✅ Created ${plans.length} Product Accelerator plans:`);
plans.forEach(p => {
  console.log(`   • ${p.name} — ${p.price} ${p.currency} (${p.access_level})`);
});

db.close();
