# SotaJS: Руководство по архитектуре и разработке

## 1. Введение: Философия фреймворка

Sota (Сота) — это TypeScript-фреймворк для разработчиков, которые считают, что бизнес-логика является самым ценным активом проекта. Он предлагает простой, функциональный и мощный способ создания приложений с использованием принципов Гексагональной Архитектуры и подходов Domain-Driven Design (DDD).

Ключевые принципы Sota:
- **Фокус на бизнес-логике:** Фреймворк направляет разработку таким образом, чтобы в центре внимания всегда оставалась предметная область.
- **Явные зависимости:** Вместо "магии" и скрытых механизмов, Sota использует прозрачный хук `usePort()` для объявления зависимостей, что делает код легко отслеживаемым и тестируемым.
- **Функциональный подход:** Логика приложения описывается в виде простых асинхронных функций (Use Cases), что уменьшает количество шаблонного кода по сравнению с традиционными сервисными классами.
- **Тестируемость как основа:** Архитектура спроектирована для легкого тестирования. Комбинация чистой доменной логики и явных зависимостей позволяет тестировать бизнес-процессы в полной изоляции.
- **CQRS подход:** Use Cases четко разделяются на команды (изменяющие состояние) и запросы (получающие данные), что упрощает понимание и тестирование бизнес-логики.

## 2. Ключевая терминология

- **Доменный объект (Domain Object):** Общее название для Агрегатов, Сущностей и Объектов-значений, которые моделируют предметную область.
- **Агрегат (Aggregate):** Кластер доменных объектов (Сущностей и Объектов-значений), который рассматривается как единое целое для обеспечения транзакционной целостности. Агрегат — это основная единица сохранения и загрузки из репозитория.
- **Сущность (Entity):** Объект с уникальным идентификатором и жизненным циклом. Его идентичность сохраняется, даже если его атрибуты меняются.
- **Объект-значение (Value Object):** Неизменяемый объект, который определяется своими атрибутами, а не уникальным идентификатором (например, `Money` или `Address`).
- **Use Case:** Атомарная операция на уровне приложения, которая оркеструет взаимодействие между доменными моделями и внешними сервисами. 
- **Команда (Command):** Use Case, который изменяет состояние системы и возвращает результат операции.
- **Запрос (Query):** Use Case, который получает данные из системы без их изменения.
- **Порт (Port):** Абстрактный контракт (тип) для взаимодействия с внешней инфраструктурой (например, с базой данных).
- **Адаптер (Adapter):** Конкретная реализация порта. Адаптеры содержат технологическую логику (SQL, HTTP, файловая система).
- **DTO (Data Transfer Object):** Простой объект для передачи данных между слоями приложения.

## 3. Основные строительные блоки: Доменные объекты

Проектирование домена в SotaJS начинается с простейших концепций и движется к более сложным. Сначала определяются Объекты-значения и Сущности, и только потом они группируются в Агрегаты для защиты бизнес-правил.

### 3.1. Объекты-значения (Value Objects)

Объект-значение — неизменяемый объект без ID, определяемый своими атрибутами. Для создания VO используется функция `createValueObject`, которая принимает конфигурационный объект со схемой `zod` и опциональным списком `actions`.

> **Критерий выбора:** Задайте вопрос: "Описывает ли этот объект некую характеристику, не имеет собственной идентичности и полностью определяется своими атрибутами (как цвет или сумма)?"

Действия (`actions`) в Value Object **изменяют его внутреннее состояние** напрямую, аналогично поведению `Entity`. Это позволяет использовать более удобный синтаксис, без необходимости переприсваивания.

```typescript
import { z } from 'zod';
import { createValueObject } from '@sotajs/core';

// 1. Определяем схему и тип
const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string().length(3),
});
type MoneyProps = z.infer<typeof MoneySchema>;

// 2. Создаем класс Value Object с действиями
export const Money = createValueObject({
  schema: MoneySchema,
  actions: {
    add(state: MoneyProps, amountToAdd: number) {
      state.amount += amountToAdd;
    },
    changeCurrency(state: MoneyProps, newCurrency: string) {
      state.currency = newCurrency.toUpperCase();
    },
  },
});
export type Money = ReturnType<typeof Money.create>;

// --- Использование ---
// const price = Money.create({ amount: 100, currency: 'USD' });
// price.actions.add(50);
// price.props.amount === 150 (объект изменился)
```

