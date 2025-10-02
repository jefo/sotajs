# CQRS Integration Guide for SotaJS

## Введение в CQRS подход

CQRS (Command Query Responsibility Segregation) — это архитектурный паттерн, который разделяет операции на две категории:
- **Команды (Commands)** — изменяют состояние системы
- **Запросы (Queries)** — получают данные из системы

В SotaJS этот подход реализован через четкое разделение Use Cases на команды и запросы, что упрощает понимание, тестирование и поддержку бизнес-логики.

## Основные принципы

### 1. Команды (Commands)
- Изменяют состояние системы
- Возвращают результат операции в формате DTO
- Могут вызывать побочные эффекты
- Примеры: создание заказа, обновление пользователя, отправка уведомления

### 2. Запросы (Queries)
- Получают данные без изменения состояния
- Возвращают данные в формате DTO
- Не имеют побочных эффектов
- Примеры: получение списка заказов, поиск пользователя, расчет статистики

## Структура Use Cases

### Команда (Command)
```typescript
// app/commands/create-order.command.ts
import { z } from 'zod';
import { usePort } from '@maxdev1/sotajs/lib/di.v2';
import { findUserByIdPort, saveOrderPort } from '@domain/ports';
import { Order } from '@domain/order.aggregate';

const CreateOrderInputSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(z.object({ 
    productId: z.string().uuid(), 
    quantity: z.number().positive() 
  })),
});

type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

type CreateOrderResult = {
  success: boolean;
  orderId?: string;
  total?: number;
  error?: string;
};

export const createOrderCommand = async (input: CreateOrderInput): Promise<CreateOrderResult> => {
  const command = CreateOrderInputSchema.parse(input);

  const findUserById = usePort(findUserByIdPort);
  const saveOrder = usePort(saveOrderPort);

  const user = await findUserById({ id: command.userId });
  if (!user) {
    return { 
      success: false, 
      error: 'User not found' 
    };
  }

  try {
    const order = Order.create({
      id: crypto.randomUUID(),
      customerInfo: { name: user.name, email: user.email },
      items: command.items,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await saveOrder(order);
    
    return { 
      success: true, 
      orderId: order.id, 
      total: order.actions.calculateTotal() 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message 
    };
  }
};
```

### Запрос (Query)
```typescript
// app/queries/get-user-orders.query.ts
import { z } from 'zod';
import { usePort } from '@maxdev1/sotajs/lib/di.v2';
import { findOrdersByUserIdPort } from '@domain/ports';

const GetUserOrdersInputSchema = z.object({
  userId: z.string().uuid(),
});

type GetUserOrdersInput = z.infer<typeof GetUserOrdersInputSchema>;

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

## Интеграция с внешними системами

### Веб-API (REST)
```typescript
// app/controllers/order.controller.ts
import { createOrderCommand, getUserOrdersQuery } from '@app/use-cases';

export class OrderController {
  async createOrder(req: Request, res: Response) {
    try {
      const result = await createOrderCommand(req.body);
      
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
      const result = await getUserOrdersQuery({ userId: req.params.userId });
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

### Телеграм-бот
```typescript
// app/bot/handlers/order.handlers.ts
import { createOrderCommand, getUserOrdersQuery } from '@app/use-cases';

export class OrderBotHandlers {
  async handleCreateOrder(ctx: any) {
    try {
      const result = await createOrderCommand({
        userId: ctx.from.id.toString(),
        items: this.parseItemsFromMessage(ctx.message.text)
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
  
  async handleGetOrders(ctx: any) {
    try {
      const result = await getUserOrdersQuery({ userId: ctx.from.id.toString() });
      
      if (result.orders.length === 0) {
        await ctx.reply('📭 У вас пока нет заказов');
        return;
      }
      
      const message = result.orders.map(order => 
        `📦 Заказ #${order.id}\nСтатус: ${order.status}\nСумма: ${order.total} руб.`
      ).join('\n\n');
      
      await ctx.reply(message);
    } catch (error) {
      await ctx.reply('❌ Произошла ошибка при получении заказов');
    }
  }
  
  private parseItemsFromMessage(text: string) {
    // Логика парсинга товаров из сообщения
    return [];
  }
}
```

### CLI (Командная строка)
```typescript
// app/cli/order.cli.ts
import { createOrderCommand, getUserOrdersQuery } from '@app/use-cases';

