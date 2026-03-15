import { FeaturePorts } from "../../../../lib";
import { defineFeature } from "../../../../lib";
import {
  saveBookingPort,
  updateBookingPort,
  findBookingByIdPort,
  findBookingsByRoomPort,
  findBookingsByUserPort,
  loggerPort,
  BookingDto,
} from "../ports/booking.ports";

/**
 * Определяем фичу со всеми портами
 */
export const BookingFeature = defineFeature({
  saveBooking: saveBookingPort,
  updateBooking: updateBookingPort,
  findBookingById: findBookingByIdPort,
  findBookingsByRoom: findBookingsByRoomPort,
  findBookingsByUser: findBookingsByUserPort,
  logger: loggerPort,
});

/**
 * In-Memory Адаптер для бронирований
 * 
 * Хранит данные в памяти. Для демонстрации и тестов.
 * В продакшене заменить на Prisma/TypeORM адаптер.
 */
export class InMemoryBookingAdapter implements FeaturePorts<typeof BookingFeature> {
  private bookings: Map<string, BookingDto> = new Map();

  async saveBooking(input: { booking: BookingDto }): Promise<void> {
    if (this.bookings.has(input.booking.id)) {
      throw new Error(`Booking ${input.booking.id} already exists`);
    }
    this.bookings.set(input.booking.id, input.booking);
    console.log(`💾 Booking saved: ${input.booking.id}`);
  }

  async updateBooking(input: { booking: BookingDto }): Promise<void> {
    if (!this.bookings.has(input.booking.id)) {
      throw new Error(`Booking ${input.booking.id} not found`);
    }
    this.bookings.set(input.booking.id, input.booking);
    console.log(`🔄 Booking updated: ${input.booking.id}`);
  }

  async findBookingById(input: { bookingId: string }): Promise<BookingDto | null> {
    const booking = this.bookings.get(input.bookingId);
    if (!booking) return null;
    
    // Возвращаем копию с новыми Date объектами
    return cloneBooking(booking);
  }

  async findBookingsByRoom(input: { roomId: string }): Promise<BookingDto[]> {
    const results = Array.from(this.bookings.values())
      .filter((b) => b.roomId === input.roomId)
      .map(cloneBooking);
    
    return results;
  }

  async findBookingsByUser(input: { userId: string }): Promise<BookingDto[]> {
    const results = Array.from(this.bookings.values())
      .filter((b) => b.userId === input.userId)
      .map(cloneBooking);
    
    return results;
  }

  async logger(input: {
    level: "info" | "warn" | "error";
    message: string;
    context?: Record<string, any>;
  }): Promise<void> {
    const emoji = {
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
    }[input.level];
    
    const contextStr = input.context ? ` | ${JSON.stringify(input.context)}` : "";
    console.log(`${emoji} [${input.level.toUpperCase()}] ${input.message}${contextStr}`);
  }

  // --- Helpers для тестов ---

  /**
   * Очистить все данные (для тестов)
   */
  clear(): void {
    this.bookings.clear();
    console.log("🗑️  InMemoryBookingAdapter cleared");
  }

  /**
   * Получить все бронирования (для тестов)
   */
  getAll(): BookingDto[] {
    return Array.from(this.bookings.values()).map(cloneBooking);
  }

  /**
   * Сидировать тестовыми данными
   */
  seed(bookings: BookingDto[]): void {
    for (const booking of bookings) {
      this.bookings.set(booking.id, booking);
    }
    console.log(`🌱 Seeded ${bookings.length} bookings`);
  }
}

/**
 * Клонирует DTO с новыми Date объектами
 */
function cloneBooking(booking: BookingDto): BookingDto {
  return {
    ...booking,
    slot: {
      start: new Date(booking.slot.start),
      end: new Date(booking.slot.end),
    },
    createdAt: new Date(booking.createdAt),
    updatedAt: new Date(booking.updatedAt),
  };
}
