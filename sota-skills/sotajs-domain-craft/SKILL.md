---
name: sotajs-domain-craft
description: Создание богатых доменных моделей (Rich Domain Models) в SotaJS. Используйте при проектировании Агрегатов, Сущностей и Объектов-значений с инвариантами и доменными событиями.
---

# Ремесло Домена (SotaJS Domain Craft)

## Принципы

1. **Rich Models over Anemic Services**: Вся логика, касающаяся изменения состояния и бизнес-правил, должна жить внутри Агрегата или VO.
2. **Transactional Integrity**: Один Агрегат = одна граница транзакции. 
3. **Always Valid**: Доменные объекты не могут быть созданы в невалидном состоянии (Zod + invariants).

## Основные инструменты

### 1. Value Object (`createValueObject`)
Для объектов без ID, определяемых своими свойствами (например, `TimeSlot`, `Money`, `Address`).

```ts
export const MyVO = createValueObject({
  schema: z.object({ ... }),
  actions: {
    // Изменяют draft (Immer)
    doSomething: (state, arg) => { state.val = arg; }
  },
  computed: {
    isSomething: (props) => props.val > 10
  }
});
```

### 2. Aggregate (`createAggregate`)
Корень транзакционной целостности.

```ts
export const MyAggregate = createAggregate({
  name: "MyAggregate",
  schema: z.object({ id: z.string().uuid(), ... }),
  invariants: [
    (props) => { if (props.val < 0) throw new Error("Must be positive"); }
  ],
  actions: {
    confirm: (state) => {
      state.status = "confirmed";
      return { event: new DomainEvent(state.id) };
    }
  },
  computed: {
    isDone: (props) => props.status === "done"
  }
});
```

## Доменные события
События должны содержать данные о произошедшем факте в прошедшем времени (`Created`, `Updated`, `Cancelled`).

```ts
export class BookingCreatedEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
```
