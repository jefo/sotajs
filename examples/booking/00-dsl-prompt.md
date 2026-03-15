# DSL Prompt: Система бронирования переговорных комнат

## 🎬 Контекст для демо

Это **входной промт** который пишет spec-driven разработчик перед тем как нажать "Generate".

---

## Что ты пишешь (вводный промт):

```markdown
# Бронирование переговорных

Нужна система бронирования переговорных комнат для офиса.

Требования:
- Нельзя пересечение слотов у одной комнаты
- Отмена за 2 часа — ок, иначе штраф 10% от стоимости
- Повторяющиеся встречи каждый вторник в 10:00
- Комнаты: "Amber", "Sapphire", "Emerald"
- Стоимость: 500 руб/час
```

---

## 📋 Что генерирует ИИ (ожидаемый результат)

После получения промта, ИИ должен создать:

1. **Спецификацию** — `01-PRD.md`, `02-TECH-SPEC.md`
2. **Доменную модель** — агрегаты, VO, события
3. **Use Cases** — команды и запросы (CQRS)
4. **Порты и адаптеры** — контракты и реализации
5. **Тесты** — unit + integration

---

## 📁 Структура на выходе:

```
examples/booking/
├── 00-dsl-prompt.md          # Этот файл (вводные)
├── 01-PRD.md                 # Product Requirements Document
├── 02-TECH-SPEC.md           # Technical Specification
├── domain/
│   ├── time-slot.ts          # Value Object: временной слот
│   ├── booking.aggregate.ts  # Агрегат: бронирование
│   └── cancellation-policy.ts # Спецификация: правила отмены
├── application/
│   ├── commands/
│   │   ├── create-booking.command.ts    # Создать бронь
│   │   └── cancel-booking.command.ts    # Отменить бронь
│   └── queries/
│       └── get-room-schedule.query.ts   # Расписание комнаты
├── infrastructure/
│   ├── ports/
│   │   └── booking.ports.ts             # Контракты
│   └── adapters/
│       └── in-memory-booking.adapter.ts # Адаптер
├── booking.composition.ts    # Сборка приложения
├── booking.test.ts           # Тесты (зелёные!)
└── index.ts                  # Точка входа
```

---

## ✅ Критерии готовности (Definition of Done)

- [ ] Все тесты проходят (`bun test` → 19 pass, 0 fail)
- [ ] Демо работает (`bun run index.ts` → без ошибок)
- [ ] Инварианты ловят нарушения (overlap detection)
- [ ] Политика отмены считает штрафы
- [ ] CQRS разделён (commands vs queries)
- [ ] Порты явные (usePort в use cases)

---

## ⏱️ Время генерации: ~2 минуты

