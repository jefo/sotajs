# 🎬 Shorts Demo Script: "Spec-driven разработка с ИИ"

## 📱 Формат: YouTube Shorts / TikTok / Reels (60 секунд)

---

## 🎥 СЦЕНАРИЙ ПО КАДРАМ

### Кадр 1 (0-5 сек): ХУК
**На экране:** Текстовый файл `00-dsl-prompt.md`

**Текст на экране:**
```
Spec-driven разработчик не пишет код сразу.
Сначала — спецификация.
```

**Промт который печатается:**
```markdown
# Бронирование переговорных

- Нельзя пересечение слотов у одной комнаты
- Отмена за 2 часа — ок, иначе штраф 10%
- Комнаты: Amber, Sapphire, Emerald
- Стоимость: 500 руб/час
```

**Озвучка:** "Spec-driven разработчик начинает с промта, а не с кода"

---

### Кадр 2 (5-12 сек): ГЕНЕРАЦИЯ СПЕКА
**На экране:** Терминал → появляются файлы

```bash
✨ Generating specification...
📄 Created: 01-PRD.md (Business Rules)
📄 Created: 02-TECH-SPEC.md (Architecture)
📁 Created: domain/time-slot.ts
📁 Created: domain/booking.aggregate.ts
📁 Created: application/commands/
📁 Created: application/queries/
📁 Created: infrastructure/ports/
📁 Created: infrastructure/adapters/
📁 Created: booking.test.ts
✅ Done in 1m 47s!
```

**Озвучка:** "ИИ генерирует спецификацию и код за 2 минуты"

---

### Кадр 3 (12-20 сек): ПОКАЗЫВАЕМ PRD
**На экране:** `01-PRD.md` — бизнес-правила

```markdown
## Бизнес-правила

BR-001: Нет пересечений
  Одна комната = одна встреча в слот

BR-002: Политика отмены  
  < 2 часов до встречи → штраф 10%

BR-003: Стоимость
  500 руб/час
```

**Озвучка:** "Сначала бизнес-правила в PRD. Это контракт между заказчиком и разработчиком"

---

### Кадр 4 (20-30 сек): TECH SPEC
**На экране:** `02-TECH-SPEC.md` → скролл до агрегата

```typescript
// Агрегат Booking
Invariants:
  - status ∈ valid statuses
  - totalCost > 0
  - slot.end > slot.start

Actions:
  - confirm() → emits BookingCreatedEvent
  - cancel(reason, penalty) → emits BookingCancelledEvent
```

**Озвучка:** "Потом техническая спецификация. Агрегаты, инварианты, события"

---

### Кадр 5 (30-40 сек): КОД
**На экране:** `booking.aggregate.ts`

```typescript
export const Booking = createAggregate({
  name: "Booking",
  schema: BookingSchema,
  invariants: [
    (props) => {
      if (props.status === "cancelled") {
        throw new Error("Already cancelled");
      }
    },
  ],
  actions: {
    confirm: (state) => { ... },
    cancel: (state, reason, penalty) => { ... },
  },
});
```

**Озвучка:** "Код следует из спецификации. Инварианты защищают бизнес-правила"

---

### Кадр 6 (40-50 сек): ТЕСТЫ
**На экране:** Терминал

```bash
$ bun test examples/booking/

✓ TimeSlot VO > should detect overlapping slots
✓ Booking Aggregate > should reject overlapping booking
✓ CancellationPolicy > should apply penalty for late cancellation
✓ Commands > should create booking successfully
✓ Commands > should reject overlapping booking

 19 pass
 0 fail
 43 expect() calls
Ran 19 tests across 1 file. [111ms]
```

**Озвучка:** "19 тестов за 111мс. Все бизнес-правила покрыты тестами"

---

### Кадр 7 (50-60 сек): CALL TO ACTION
**На экране:** Логотип SotaJS + GitHub

```
SotaJS
🔗 github.com/maxdev1/sotajs

Spec-driven + DDD + CQRS
Для тех кто пишет спецификации перед кодом
```

**Озвучка:** "SotaJS — фреймворк для spec-driven разработки. Ссылка в описании!"

---

## 📝 ОПИСАНИЕ ПОД ВИДЕО

```
Spec-driven разработка с ИИ за 60 секунд 🚀

Вместо того чтобы писать код наугад, spec-driven разработчик:
1. Пишет промт с бизнес-правилами
2. Получает PRD и техническую спецификацию  
3. ИИ генерирует код по спеку
4. Тесты покрывают все инварианты

Результат: production-ready архитектура за 2 минуты

✅ Rich Domain Model с агрегатами
✅ CQRS (Commands & Queries)
✅ Ports & Adapters
✅ Тесты которые ловят баги

SotaJS — TypeScript фреймворк для DDD и чистой архитектуры.

🔗 GitHub: github.com/maxdev1/sotajs
📚 Документация: docs/README.md

#typescript #ddd #cleancode #ai #coding #programming #softwarearchitecture #specdriven
```

---

## 🎵 МУЗЫКА

- Энергичный lo-fi beat или synthwave
- Без слов, чтобы не перебивать озвучку

---

## 💡 СОВЕТЫ ДЛЯ СЪЁМКИ

1. **Шрифт в редакторе:** Fira Code или JetBrains Mono (красивые лигатуры)
2. **Тема:** Dracula или One Dark Pro (контрастно для записи)
3. **Размер шрифта:** 16-18px (чтобы читалось на телефоне)
4. **Скорость печати:** Ускорить 2-3x в монтаже
5. **Звуки:** Добавить клики клавиатуры на фон (ASMR эффект)

---

## 🔥 АЛЬТЕРНАТИВНЫЕ ХУКИ (для A/B теста)

**Вариант A (агрессивный):**
> "Твой вайб-код — говно. Spec-driven > vibe coding"

**Вариант B (любопытство):**
> "Что будет если скрестить PRD, DDD и ИИ?"

**Вариант C (практический):**
> "Заказчик хочет фичу за 2 дня. Даю ему 2 минуты и спецификацию"

---

## 📊 МЕТРИКИ УСПЕХА

- ✅ Просмотры > 1000 за первые 24 часа
- ✅ Лайки > 5% от просмотров
- ✅ Комментарии с вопросами про spec-driven подход
- ✅ Переходы на GitHub (отследить по рефералам)