### 3.2. Сущности (Entities)

Сущность — это объект с уникальным ID и жизненным циклом. Используйте `createEntity`, когда объект имеет собственную идентичность, но не является корнем агрегата.

> **Критерий выбора:** Задайте вопрос: "Является ли этот объект уникальной 'вещью', которую нужно отслеживать во времени, даже если ее свойства изменятся? Важна ли ее история?"

```typescript
import { z } from 'zod';
import { createEntity } from '@sotajs/core';

const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  bio: z.string().optional(),
});
type UserProfileProps = z.infer<typeof UserProfileSchema>;

export const UserProfile = createEntity({
  schema: UserProfileSchema,
  actions: {
    updateUsername: (state: UserProfileProps, newUsername: string) => {
      state.username = newUsername;
    },
    updateBio: (state: UserProfileProps, bio: string) => {
      state.bio = bio;
    },
  },
  computed: {
    displayName: (props: UserProfileProps) => props.username,
  },
});
export type UserProfile = ReturnType<typeof UserProfile.create>;
```

### 3.3. Агрегаты (Aggregates)

Агрегат — это транзакционная граница, которая объединяет одну или несколько сущностей и VO для обеспечения их согласованности. Границы агрегата не всегда очевидны на старте. Они выявляются, когда появляется бизнес-требование.

> **Критерий выбора:** Необходимость в агрегате возникает, когда бизнес-правило требует, чтобы изменения в нескольких сущностях происходили атомарно, в рамках одной транзакции. Если для сохранения консистентности вам нужно обновить Сущность А и Сущность Б вместе, они являются кандидатами на объединение в один агрегат.

**Пример: Агрегат `Order`**

В этом примере мы создадим агрегат `Order`, который включает в себя вложенную сущность `CustomerInfo`. Это покажет, как работать с богатой доменной моделью внутри агрегата, а также как использовать вычисляемые свойства.

```typescript
import { z } from 'zod';
import { createAggregate, createEntity } from '@sotajs/core';

// Вложенная сущность для информации о клиенте
const CustomerInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});
type CustomerInfoState = z.infer<typeof CustomerInfoSchema>;

// Схема для позиции заказа
const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().positive(),
});

// Основная схема агрегата Order
const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered']),
  customerInfo: CustomerInfoSchema,
  items: z.array(OrderItemSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});
type OrderState = z.infer<typeof OrderSchema>;

// Вложенная сущность
const CustomerInfo = createEntity({
  schema: CustomerInfoSchema,
  actions: {
    updateName: (state: CustomerInfoState, name: string) => {
      state.name = name;
    },
  },
});

export const Order = createAggregate({
  name: 'Order',
  schema: OrderSchema,
  entities: {
    customerInfo: CustomerInfo, // Map the 'customerInfo' property to the CustomerInfo entity class
  },
  invariants: [
    (props) => {
      if (props.items.length === 0) {
        throw new Error('Order must have at least one item');
      }
    },
  ],
  actions: {
    addItem: (state: OrderState, item: z.infer<typeof OrderItemSchema>) => {
      state.items.push(item);
      state.updatedAt = new Date();
    },
    
    confirmOrder: (state: OrderState) => {
      if (state.status !== 'pending') {
        throw new Error('Only pending orders can be confirmed');
      }
      state.status = 'confirmed';
      state.updatedAt = new Date();
    },
    
    calculateTotal: (state: OrderState): number => {
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    // Action to demonstrate entity interaction
    updateCustomerName: (state: OrderState, name: string) => {
      // `state.customerInfo` is an instance of CustomerInfo, so we can call its actions
      state.customerInfo.actions.updateName(name);
    },
  },
  computed: {
    isConfirmed: (props: OrderState) => props.status === 'confirmed',
  }
});
export type Order = ReturnType<typeof Order.create>;

// --- Использование ---
// const order = Order.create({
//   id: '123e4567-e89b-12d3-a456-426614174000',
//   status: 'pending',
//   customerInfo: { name: 'John Doe', email: 'john@example.com' },
//   items: [],
//   createdAt: new Date(),
//   updatedAt: new Date()
// });
// 
// order.actions.addItem({ productId: '...', quantity: 2, price: 25.99 });
// const total = order.actions.calculateTotal();
// order.actions.updateCustomerName('Jane Doe');
```

### 3.4. Доменные события (Domain Events)

