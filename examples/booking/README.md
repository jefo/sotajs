# Booking Example: Spec-driven разработка с SotaJS

## 🎯 Цель демо

Показать как **spec-driven разработчик** создаёт production-ready архитектуру за 2 минуты с помощью ИИ и SotaJS.

---

## 📁 Структура проекта

```
examples/booking/
├── 00-dsl-prompt.md          # Входной промт (что пишет разработчик)
├── 01-PRD.md                 # Product Requirements Document
├── 02-TECH-SPEC.md           # Technical Specification
├── SHORTS_SCRIPT.md          # Сценарий для YouTube Shorts
│
├── domain/                   # Доменная модель
│   ├── time-slot.ts          # Value Object: временной слот
│   ├── booking.aggregate.ts  # Агрегат: бронирование
│   ├── cancellation-policy.ts # Спецификация: правила отмены
│   └── index.ts
│
├── application/              # Бизнес-логика (CQRS)
│   ├── commands/
│   │   ├── create-booking.command.ts
│   │   └── cancel-booking.command.ts
│   ├── queries/
│   │   └── get-room-schedule.query.ts
│   └── index.ts
│
├── infrastructure/           # Порты и адаптеры
│   ├── ports/
│   │   └── booking.ports.ts
│   ├── adapters/
│   │   └── in-memory-booking.adapter.ts
│   └── index.ts
│
├── booking.composition.ts    # Сборка приложения
├── booking.test.ts           # Тесты (19 pass ✅)
└── index.ts                  # Демо
```

---

## 🚀 Быстрый старт

### Запустить тесты
```bash
bun test examples/booking/booking.test.ts
```

**Ожидаемый результат:**
```
19 pass
0 fail
43 expect() calls
Ran 19 tests across 1 file. [111ms]
```

---

### Запустить демо
```bash
bun run examples/booking/index.ts
```

**Ожидаемый результат:**
```
🏢 Booking System Demo

📅 Создание бронирования...
✅ Бронирование создано: <uuid>
💰 Стоимость: 1000 руб.

📅 Попытка пересекающегося бронирования...
✅ Инвариант сработал: Time slot overlaps!

📅 Расписание комнаты Amber...
📊 Комната: Amber
📌 Бронирований: 1

📅 Отмена бронирования...
✅ Бронирование отменено
💰 Штраф: 0 руб.

🎉 Demo completed!
```

---

## 📊 Что покрывают тесты

### Domain Layer (7 тестов)
- ✅ TimeSlot: валидация, overlapsWith
- ✅ Booking: инварианты, actions, events
- ✅ CancellationPolicy: penalty calculation

### Application Layer (6 тестов)
- ✅ CreateBookingCommand: создание, overlap detection
- ✅ CancelBookingCommand: early/late cancellation
- ✅ GetRoomScheduleQuery: фильтрация, агрегация

---

## 🎬 Для съёмки Shorts

1. **Начни с `00-dsl-prompt.md`** — покажи промт
2. **Открой `01-PRD.md`** — бизнес-правила
3. **Открой `02-TECH-SPEC.md`** — архитектура
4. **Запусти тесты** — 19 зелёных
5. **Запусти демо** — покажи работу

**Сценарий:** см. `SHORTS_SCRIPT.md`

---

## 📚 Ключевые концепции

### Spec-driven подход
1. Промт с бизнес-правилами
2. Генерация PRD и TECH-SPEC
3. Генерация кода по спецификации
4. Тесты покрывают инварианты

### DDD
- **Агрегаты** — Booking с инвариантами
- **Value Objects** — TimeSlot с логикой
- **Domain Events** — BookingCreatedEvent, BookingCancelledEvent

### CQRS
- **Commands** — изменяют состояние (create, cancel)
- **Queries** — читают данные (get schedule)

### Hexagonal Architecture
- **Порты** — контракты (saveBookingPort, findBookingByIdPort)
- **Адаптеры** — реализации (InMemoryBookingAdapter)

---

## 🔗 Связанные документы

- [SotaJS README](../../README.md) — общая архитектура
- [CQRS Integration](../../docs/cqrs-integration.md) — CQRS паттерны
- [Architecture Guide](../../docs/README.md) — руководство по архитектуре

---

## 🎯 Следующие шаги

1. **Добавить Prisma адаптер** — реальная БД
2. **Добавить Telegram бота** — платформа
3. **Добавить Event Store** — персистит событий
4. **Добавить recurring bookings** — повторяющиеся встречи
