# SotaJS: Руководство по архитектуре и разработке

## 1. Введение: Философия фреймворка

Sota (Сота) — это TypeScript-фреймворк для разработчиков, которые считают, что бизнес-логика является самым ценным активом проекта. Он предлагает простой, функциональный и мощный способ создания приложений с использованием принципов Гексагональной Архитектуры и подходов Domain-Driven Design (DDD).

Ключевые принципы Sota:
- **Фокус на бизнес-логике:** Фреймворк направляет разработку таким образом, чтобы в центре внимания всегда оставалась предметная область.
- **Явные зависимости:** Вместо "магии" и скрытых механизмов, Sota использует прозрачный хук `usePort()` для объявления зависимостей, что делает код легко отслеживаемым и тестируемым.
- **Функциональный подход:** Логика приложения описывается в виде простых асинхронных функций (Use Cases), что уменьшает количество шаблонного кода по сравнению с традиционными сервисными классами.
- **Тестируемость как основа:** Архитектура спроектирована для легкого тестирования. Комбинация чистой доменной логики и явных зависимостей позволяет тестировать бизнес-процессы в полной изоляции.
- **Разделение логики и представления:** Use Cases не возвращают данные напрямую. Вместо этого они сообщают о результатах своей работы через **выходные порты (Output Ports)**, делая бизнес-логику полностью независимой от способа представления данных (API, консоль, UI).

## 2. Ключевая терминология

- **Доменный объект (Domain Object):** Общее название для Агрегатов, Сущностей и Объектов-значений, которые моделируют предметную область.
- **Агрегат (Aggregate):** Кластер доменных объектов (Сущностей и Объектов-значений), который рассматривается как единое целое для обеспечения транзакционной целостности. Агрегат — это основная единица сохранения и загрузки из репозитория.
- **Сущность (Entity):** Объект с уникальным идентификатором и жизненным циклом. Его идентичность сохраняется, даже если его атрибуты меняются.
- **Объект-значение (Value Object):** Неизменяемый объект, который определяется своими атрибутами, а не уникальным идентификатором (например, `Money` или `Address`).
- **Use Case:** Атомарная операция на уровне приложения, которая оркеструет взаимодействие между доменными моделями и внешними сервисами. **Use Case ничего не возвращает**, а о результатах сообщает через выходные порты.
- **Порт (Port):** Абстрактный контракт (тип) для взаимодействия с внешней инфраструктурой (например, с базой данных).
- **Выходной порт (Output Port):** Особый вид порта, который Use Case вызывает для уведомления внешнего мира о результате операции (например, `userCreatedOutPort`). Всегда именуется с суффиксом `OutPort`.
- **Адаптер (Adapter):** Конкретная реализация порта. Адаптеры для портов данных содержат технологическую логику (SQL, HTTP), а для выходных портов — логику представления (отправка JSON, рендеринг HTML).
- **DTO (Data Transfer Object):** Простой объект для передачи данных между слоями.

## 3. Основные строительные блоки: Доменные объекты

Проектирование домена в SotaJS начинается с простейших концепций и движется к более сложным. Сначала определяются Объекты-значения и Сущности, и только потом они группируются в Агрегаты для защиты бизнес-правил.

### 3.1. Объекты-значения (Value Objects)

Объект-значение — неизменяемый объект без ID, определяемый своими атрибутами. Используйте `createValueObject` для таких понятий, как деньги, адрес или диапазон дат.

> **Критерий выбора:** Задайте вопрос: "Описывает ли этот объект некую характеристику, не имеет собственной идентичности и полностью определяется своими атрибутами (как цвет или сумма)?"

```typescript
import { z } from 'zod';
import { createValueObject } from '@maxdev1/sotajs';

const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
});

export const Address = createValueObject(AddressSchema, 'Address');
export type Address = ReturnType<typeof Address.create>;
```

### 3.2. Сущности (Entities)

Сущность — это объект с уникальным ID и жизненным циклом. Используйте `createEntity`, когда объект имеет собственную идентичность, но не является корнем агрегата.

> **Критерий выбора:** Задайте вопрос: "Является ли этот объект уникальной 'вещью', которую нужно отслеживать во времени, даже если ее свойства изменятся? Важна ли ее история?"

```typescript
import { z } from 'zod';
import { createEntity } from '@maxdev1/sotajs';

const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  bio: z.string().optional(),
});

export const UserProfile = createEntity(UserProfileSchema, 'UserProfile');
export type UserProfile = ReturnType<typeof UserProfile.create>;
```