export class OrderCLI {
  async createOrder(userId: string, items: any[]) {
    try {
      const result = await createOrderCommand({ userId, items });
      
      if (result.success) {
        console.log(`✅ Order created successfully`);
        console.log(`   Order ID: ${result.orderId}`);
        console.log(`   Total: $${result.total}`);
      } else {
        console.log(`❌ Failed to create order: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  async listOrders(userId: string) {
    try {
      const result = await getUserOrdersQuery({ userId });
      
      console.log(`📋 Orders for user ${userId}:`);
      result.orders.forEach(order => {
        console.log(`   ${order.id} - ${order.status} - $${order.total}`);
      });
      console.log(`   Total: ${result.totalCount} orders`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}
```

## Организация кода

### Рекомендуемая структура директорий
```
src/
├── domain/           # Доменные модели
│   ├── aggregates/   # Агрегаты
│   ├── entities/     # Сущности
│   └── value-objects/# Объекты-значения
├── app/              # Use Cases
│   ├── commands/     # Команды
│   ├── queries/      # Запросы
│   └── ports/        # Контракты портов
├── infra/            # Инфраструктура
│   ├── adapters/     # Реализации портов
│   └── database/     # Конфигурация БД
└── presentation/     # Внешний слой
    ├── web/          # Веб-контроллеры
    ├── bot/          # Бот-хендлеры
    └── cli/          # CLI команды
```

### Композиция зависимостей
```typescript
// composition-root.ts
import { setPortAdapters } from '@maxdev1/sotajs';
import { 
  userDbAdapter, 
  orderDbAdapter, 
  ordersQueryAdapter 
} from '@infra/adapters';
import { 
  findUserByIdPort, 
  saveOrderPort, 
  findOrdersByUserIdPort 
} from '@app/ports';

export const bootstrapApplication = () => {
  setPortAdapters([
    [findUserByIdPort, userDbAdapter],
    [saveOrderPort, orderDbAdapter],
    [findOrdersByUserIdPort, ordersQueryAdapter],
  ]);
};
```

## Лучшие практики

### 1. Проектирование команд
- Возвращайте минимальную информацию о результате
- Используйте семантические имена для DTO
- Обрабатывайте все возможные ошибки
- Валидируйте входные данные с помощью Zod

### 2. Проектирование запросов
- Оптимизируйте запросы для чтения
- Используйте проекции для сложных данных
- Избегайте N+1 запросов
- Кэшируйте часто запрашиваемые данные

### 3. Интеграционные паттерны
- Преобразуйте DTO в формат представления во внешнем слое
- Обрабатывайте ошибки на уровне контроллеров/хендлеров
- Используйте middleware для аутентификации и авторизации
- Логируйте важные операции

### 4. Тестирование
```typescript
// Тестирование команды
describe('createOrderCommand', () => {
  beforeEach(() => {
    resetDI();
    setPortAdapter(findUserByIdPort, mockFindUser);
    setPortAdapter(saveOrderPort, mockSaveOrder);
  });
  
  it('should create order successfully', async () => {
    const result = await createOrderCommand(validInput);
    
    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
  });
});

// Тестирование запроса
describe('getUserOrdersQuery', () => {
  it('should return user orders', async () => {
    const result = await getUserOrdersQuery({ userId: '123' });
    
    expect(result.orders).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });
});
```

## Преимущества подхода

1. **Простота понимания** — четкое разделение на команды и запросы
2. **Легкость тестирования** — изолированное тестирование Use Cases
3. **Гибкость интеграции** — легкое подключение к любым платформам
4. **Масштабируемость** — независимое масштабирование команд и запросов
5. **Поддержка** — понятная структура кода для новых разработчиков

Этот подход соответствует лучшим практикам Гексагональной Архитектуры и обеспечивает чистую, тестируемую и поддерживаемую кодовую базу.