// examples/skin-shop-adhoc/app.ts
// Тот самый код, который "написал ИИ без архитектуры"

import express from 'express';
const app = express();
app.use(express.json());

// Фейковая база данных
let userBalance = 100000; // 100к руб
let inventory: string[] = [];

app.post('/buy-skin', async (req, res) => {
  const { skinId, price } = req.body;

  // КЛАССИЧЕСКИЙ БАГ: Race Condition
  // Если придет два запроса одновременно, оба пройдут этот 'if'
  if (userBalance >= price) {
    
    // Имитируем задержку сети или обращения к Steam API
    await new Promise(resolve => setTimeout(resolve, 100));

    userBalance -= price;
    inventory.push(skinId);

    console.log(`✅ Куплен скин ${skinId}. Остаток: ${userBalance}`);
    res.json({ success: true, balance: userBalance });
  } else {
    res.status(400).json({ error: "Insufficient funds" });
  }
});

app.listen(3000, () => console.log('Skin Shop (Buggy) listening on 3000'));
