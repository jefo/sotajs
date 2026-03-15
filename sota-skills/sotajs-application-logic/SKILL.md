---
name: sotajs-application-logic
description: Реализация бизнес-логики через Use Cases в SotaJS. Используйте при создании Команд (Commands) и Запросов (Queries), внедрении портов через хуки usePort/usePorts и работе с DTO.
---

# Оркестрация Приложения (SotaJS Application Logic)

## Принципы CQRS

1. **Commands**: Изменяют состояние. Возвращают успех/ошибку или ID созданного объекта. Не должны возвращать данные для отображения.
2. **Queries**: Получают данные для чтения. Оптимизированы для UI/представления. Не должны изменять состояние.
3. **DTO (Data Transfer Object)**: Use Case общается с внешним миром только через простые объекты (Data Structures), а не через Агрегаты напрямую.

## Внедрение зависимостей

Используйте хук `usePort` или мульти-порт импорт.

```ts
import { usePorts } from "@sotajs/core/multi-port";
// ...
const db = usePorts({ save: savePort, find: findPort });
const logger = usePort(loggerPort);
```

## Структура Use Case

1. **Валидация входа (Zod)**.
2. **Получение зависимостей (Ports)**.
3. **Выполнение логики (Домен + Порты)**.
4. **Маппинг результата в DTO**.

```ts
export const createBookingCommand = async (input: unknown) => {
  const cmd = CreateInputSchema.parse(input);
  const save = usePort(savePort);

  // Доменная логика
  const aggregate = MyAggregate.create(cmd);
  aggregate.actions.confirm();

  // Сохранение через порт
  await save(aggregate.props);

  // Обработка событий (Logging/PubSub)
  const events = aggregate.getPendingEvents();

  return { id: aggregate.id };
}
```

## Правила
- **Никаких импортов из Infrastructure**: Use Case зависит только от портов (Contracts), а не от адаптеров (DB, API).
- **Одна транзакция за раз**: Use Case должен сохранять один корень агрегата за один вызов.
