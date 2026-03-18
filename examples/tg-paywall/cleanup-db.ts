import Database from "bun:sqlite";

const dbPath = `${import.meta.dir}/paywall.sqlite`;
const db = new Database(dbPath);

console.log(`🧹 Cleaning database at ${dbPath}...`);

// Очистка всех таблиц
db.run("DELETE FROM plans");
db.run("DELETE FROM subscriptions");
db.run("DELETE FROM access_grants");
db.run("DELETE FROM templates");

// Создание эталонного тарифа для легенды Product Accelerator
const plan = {
  id: crypto.randomUUID(),
  name: "🚀 Senior Career Sprint",
  price: 1990,
  currency: "RUB",
  duration_days: 30,
  channel_id: "-1003582757505", // Ваш ID канала
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

db.run(`
  INSERT INTO plans (id, name, price, currency, duration_days, channel_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`, [
  plan.id,
  plan.name,
  plan.price,
  plan.currency,
  plan.duration_days,
  plan.channel_id,
  plan.created_at,
  plan.updated_at
]);

console.log(`✅ Database cleaned. Created plan: "${plan.name}" (${plan.price} ${plan.currency})`);
db.close();
