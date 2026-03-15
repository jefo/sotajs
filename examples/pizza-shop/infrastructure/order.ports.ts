import { createPort } from "../../../lib";

/**
 * DTO для сохранения/загрузки
 */
export type OrderDto = {
  id: string;
  items: { name: string; price: number }[];
  status: "new" | "confirmed" | "cooking" | "delivered" | "cancelled";
  totalPrice: number;
  createdAt: Date;
};

/**
 * Порты для работы с данными
 * ПРАВИЛО: Описываем синхронную сигнатуру, Sota сделает её Promise
 */
export const saveOrderPort = createPort<(order: OrderDto) => void>();
export const findOrderByIdPort = createPort<(id: string) => OrderDto | null>();

/**
 * Порт для уведомлений
 */
export const notifyCustomerPort = createPort<(message: string) => void>();
