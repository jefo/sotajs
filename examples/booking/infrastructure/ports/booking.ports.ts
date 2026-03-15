import { createPort } from "../../../../lib";

/**
 * Ports: Контракты для инфраструктуры бронирования
 */

// --- Command Ports ---

/**
 * Сохранить новое бронирование
 */
export const saveBookingPort = createPort<
  (input: { booking: BookingDto }) => Promise<void>
>();

/**
 * Обновить существующее бронирование
 */
export const updateBookingPort = createPort<
  (input: { booking: BookingDto }) => Promise<void>
>();

// --- Query Ports ---

/**
 * Найти бронирование по ID
 */
export const findBookingByIdPort = createPort<
  (input: { bookingId: string }) => Promise<BookingDto | null>
>();

/**
 * Найти все бронирования комнаты
 */
export const findBookingsByRoomPort = createPort<
  (input: { roomId: string }) => Promise<BookingDto[]>
>();

/**
 * Найти бронирования пользователя
 */
export const findBookingsByUserPort = createPort<
  (input: { userId: string }) => Promise<BookingDto[]>
>();

// --- Utility Ports ---

/**
 * Логгер
 */
export const loggerPort = createPort<
  (input: {
    level: "info" | "warn" | "error";
    message: string;
    context?: Record<string, any>;
  }) => Promise<void>
>();

// --- Types ---

export type BookingDto = {
  id: string;
  roomId: string;
  userId: string;
  slot: {
    start: Date;
    end: Date;
  };
  status: "pending" | "confirmed" | "cancelled";
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
};
