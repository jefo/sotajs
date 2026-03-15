/**
 * Booking Example: Система бронирования переговорных
 * 
 * Демонстрация возможностей SotaJS:
 * - Rich Domain Model с агрегатами и инвариантами
 * - CQRS (Commands & Queries)
 * - Ports & Adapters
 * - Полная типобезопасность
 * 
 * Запуск: bun run examples/booking/index.ts
 * Тесты: bun test examples/booking/
 */

import "./booking.composition";
import {
  createBookingCommand,
  cancelBookingCommand,
  getRoomScheduleQuery,
} from "./application";

// ============================================================================
// DEMO: Выполнение сценариев
// ============================================================================

async function runDemo() {
  console.log("🏢 Booking System Demo\n");
  console.log("=" .repeat(50));

  // --- Сценарий 1: Создание бронирования ---
  console.log("\n📅 Сценарий 1: Создание бронирования\n");

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const bookingStart = new Date(tomorrow);
  bookingStart.setHours(10, 0, 0, 0);
  
  const bookingEnd = new Date(tomorrow);
  bookingEnd.setHours(12, 0, 0, 0);

  const createResult = await createBookingCommand({
    roomId: "amber",
    userId: "user-123",
    start: bookingStart,
    end: bookingEnd,
  });

  if (createResult.success) {
    console.log(`✅ Бронирование создано: ${createResult.bookingId}`);
    console.log(`💰 Стоимость: ${createResult.totalCost} руб.`);
  } else {
    console.log(`❌ Ошибка: ${createResult.error}`);
  }

  // --- Сценарий 2: Попытка создать пересекающееся бронирование ---
  console.log("\n📅 Сценарий 2: Попытка пересекающегося бронирования\n");

  const overlapStart = new Date(tomorrow);
  overlapStart.setHours(11, 0, 0, 0);
  
  const overlapEnd = new Date(tomorrow);
  overlapEnd.setHours(13, 0, 0, 0);

  const overlapResult = await createBookingCommand({
    roomId: "amber",
    userId: "user-456",
    start: overlapStart,
    end: overlapEnd,
  });

  if (!overlapResult.success) {
    console.log(`✅ Инвариант сработал: ${overlapResult.error}`);
  }

  // --- Сценарий 3: Получение расписания ---
  console.log("\n📅 Сценарий 3: Расписание комнаты Amber\n");

  const schedule = await getRoomScheduleQuery({
    roomId: "amber",
    date: tomorrow,
  });

  console.log(`📊 Комната: ${schedule.roomName}`);
  console.log(`📅 Дата: ${schedule.date}`);
  console.log(`📌 Бронирований: ${schedule.bookings.length}`);
  console.log(`⏱️  Занято часов: ${schedule.totalBookedHours.toFixed(1)}`);
  console.log(`💰 Выручка: ${schedule.totalRevenue} руб.`);

  for (const booking of schedule.bookings) {
    const start = new Date(booking.slot.start).toLocaleTimeString("ru-RU", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    const end = new Date(booking.slot.end).toLocaleTimeString("ru-RU", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    console.log(`   ${start} - ${end} | ${booking.status} | ${booking.totalCost} руб.`);
  }

  // --- Сценарий 4: Отмена бронирования ---
  console.log("\n📅 Сценарий 4: Отмена бронирования\n");

  if (createResult.success) {
    const cancelResult = await cancelBookingCommand({
      bookingId: createResult.bookingId,
      reason: "Изменились планы",
      cancelledAt: new Date(), // Отменяем заранее — штрафа не будет
    });

    if (cancelResult.success) {
      console.log(`✅ Бронирование отменено`);
      console.log(`💰 Штраф: ${cancelResult.penaltyApplied} руб.`);
      console.log(`💵 Возврат: ${cancelResult.refundAmount} руб.`);
    } else {
      console.log(`❌ Ошибка отмены: ${cancelResult.error}`);
    }
  }

  // --- Сценарий 5: Поздняя отмена (со штрафом) ---
  console.log("\n📅 Сценарий 5: Создание и поздняя отмена\n");

  const lateCancelStart = new Date(now);
  lateCancelStart.setHours(now.getHours() + 1, 0, 0, 0);
  
  const lateCancelEnd = new Date(now);
  lateCancelEnd.setHours(now.getHours() + 2, 0, 0, 0);

  const lateBooking = await createBookingCommand({
    roomId: "sapphire",
    userId: "user-789",
    start: lateCancelStart,
    end: lateCancelEnd,
  });

  if (lateBooking.success) {
    // Отменяем за 30 минут до начала (менее 2 часов — будет штраф)
    const lateCancelTime = new Date(now);
    lateCancelTime.setHours(now.getHours() + 0, 30, 0, 0);

    const lateCancelResult = await cancelBookingCommand({
      bookingId: lateBooking.bookingId,
      reason: "Срочные дела",
      cancelledAt: lateCancelTime,
    });

    if (lateCancelResult.success) {
      console.log(`⚠️  Поздняя отмена — применён штраф`);
      console.log(`💰 Штраф: ${lateCancelResult.penaltyApplied} руб. (10%)`);
      console.log(`💵 Возврат: ${lateCancelResult.refundAmount} руб.`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Demo completed!\n");
}

// ============================================================================
// Запуск
// ============================================================================

if (import.meta.main) {
  runDemo().catch(console.error);
}

export { runDemo };
