# Спецификация фреймворка "SotaTele"

## 1. Обзор и Философия

**SotaTele** — это Node.js/Bun фреймворк для быстрой разработки Telegram-ботов, вдохновленный современными веб-фреймворками (Express.js, React) и принципами чистой архитектуры.

**Ключевые принципы:**

1.  **Гибридная архитектура:** Фреймворк сочетает в себе два подхода:
    *   **Stateless Router (в стиле MVC):** Для обработки простых, одноразовых команд и действий, не требующих сложного контекста.
    *   **FlowController (State Machine):** Для управления сложными, многошаговыми диалогами (регистрация, оформление заказа, квизы).

2.  **Декларативное описание UI:** Представления (сообщения в чате) описываются как чистые функции-"компоненты", которые принимают данные (`props`) и возвращают сериализуемый объект, описывающий сообщение для Telegram API.

3.  **Разделение ответственности (Decoupling):** Фреймворк отвечает за взаимодействие с Telegram API, роутинг, управление сессиями и рендеринг. Он полностью отделен от бизнес-логики приложения. Ядро бизнес-логики (например, написанное на SotaJS) подключается как внешний сервис.

## 2. Ключевые Компоненты

### `Router` (Stateless Роутер)

Основная точка входа. Маршрутизирует входящие `update` на соответствующие обработчики.

**API:**

*   `new Router()`: Создает экземпляр роутера.
*   `router.onCommand(command: string | RegExp, handler: Handler)`: Регистрирует обработчик для Telegram-команд (например, `/start`).
*   `router.onCallbackQuery(pattern: string | RegExp, handler: Handler)`: Регистрирует обработчик для нажатий на инлайн-кнопки. Может извлекать параметры из `callback_data` (например, `product:(.+)`).
*   `router.onText(pattern: string | RegExp, handler: Handler)`: Регистрирует обработчик для текстовых сообщений.
*   `router.use(middleware: Middleware)`: Добавляет middleware, которое выполняется для каждого `update`.
*   `router.addFlow(flow: FlowController)`: Регистрирует stateful-флоу, делегируя ему управление, если пользователь находится в этом флоу.
*   `router.handle(update: object)`: Основной метод, запускающий обработку `update`.

**Сигнатура обработчика (Handler):**
`type Handler = (ctx: Context) => Promise<void>;`

### `Context` (Объект `ctx`)

Абстракция над `update` от Telegram, предоставляющая удобный API для ответа. Передается в каждый `handler` и `middleware`.

**Свойства:**

*   `ctx.update`: "Сырой" объект `update` от Telegram.
*   `ctx.from`: Информация о пользователе (`update.message.from` или `update.callback_query.from`).
*   `ctx.chat`: Информация о чате.
*   `ctx.session`: Объект сессии пользователя. Заполняется `SessionManager`.
*   `ctx.state`: Объект для передачи данных между `middleware` в рамках одного запроса.
*   `ctx.params`: Параметры, извлеченные из `RegExp` в роутере (например, ID продукта из `product:(.+)`).

**Методы:**

*   `ctx.reply(text: string, extra?: object)`: Отправляет новое сообщение.
*   `ctx.editMessageText(text: string, extra?: object)`: Редактирует текущее сообщение.
*   `ctx.deleteMessage()`: Удаляет сообщение.
*   `ctx.answerCallbackQuery(text?: string)`: Отвечает на `callback_query`.
*   `ctx.enterFlow(flowName: string, initialState?: string)`: Принудительно запускает stateful-флоу для пользователя.

### `FlowController` (State Machine)

Управляет сложными, многошаговыми диалогами.

**API:**

*   `new FlowController(config)`: Создает экземпляр state-машины на основе конфигурации.
*   `createFlow(config)`: Фабрика для создания конфигурации.

**Конфигурация флоу:**

Объект, где ключи — названия состояний. Каждое состояние описывается объектом:

*   `component: ComponentFunction`: Функция-компонент для рендеринга этого состояния.
*   `onEnter?: QueryFunction`: (Опционально) **Запрос** из ядра, который нужно выполнить при входе в состояние, чтобы получить данные для компонента.
*   `onAction?: { [pattern: string]: ActionHandler }`: Карта обработчиков действий в этом состоянии.
    *   `pattern`: `RegExp` или строка для `callback_data`.
    *   `ActionHandler`:
        *   `command: CommandFunction`: **Команда** из ядра для выполнения.
        *   `nextState: string | ((dto: any) => string)`: Следующее состояние (может быть функцией от результата команды).
        *   `refresh?: boolean`: Если `true`, после выполнения команды нужно обновить текущее представление, а не переходить в новое состояние.

### `Component`

Простая асинхронная функция, принимающая `props` и возвращающая объект `MessagePayload`.