Агрегаты могут генерировать доменные события при выполнении действий. Это позволяет уведомлять другие части системы о важных бизнес-событиях.

Для создания события, действие должно вернуть объект с событием:

```typescript
// Определяем событие
class OrderPaidEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly timestamp = new Date(),
  ) {}
}

// Добавляем действие, которое генерирует событие
const Order = createAggregate({
  name: 'Order',
  schema: OrderSchema,
  actions: {
    payOrder: (state: OrderState, paymentMethod: string) => {
      if (state.status !== 'pending') {
        throw new Error('Only pending orders can be paid');
      }
      state.status = 'paid';
      state.updatedAt = new Date();
      
      // Возвращаем событие
      return {
        event: new OrderPaidEvent(state.id),
      };
    },
  },
});

// --- Использование ---
const order = Order.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'pending',
  customerInfo: { name: 'John Doe', email: 'john@example.com' },
  items: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

// Выполняем действие, которое генерирует событие
order.actions.payOrder('credit-card');

// Получаем ожидающие события
const events = order.getPendingEvents();
console.log(events); // [OrderPaidEvent(...)]

// После обработки событий можно очистить очередь
order.clearEvents();
```

## 4. Оркестрация: Use Cases и CQRS подход

В SotaJS используется подход CQRS (Command Query Responsibility Segregation), который четко разделяет операции на команды (изменяющие состояние) и запросы (получающие данные).

### 4.1. Команды (Commands)

Команды — это Use Cases, которые изменяют состояние системы. Они принимают входные данные, выполняют бизнес-логику и возвращают результат операции.

**Пример: `createOrderCommand`**
```typescript
import { usePort } from '@sotajs/core';
import { findUserByIdPort, saveOrderPort } from '@domain/ports'; // Предполагается, что порты определены в другом месте
import { Order } from '@domain/order.aggregate';

// DTO для входных данных
export type CreateOrderInput = {
  userId: string;
  items: { productId: string; quantity: number }[];
};

export const createOrderCommand = async (input: CreateOrderInput) => {
  // 1. Получаем зависимости через usePort
  const findUserById = usePort(findUserByIdPort);
  const saveOrder = usePort(saveOrderPort);

  // 2. Выполняем логику
  const user = await findUserById(input.userId);
  if (!user) {
    throw new Error('User not found');
  }

  const order = Order.create({
    userId: user.id,
    items: input.items,
    // ... другие поля
  });

  await saveOrder(order);

  // 3. Возвращаем результат
  return { orderId: order.id };
};
```

### 4.2. Запросы (Queries)

Запросы — это Use Cases, которые получают данные из системы без их изменения. Они возвращают данные в формате DTO.

**Пример: `getUserOrdersQuery`**
```typescript
import { z } from 'zod';
import { usePort } from '@sotajs/core';
import { findOrdersByUserIdPort } from '@domain/ports';

const GetUserOrdersInputSchema = z.object({
  userId: z.string().uuid(),
});

type GetUserOrdersInput = z.infer<typeof GetUserOrdersInputSchema>;

// DTO для результата запроса
type OrderDto = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
};

type GetUserOrdersResult = {
  orders: OrderDto[];
  totalCount: number;
};

export const getUserOrdersQuery = async (input: GetUserOrdersInput): Promise<GetUserOrdersResult> => {
  const query = GetUserOrdersInputSchema.parse(input);

  // Получение зависимости
  const findOrdersByUserId = usePort(findOrdersByUserIdPort);

  const orders = await findOrdersByUserId({ userId: query.userId });
  
  return {
    orders: orders.map(order => ({
      id: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt.toISOString()
    })),
    totalCount: orders.length
  };
};
```

Кроме того, вы можете использовать `usePorts` для получения сразу нескольких зависимостей:

**Пример: использование `usePorts`**
```typescript
import { usePorts } from '@sotajs/core';
import { findUserByIdPort, saveOrderPort, findOrdersByUserIdPort } from '@domain/ports';

export const createOrderWithUserValidationCommand = async (input: CreateOrderInput) => {
  // Получаем несколько зависимостей за один вызов
  const [findUserById, saveOrder, findOrdersByUserId] = usePorts(
    findUserByIdPort, 
    saveOrderPort, 
    findOrdersByUserIdPort
  );

  // Выполняем логику
  const user = await findUserById(input.userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Проверяем историю заказов пользователя
  const userOrders = await findOrdersByUserId({ userId: input.userId });
  if (userOrders.length > 100) {
    throw new Error('User has too many orders');
  }

  const order = Order.create({
    userId: user.id,
    items: input.items,
    // ... другие поля
  });

  await saveOrder(order);

  return { orderId: order.id };
};
```