### 3.3. Агрегаты (Aggregates)

Агрегат — это транзакционная граница, которая объединяет одну или несколько сущностей и VO для обеспечения их согласованности. Границы агрегата не всегда очевидны на старте. Они выявляются, когда появляется бизнес-требование.

> **Критерий выбора:** Необходимость в агрегате возникает, когда бизнес-правило требует, чтобы изменения в нескольких сущностях происходили атомарно, в рамках одной транзакции. Если для сохранения консистентности вам нужно обновить Сущность А и Сущность Б вместе, они являются кандидатами на объединение в один агрегат.

**Пример: Агрегат `Order`**
```typescript
import { z } from 'zod';
import { createAggregate } from '@maxdev1/sotajs';

const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'shipped']),
  items: z.array(z.object({ productId: z.string(), price: z.number() })),
  customerId: z.string().uuid(),
});

type OrderState = z.infer<typeof OrderSchema>;

export const Order = createAggregate({
  name: 'Order',
  schema: OrderSchema,
  invariants: [
    (state) => {
      if (state.status === 'shipped' && state.items.length === 0) {
        throw new Error('Cannot ship an empty order.');
      }
    },
  ],
  actions: {
    pay: (state: OrderState) => {
      if (state.status !== 'pending') {
        throw new Error('Only pending orders can be paid.');
      }
      // Просто мутируем состояние. Immer сделает все остальное.
      state.status = 'paid';
    },
  },
});

export type Order = ReturnType<typeof Order.create>;
```

## 4. Оркестрация: Use Cases и Порты

Use Case — это `async` функция, которая является точкой входа для выполнения бизнес-операции. Она валидирует входные данные, использует хук `usePort` для получения зависимостей и **ничего не возвращает**.

**Пример: `createOrderUseCase`**
```typescript
import { z } from 'zod';
import { usePort, createPort } from '@maxdev1/sotajs/lib/di.v2';
import { findUserByIdPort, saveOrderPort } from '@domain/ports';
import { Order } from '@domain/order.aggregate';

// DTO для выходных портов
type OrderCreatedOutput = { orderId: string; total: number; };
type OrderFailedOutput = { userId: string; reason: string; };

// Выходные порты для информирования о результате
const orderCreatedOutPort = createPort<(dto: OrderCreatedOutput) => Promise<void>>();
const orderCreationFailedOutPort = createPort<(dto: OrderFailedOutput) => Promise<void>>();

const CreateOrderInputSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().positive() })),
});

type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const createOrderUseCase = async (input: CreateOrderInput): Promise<void> => {
  const command = CreateOrderInputSchema.parse(input);

  // Получение зависимостей, включая выходные порты
  const findUserById = usePort(findUserByIdPort);
  const saveOrder = usePort(saveOrderPort);
  const orderCreated = usePort(orderCreatedOutPort);
  const orderFailed = usePort(orderCreationFailedOutPort);

  const user = await findUserById({ id: command.userId });
  if (!user) {
    await orderFailed({ userId: command.userId, reason: 'User not found' });
    return;
  }

  try {
    const order = Order.create(command);
    await saveOrder(order);
    
    await orderCreated({ orderId: order.id, total: order.state.items.reduce((sum, i) => sum + i.price, 0) });
  } catch (error: any) {
    await orderFailed({ userId: command.userId, reason: error.message });
  }
};
```

## 5. Внедрение зависимостей: связующее звено

Механизм DI в Sota построен на трех функциях:
- `createPort`: Создает типизированный контракт для зависимости.
- `setPortAdapter`: Связывает порт с его конкретной реализацией (адаптером).
- `usePort`: Получает реализацию порта внутри Use Case.

