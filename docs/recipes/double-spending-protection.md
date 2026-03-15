# Индустриальный стандарт: Защита от двойного списания (Idempotency)

## Проблема: "Double Spending"
В любой системе платежей или продажи цифровых товаров (например, скинов CS2) есть риск:
1. Сеть лагнула, клиент нажал кнопку "Купить" дважды.
2. Бот отправил два коллбэка.
3. Система списала деньги два раза, а товар выдала один (или наоборот).

Обычные кодеры пытаются решить это через `if` в базе данных. **SotaJS решает это на уровне ДНК Агрегата.**

## Решение SotaJS: Idempotency Key + Rich Aggregate

### 1. Домен (Aggregate)
Мы добавляем проверку ключа идемпотентности прямо в Агрегат. Агрегат — это крепость, он "помнит" выполненные операции.

```typescript
// domain/wallet.aggregate.ts
export const Wallet = createAggregate({
  name: "Wallet",
  schema: z.object({
    balance: z.number(),
    processedOperations: z.array(z.string()), // Список ID обработанных операций
  }),
  invariants: [
    (props) => { if (props.balance < 0) throw new Error("Insufficient funds"); }
  ],
  actions: {
    debit: (state, amount: number, operationId: string) => {
      // ИНВАРИАНТ: Проверка на дубликат прямо в "мозгах"
      if (state.processedOperations.includes(operationId)) {
        return { alreadyProcessed: true }; 
      }
      
      state.balance -= amount;
      state.processedOperations.push(operationId);
      
      return { event: new MoneyDebitedEvent(state.id, amount) };
    }
  }
});
```

### 2. Приложение (Use Case)
Команда просто прокидывает ключ из внешнего мира (например, ID транзакции из Steam или UUID с фронтенда).

```typescript
// app/commands/purchase-skin.command.ts
export const purchaseSkinCommand = async (input: { walletId: string, amount: number, opKey: string }) => {
  const [findWallet, saveWallet] = usePorts(findWalletPort, saveWalletPort);

  const walletData = await findWallet(input.walletId);
  const wallet = Wallet.create(walletData);

  // Пытаемся списать
  const result = wallet.actions.debit(input.amount, input.opKey);

  if (result?.alreadyProcessed) {
    return { success: true, message: "ALREADY_DONE" }; // Идемпотентный ответ
  }

  await saveWallet(wallet.props);
  return { success: true };
};
```

---

## Почему это "Industrial Grade"? (FxDD тест)

Самое крутое — мы можем доказать защиту от двойного списания **тестом**, который имитирует атаку или сетевой лаг.

```typescript
// wallet.test.ts
it("должен игнорировать повторное списание с тем же ключом (Race Condition Protection)", async () => {
  const opKey = "steam_txn_12345";
  
  // Имитируем два параллельных запроса
  const req1 = purchaseSkinCommand({ walletId: "W1", amount: 500, opKey });
  const req2 = purchaseSkinCommand({ walletId: "W1", amount: 500, opKey });

  await Promise.all([req1, req2]);

  // Проверяем фикстуру (БД)
  const wallet = await store.findWallet("W1");
  expect(wallet.balance).toBe(500); // Списалось только ОДИН раз, хотя запроса было два!
});
```

## Преимущества для бизнеса (Long-tail трафик)
Разработчики ищут "как не списать деньги два раза в Node.js". Мы даем им не просто ответ, а **инструмент**, где:
1. **Логика в одном месте**: Не в триггерах БД, не в middleware, а в Агрегате.
2. **Легко тестировать**: Вам не нужен RabbitMQ или Redis, чтобы проверить идемпотентность.
3. **Безопасность по умолчанию**: ИИ, обученный на SotaJS, просто не сгенерирует код без защиты, потому что Агрегат требует `operationId` для экшена.

---
**SotaJS Toolkit: Мы не просто пишем код. Мы строим системы, которым можно доверить деньги.**