### 4.3. Лучшие практики

При работе с внедрением зависимостей в SotaJS рекомендуется следовать следующим принципам:

1. **Предпочтение `usePorts` перед несколькими `usePort`**:
   При необходимости получения нескольких зависимностей в одном Use Case, используйте `usePorts` вместо нескольких вызовов `usePort`. Это более эффективно и делает код чище:

   ```typescript
   // Правильно: использование usePorts для нескольких зависимостей
   const [findUserById, saveOrder, findOrdersByUserId] = usePorts(
     findUserByIdPort, 
     saveOrderPort, 
     findOrdersByUserIdPort
   );

   // Избегайте: несколько вызовов usePort
   const findUserById = usePort(findUserByIdPort);
   const saveOrder = usePort(saveOrderPort);
   const findOrdersByUserId = usePort(findOrdersByUserIdPort);
   ```

2. **Явные зависимости**:
   Всегда объявляйте зависимости через `usePort` или `usePorts`, чтобы сделать зависимости Use Case прозрачными и облегчить тестирование.

3. **Группировка связанных портов в фичи**:
   Объединяйте связанные порты в фичи с помощью `defineFeature`, чтобы улучшить структуру и поддерживаемость кода.

4. **Валидация на уровне портов**:
   Используйте Zod схемы для валидации данных на границах системы (в адаптерах), чтобы обеспечить целостность данных.

## 5. Внедрение зависимостей: Фичи и Ядро

SotaJS использует надежный механизм внедрения зависимостей, основанный на "фичах" и "ядре". Это позволяет гарантировать, что все зависимости для каждого модуля предоставлены в точке композиции.

### Шаг 1: Определение Портов (`createPort`)

Порт — это контракт зависимости. При его создании больше не нужно указывать `Promise` в возвращаемом типе — фреймворк делает это автоматически.

```typescript
import { createPort } from '@sotajs/core';
import type { User, Order } from './domain';

// Сигнатура описывает обычную функцию
const findUserByIdPort = createPort<(id: string) => User | null>();
const saveOrderPort = createPort<(order: Order) => void>();
```

> **Лучшая практика: Совместное размещение портов**
> 
> Чтобы поддерживать высокую связность (cohesion) кода, рекомендуется определять порты, отвечающие за работу с определенной сущностью или агрегатом, в том же файле, где определен сам доменный объект.
> 
> ```typescript
> // domain/user.entity.ts
> 
> // Определение сущности
> export const User = createEntity(...);
> 
> // Определение портов, связанных с User
> export const findUserByIdPort = createPort<(id: string) => User | null>();
> export const saveUserPort = createPort<(user: User) => void>();
> ```

### Шаг 2: Группировка Портов в Фичу (`defineFeature`)

Фича объединяет связанные порты в один логический модуль.

```typescript
import { defineFeature } from '@sotajs/core';

const OrderFeature = defineFeature({
  findUserById: findUserByIdPort,
  saveOrder: saveOrderPort,
});
```

### Шаг 3: Реализация Фичи с помощью Адаптера

Адаптер — это класс, который реализует все порты, определенные в фиче. Для проверки полноты реализации используется хелпер `FeaturePorts`.

```typescript
import { FeaturePorts } from '@sotajs/core';
import type { Order, User } from './domain';

// Класс-адаптер реализует контракт фичи
class PrismaOrderAdapter implements FeaturePorts<typeof OrderFeature> {
  async findUserById(id: string): Promise<User | null> {
    // ... логика для поиска пользователя в БД через Prisma
    return null;
  }

  async saveOrder(order: Order): Promise<void> {
    // ... логика для сохранения заказа в БД
    console.log('Order saved!');
  }
}
```
TypeScript выдаст ошибку, если класс `PrismaOrderAdapter` не реализует хотя бы один из портов, объявленных в `OrderFeature`.

### Шаг 4: Определение и Композиция Ядра

Последний шаг — это определение ядра приложения и его композиция. Этот процесс четко разделен на два этапа, которые происходят в разных местах.

#### 4.1. Определение Ядра (Слой Приложения)

Внутри вашего слоя приложения (например, в `application/index.ts`) вы определяете ядро, объединяя все созданные фичи. Это ядро представляет собой публичный API вашего бизнес-слоя.

