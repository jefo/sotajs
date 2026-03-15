---
name: sotajs-system-wiring
description: Сборка и связывание системы в SotaJS. Используйте при создании Портов (createPort), Фич (defineFeature), Ядра (defineCore), реализации Адаптеров и Composition Root.
---

# Связывание Системы (SotaJS System Wiring)

## 1. Порты (Ports)
Это контракты (интерфейсы) для взаимодействия с внешним миром (БД, Логгер, API).

```ts
import { createPort } from "@sotajs/core";
// Сигнатура описывает обычную функцию (Sota сделает ее Promise автоматически)
export const findUserPort = createPort<(id: string) => User | null>();
```

## 2. Фичи (Features)
Группировка логически связанных портов.

```ts
import { defineFeature } from "@sotajs/core";
export const MyFeature = defineFeature({
  findUser: findUserPort,
  saveUser: saveUserPort,
});
```

## 3. Адаптеры (Adapters)
Конкретная реализация фичи (например, `PrismaAdapter`, `InMemoryAdapter`). 

```ts
import { FeaturePorts } from "@sotajs/core";
// Класс-адаптер ДОЛЖЕН реализовать все порты фичи
class MyAdapter implements FeaturePorts<typeof MyFeature> {
  async findUser(id: string) { ... }
  async saveUser(user: User) { ... }
}
```

## 4. Ядро и Сборка (Core & Composition Root)
Точка композиции, где всё связывается воедино.

```ts
// application/index.ts
export const core = defineCore({
  users: MyFeature,
});

// main.ts (Composition Root)
import { core } from "./application";
import { MyAdapter } from "./infrastructure";

core.bindFeatures(({ users }) => {
  users.bind(MyAdapter);
});
```

## Рекомендации
- **Infrastructure separation**: Адаптеры должны находиться в слое `infrastructure` и знать о домене (для маппинга), но домен не должен знать о них.
- **Dependency Inversion**: Use cases зависят от портов, а адаптеры реализуют порты.