**Пример полного цикла DI**
```typescript
import { createPort, setPortAdapter, usePort, resetDI } from '@maxdev1/sotajs/lib/di.v2';

// 1. Определение порта данных и DTO
interface FindUserByIdDto { id: string; }
const findUserByIdPort = createPort<(dto: FindUserByIdDto) => Promise<{ id: string; name: string } | null>>();

// 2. Определение выходного порта и его DTO
type UserFoundOutput = { id: string; name: string; };
const userFoundOutPort = createPort<(dto: UserFoundOutput) => Promise<void>>();

// 3. Адаптер для базы данных (из @infra)
const userDbAdapter = async (dto: FindUserByIdDto) => {
  // ...логика для получения пользователя из БД
  return { id: dto.id, name: 'Real User' };
};

// 4. Презентационный адаптер для вывода в консоль (из @infra)
const consolePresenterAdapter = async (dto: UserFoundOutput) => {
  console.log(`User Found: ${dto.name} (ID: ${dto.id})`);
};

// 5. Мок-адаптеры для тестов
const mockUserAdapter = async (dto: FindUserByIdDto) => ({ id: dto.id, name: 'Mock User' });
const mockPresenter = async (dto: UserFoundOutput) => { /* do nothing in test */ };

// 6. Use Case (из @app)
const getUserUseCase = async (id: string): Promise<void> => {
  const findUserById = usePort(findUserByIdPort);
  const userFound = usePort(userFoundOutPort);
  const user = await findUserById({ id });
  if (user) {
    await userFound(user);
  }
};

// 7. Связывание в точке композиции (composition root)
setPortAdapter(findUserByIdPort, userDbAdapter);
setPortAdapter(userFoundOutPort, consolePresenterAdapter);

// 8. Связывание в тесте
resetDI(); // Очистка контейнера перед тестом
setPortAdapter(findUserByIdPort, mockUserAdapter);
setPortAdapter(userFoundOutPort, mockPresenter);
```

## 6. Процесс разработки в Sota

Sota предлагает строгий "inside-out" подход к разработке.

- **Шаг 1: Определение контракта.** Создайте файл Use Case в `@app`. Определите его входные данные с помощью `zod` и объявите необходимые порты: как для получения данных, так и **выходные порты (Output Ports)** для всех возможных исходов операции.
- **Шаг 2: Реализация доменной логики.** Смоделируйте домен (`@domain`), создавая Сущности и Объекты-значения. Затем, при необходимости, сгруппируйте их в Агрегаты для обеспечения транзакционной целостности.
- **Шаг 3: Изолированное тестирование.** Напишите тесты для Use Case. Подмените реализации всех портов моками с помощью `setPortAdapter`. Тест должен проверять, что в зависимости от входных данных вызывается правильный выходной порт с корректным DTO.
- **Шаг 4: Реализация адаптеров.** В `@infra` напишите код, который будет взаимодействовать с базой данных (адаптеры данных) и который будет обрабатывать результаты для пользователя (презентационные адаптеры).
- **Шаг 5: Связывание в точке композиции.** В главном файле вашего приложения (например, `index.ts`) свяжите все порты с их реальными адаптерами.

## 7. Архитектурные принципы и лучшие практики

### 7.1. Моделирование отношений между Агрегатами
- **Правило №1: Ссылайтесь на другие агрегаты только по ID.** Агрегат `Order` должен хранить `customerId`, а не весь объект `Customer`. Это предотвращает создание больших, связанных графов объектов и обеспечивает слабую связанность.
- **Правило №2: Одна транзакция — один изменяемый агрегат.** Каждый Use Case должен загружать, изменять и сохранять только один экземпляр агрегата. Если бизнес-процесс требует изменения нескольких агрегатов, используйте доменные события или многошаговые Use Cases.

### 7.2. Проектирование Портов (Принцип CQRS)
- **Порты для записи (команды):** Должны всегда принимать на вход полный экземпляр Агрегата или Сущности. Это гарантирует, что все бизнес-правила (инварианты) будут проверены перед сохранением состояния.
- **Порты для чтения (запросы):** Могут возвращать любые удобные структуры данных (DTO), оптимизированные для конкретного отображения. Это обеспечивает гибкость и производительность.

### 7.3. Разделение логики и представления через Output Ports
- **Use Cases ничего не возвращают.** Вместо `return data` они вызывают семантически именованный выходной порт, например, `userFoundOutPort(userDto)`.
- **Один порт для каждого бизнес-исхода.** Вместо обработки ошибок по цепочке, используйте отдельные порты для успеха и для каждого типа значимой ошибки (`userNotFoundOutPort`, `invalidInputOutPort` и т.д.).
- **Презентационные адаптеры.** Адаптеры, реализующие выходные порты, отвечают за преобразование чистого DTO в конкретный формат (JSON, HTML, gRPC ответ). Это позволяет менять способ представления данных, не затрагивая бизнес-логику.

### 7.4. Как избежать распространенных ошибок
- **Избегайте "Божественных Агрегатов" (God Aggregates).** Не создавайте агрегаты, которые отвечают за слишком много бизнес-концепций. Агрегаты должны быть маленькими и сфокусированными на одной четкой задаче. Если агрегат становится слишком большим, это верный признак того, что его пора разделить.
