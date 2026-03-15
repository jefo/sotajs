import { z } from "zod";
import { createAggregate, createValueObject, IDomainEvent } from "../../../lib";

/**
 * Value Object: Пицца
 */
export const Pizza = createValueObject({
  schema: z.object({
    name: z.string(),
    price: z.number().positive(),
  }),
});
export type Pizza = ReturnType<typeof Pizza.create>;

/**
 * Агрегат: Заказ
 */
export class OrderStatusChangedEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly newStatus: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

const OrderSchema = z.object({
  id: z.string().uuid(),
  items: z.array(z.object({ name: z.string(), price: z.number() })),
  status: z.enum(["new", "confirmed", "cooking", "delivered", "cancelled"]),
  totalPrice: z.number(),
  createdAt: z.date(),
});

export const Order = createAggregate({
  name: "Order",
  schema: OrderSchema,
  invariants: [
    (props) => {
      if (props.items.length === 0) throw new Error("Order must have at least one pizza");
    },
    (props) => {
      const calculated = props.items.reduce((sum, i) => sum + i.price, 0);
      if (props.totalPrice !== calculated) throw new Error("Total price mismatch");
    }
  ],
  actions: {
    confirm: (state) => {
      if (state.status !== "new") throw new Error("Only new orders can be confirmed");
      state.status = "confirmed";
      return { event: new OrderStatusChangedEvent(state.id, state.status) };
    },
    startCooking: (state) => {
      if (state.status !== "confirmed") throw new Error("Order must be confirmed first");
      state.status = "cooking";
      return { event: new OrderStatusChangedEvent(state.id, state.status) };
    },
    cancel: (state) => {
      // Ключевой бизнес-инвариант для Шортса!
      if (state.status === "cooking" || state.status === "delivered") {
        throw new Error("Too late to cancel! Pizza is already in the oven.");
      }
      state.status = "cancelled";
      return { event: new OrderStatusChangedEvent(state.id, state.status) };
    }
  },
  computed: {
    canCancel: (props) => props.status !== "cooking" && props.status !== "delivered" && props.status !== "cancelled"
  }
});
export type Order = ReturnType<typeof Order.create>;