```typescript
// src/application/index.ts
import { defineCore } from '@sotajs/core';
import { OrderFeature } from './features/orders';
import { AuthFeature } from './features/auth';

// 1. Определяем ядро, перечисляя все фичи
const core = defineCore({
  orders: OrderFeature,
  auth: AuthFeature,
});

// 2. Экспортируем ядро. Это позволит другим слоям (например, слою представления)
// вызывать use cases, но не даст им доступа к внутренним механизмам DI.
export default core;
```

#### 4.2. Композиция Ядра (Точка Композиции)

В самой внешней точке вашего приложения (например, `src/main.ts` или `src/index.ts`) вы импортируете ядро и связываете его фичи с конкретными реализациями (адаптерами). Это **единственное** место, где происходит DI.

```typescript
// src/main.ts (Composition Root)
import core from './application'; // Импортируем ядро
import { PrismaOrderAdapter } from './infrastructure/adapters/prisma-order-adapter';
import { JwtAuthAdapter } from './infrastructure/adapters/jwt-auth-adapter';

// 3. В точке композиции связываем фичи с их адаптерами
core.bindFeatures(({ orders, auth }) => {
  orders.bind(PrismaOrderAdapter);
  auth.bind(JwtAuthAdapter);
});

// Готово! Теперь при вызове usePort() внутри любого use case
// будет использоваться соответствующая реализация из адаптера.
// Например, use case из OrderFeature получит доступ к PrismaOrderAdapter.
```

Этот подход гарантирует, что вы не забудете предоставить реализацию для какого-либо порта, делая систему надежной и предсказуемой.

## 6. Интеграция с внешними системами

При интеграции SotaJS приложения с внешними системами (веб-API, телеграм-боты и т.д.), рекомендуется следующий подход:

1. **Use Case возвращает DTO:** Каждый Use Case возвращает данные в формате DTO, который не зависит от конкретной платформы.

2. **Преобразование DTO в представление:** Внешний слой (контроллеры, хендлеры) преобразует DTO в нужный формат представления (JSON для веб-API, разметка для телеграм-бота и т.д.).

**Пример интеграции с веб-API:**
```typescript
// app/controllers/order.controller.ts
import { createOrderCommand, getUserOrdersQuery } from '@app/use-cases';

export class OrderController {
  async createOrder(req: Request, res: Response) {
    try {
      // Вызов команды
      const result = await createOrderCommand(req.body);
      
      // Преобразование DTO в JSON ответ
      if (result.success) {
        res.status(201).json({
          orderId: result.orderId,
          total: result.total
        });
      } else {
        res.status(400).json({
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async getUserOrders(req: Request, res: Response) {
    try {
      // Вызов запроса
      const result = await getUserOrdersQuery({ userId: req.params.userId });
      
      // Преобразование DTO в JSON ответ
      res.json({
        orders: result.orders,
        totalCount: result.totalCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

**Пример интеграции с телеграм-ботом:**
```typescript
// app/bot/handlers/order.handlers.ts
import { createOrderCommand, getUserOrdersQuery } from '@app/use-cases';

