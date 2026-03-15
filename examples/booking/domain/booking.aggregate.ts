import { z } from "zod";
import { createAggregate, IDomainEvent } from "../../../lib";
import { TimeSlot } from "./time-slot";

/**
 * Aggregate: Бронирование переговорной
 * 
 * Корневой агрегат который инкапсулирует бизнес-правила:
 * - Нельзя пересечение слотов
 * - Статусы бронирования
 * - Правила отмены
 */

// --- Domain Events ---

export class BookingCreatedEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly roomId: string,
    public readonly userId: string,
    public readonly slotStart: Date,
    public readonly slotEnd: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BookingCancelledEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly reason: string,
    public readonly penaltyApplied: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BookingRejectedEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly reason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// --- Schema & Types ---

const BookingSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string(),
  userId: z.string(),
  slot: z.object({
    start: z.date(),
    end: z.date(),
  }),
  status: z.enum(["pending", "confirmed", "cancelled"]),
  totalCost: z.number().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type BookingProps = z.infer<typeof BookingSchema>;

// --- Aggregate Definition ---

export const Booking = createAggregate({
  name: "Booking",
  schema: BookingSchema,
  entities: {
    // TimeSlot не нужен как entity здесь, т.к. это встроенный объект
  },
  invariants: [
    // Инвариант 1: Статус должен быть валидным
    (props) => {
      const validStatuses = ["pending", "confirmed", "cancelled"] as const;
      if (!validStatuses.includes(props.status)) {
        throw new Error(`Invalid booking status: ${props.status}`);
      }
    },
    
    // Инвариант 2: Стоимость должна быть положительной
    (props) => {
      if (props.totalCost <= 0) {
        throw new Error("Booking total cost must be positive");
      }
    },
    
    // Инвариант 3: Конец слота должен быть после начала
    (props) => {
      if (props.slot.end <= props.slot.start) {
        throw new Error("Slot end must be after slot start");
      }
    },
  ],
  actions: {
    /**
     * Подтвердить бронирование
     */
    confirm: (state) => {
      if (state.status !== "pending") {
        throw new Error(`Cannot confirm booking with status: ${state.status}`);
      }
      state.status = "confirmed";
      state.updatedAt = new Date();
      
      return {
        event: new BookingCreatedEvent(
          state.id,
          state.roomId,
          state.userId,
          state.slot.start,
          state.slot.end,
        ),
      };
    },
    
    /**
     * Отменить бронирование с применением политики отмены
     */
    cancel: (state, reason: string, penaltyAmount: number) => {
      if (state.status === "cancelled") {
        throw new Error("Booking is already cancelled");
      }
      
      state.status = "cancelled";
      state.updatedAt = new Date();
      
      // Штраф применяется в use case, здесь только событие
      return {
        event: new BookingCancelledEvent(state.id, reason, penaltyAmount),
      };
    },
    
    /**
     * Отклонить бронирование (например, из-за пересечения)
     */
    reject: (state, reason: string) => {
      if (state.status !== "pending") {
        throw new Error(`Cannot reject booking with status: ${state.status}`);
      }
      
      state.status = "cancelled";
      state.updatedAt = new Date();
      
      return {
        event: new BookingRejectedEvent(state.id, reason),
      };
    },
  },
  computed: {
    /**
     * Длительность в часах
     */
    durationHours: (props) => {
      return (props.slot.end.getTime() - props.slot.start.getTime()) / (1000 * 60 * 60);
    },
    
    /**
     * Можно ли ещё отменить
     */
    canBeCancelled: (props) => {
      return props.status !== "cancelled";
    },
    
    /**
     * Название комнаты (из ID)
     */
    roomName: (props) => {
      const roomNames: Record<string, string> = {
        "amber": "Amber",
        "sapphire": "Sapphire", 
        "emerald": "Emerald",
      };
      return roomNames[props.roomId.toLowerCase()] || props.roomId;
    },
  },
});

export type Booking = ReturnType<typeof Booking.create>;