*   **Сигнатура:** `type Component = (props: any) => Promise<MessagePayload>;`
*   **`MessagePayload`:** Объект, описывающий сообщение для Telegram API (`text`, `reply_markup`, `parse_mode` и т.д.).

### `SessionManager` (Middleware)

Middleware для управления сессиями. Должен быть добавлен через `router.use()`.

**API:**

*   `new SessionManager({ store: ISessionStore })`

**Интерфейс `ISessionStore`:**

*   `get(key: string): Promise<Session>`
*   `set(key: string, value: Session, ttl?: number): Promise<void>`

По умолчанию предоставляет `InMemorySessionStore`. Для production-использования (особенно в serverless) должен быть заменен на адаптер для Redis, Mongo и т.д.

## 3. Жизненный цикл запроса

### Stateless-сценарий (через `Router`)

1.  `Update` от Telegram поступает в `router.handle(update)`.
2.  `SessionManager` загружает `ctx.session`.
3.  `Router` находит подходящий обработчик (`onCommand`, `onCallbackQuery` и т.д.).
4.  Выполняется `Handler`, который может вызвать ядро и использует `ctx` для ответа.

### Stateful-сценарий (через `FlowController`)

1.  `Update` поступает в `router.handle(update)`.
2.  `SessionManager` загружает `ctx.session`.
3.  `Router` видит, что пользователь находится в активном флоу (`session.flowName`), и передает `update` в соответствующий `FlowController`.
4.  `FlowController` находит текущее состояние (`session.currentState`) и обработчик для `update` в `onAction`.
5.  Вызывается **Команда** из ядра.
6.  `FlowController` получает DTO от Команды, обновляет сессию на `nextState`.
7.  `FlowController` смотрит на новое состояние, видит `onEnter` **Запрос** и выполняет его.
8.  `FlowController` получает DTO от Запроса и передает его в `Component` для рендеринга.
9.  Сгенерированный `MessagePayload` отправляется в Telegram.

## 4. Пример реализации: Бот-счетчик

*Предполагается, что ядро на SotaJS с `getCounterQuery`, `incrementCounterCommand`, `decrementCounterCommand` уже написано.*

**`bot/Counter.component.ts`**
```typescript
export async function CounterComponent(props: { count: number }) {
  return {
    text: `Текущее значение: <b>${props.count}</b>`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '➖', callback_data: 'decrement' },
        { text: '➕', callback_data: 'increment' },
      ]],
    },
  };
}
```

**`bot/main.flow.ts`**
```typescript
import { createFlow } from './sota-tele-bridge';
import { CounterComponent } from './Counter.component';
import { getCounterQuery, incrementCounterCommand, decrementCounterCommand } from '../src/counter'; // Импорты из ядра

export const mainFlow = createFlow({
  'counter': {
    component: CounterComponent,
    onEnter: getCounterQuery, // Получить счетчик при входе в состояние
    onAction: {
      'increment': {
        command: incrementCounterCommand,
        refresh: true, // Обновить текущий экран, используя DTO от команды
      },
      'decrement': {
        command: decrementCounterCommand,
        refresh: true,
      },
    },
  },
});
```

**`bot/index.ts`**
```typescript
import { Telegraf } from 'telegraf';
import { Router, SessionManager, FlowController } from './sota-tele-bridge';
import { mainFlow } from './main.flow';
// ...настройка портов SotaJS...

const bot = new Telegraf(process.env.BOT_TOKEN!);
const router = new Router();
const sessionManager = new SessionManager({ store: new InMemorySessionStore() });
const mainFlowController = new FlowController(mainFlow, 'mainFlow');

// Middleware для сессий
router.use(sessionManager.middleware());

// Делегируем управление FlowController, если пользователь в этом флоу
router.addFlow(mainFlowController);

// Точка входа в наш stateful-сценарий
router.onCommand('start', (ctx) => ctx.enterFlow('mainFlow', 'counter'));

// Обработчик для всех апдейтов
bot.on('update', (update) => router.handle(update));

bot.launch();
```

## 5. Взаимодействие с SotaJS

Фреймворк `SotaTele` является "потребителем" (consumer) ядра, написанного на SotaJS.

*   **Точки интеграции:**
    *   В `handler`-функциях stateless-роутера.
    *   В полях `command` и `onEnter` конфигурации `FlowController`.
*   **Контракт:** Взаимодействие происходит через вызов функций **Команд** и **Запросов** и получение от них **DTO**. Фреймворк не знает о внутренней реализации ядра (агрегаты, порты, адаптеры).

Это обеспечивает полное разделение и позволяет независимо разрабатывать и тестировать бизнес-логику и логику представления/диалога.