export class OrderBotHandlers {
  async handleCreateOrder(ctx: any) {
    try {
      const result = await createOrderCommand({
        userId: ctx.from.id.toString(),
        items: parseItemsFromMessage(ctx.message.text)
      });
      
      if (result.success) {
        await ctx.reply(`✅ Заказ создан! ID: ${result.orderId}\nСумма: ${result.total} руб.`);
      } else {
        await ctx.reply(`❌ Ошибка: ${result.error}`);
      }
    } catch (error) {
      await ctx.reply('❌ Произошла ошибка при создании заказа');
    }
  }
}
```

## 7. Гибкий процесс разработки: от прототипа до Production

SotaJS предлагает гибкий двухфазный подход, позволяющий быстро создавать и проверять идеи (прототипирование), а затем развивать их в надежную и масштабируемую систему. Это позволяет избежать избыточной сложности на ранних этапах проекта.

### Фаза 1: Быстрое прототипирование

На этом этапе основное внимание уделяется быстрой реализации функциональности и пользовательских сценариев. Архитектура сознательно упрощается, чтобы ускорить итерации.

*   **Слой приложения (Application Layer):** Как и в полной архитектуре, состоит из **Use Cases** (Команд и Запросов). Они являются точками входа для операций, вызываемых внешним слоем (контроллерами), и остаются главным "движущим портом" приложения.

*   **Слой моделей (Models Layer):** Вместо полноценного доменного слоя с богатыми Агрегатами используется слой "анемичных" моделей.
    *   Это простые структуры данных, описанные с помощью **Zod-схем**.
    *   Их задача — описывать форму данных, они не содержат бизнес-логики или методов.

*   **Хранилище (Storage):** Для работы с моделями используется **generic in-memory репозиторий**. Он предоставляет базовые CRUD-операции и не требует написания отдельной реализации для каждой модели, что значительно ускоряет разработку.

**Процесс на Фазе 1:**
1.  **Опишите Модели:** Создайте Zod-схемы для ваших данных (например, `UserSchema`, `OrderSchema`).
2.  **Спроектируйте Use Cases:** Определите Команды и Запросы для основных операций.
3.  **Определите Порты:** Use Cases по-прежнему зависят от абстрактных портов для доступа к данным.
4.  **Реализуйте Адаптеры:** В качестве адаптеров для портов выступают простые функции, работающие с generic in-memory репозиторием.
5.  **Интегрируйте:** Подключите Use Cases к контроллерам (веб, бот и т.д.).

### Фаза 2: Эволюция в Production-систему

Когда прототип утвержден и требуется долгосрочное развитие, архитектура эволюционирует в классический подход SotaJS.

**Процесс эволюции:**

1.  **От Моделей к Сущностям и Объектам-значениям:** Когда появляется бизнес-логика, связанная с данными, простые Zod-схемы из "Слоя моделей" превращаются в **Сущности (Entities)** и **Объекты-значения (Value Objects)**. Эти доменные объекты инкапсулируют в себе методы для изменения своего состояния и проверки инвариантов (бизнес-правил).

2.  **От Сущностей к Агрегатам:** По мере усложнения системы вы можете обнаружить, что для сохранения целостности данных несколько сущностей должны изменяться в рамках одной транзакции. Это сигнал к тому, что их следует объединить в **Агрегат**.
    > **Важный принцип:** Одна команда (Use Case) должна выполнять только одну транзакцию, то есть сохранять только один агрегат. Если ваша команда пытается сохранить несколько сущностей по отдельности, это явный признак того, что границы агрегата определены неверно, и эти сущности должны быть частью одного агрегата.

3.  **От In-Memory к реальным Адаптерам:** In-memory репозиторий заменяется на производственные адаптеры, которые работают с реальными базами данных (например, PostgreSQL). При этом контракты **Портов** и код **Use Cases** остаются практически без изменений.

4.  **Тестирование и развертывание:** Приложение комплексно тестируется и развертывается с использованием производственной инфраструктуры.

Этот двухфазный подход позволяет вам двигаться быстро, когда это необходимо, и строить надежную архитектуру, когда проект готов к росту.

## 8. Архитектурные принципы и лучшие практики

### 8.1. Моделирование отношений между Агрегатами

- Используйте ссылки по ID вместо прямых ссылок на агрегаты
- Избегайте транзакций, затрагивающих несколько агрегатов
- Используйте eventual consistency для сложных бизнес-процессов

### 8.2. Проектирование Use Cases (Принцип CQRS)

- Четко разделяйте команды и запросы
- Команды должны возвращать минимальную информацию о результате
- Запросы должны быть оптимизированы для чтения

### 8.3. Как избежать распространенных ошибок

- Не смешивайте логику представления с бизнес-логикой
- Используйте DTO для передачи данных между слоями
- Тестируйте Use Cases в изоляции от инфраструктуры

## 9. Продвинутые техники: Fixture-Driven Development (FxDD)

SotaJS открывает уникальную возможность для разработки через фикстуры. Благодаря тому, что ваша инфраструктура (адаптеры) полностью отделена от логики через порты, вы можете использовать `InMemory` адаптеры как "живые симуляторы" реальности.

Это позволяет:
- **Разрабатывать ботов без Telegram API**: Тестируйте сложные воронки и инварианты в офлайне.
- **Мгновенная обратная связь**: Тесты выполняются за миллисекунды, заменяя ручное тестирование.
- **Детерминированные сценарии**: Воспроизводите сложные бизнес-ситуации одной строчкой кода.

Подробнее о подходе читайте в руководстве: **[Fixture-Driven Development в SotaJS](./fixture-driven-development.md)**.