import { z } from "zod";
import { createValueObject } from "../../../lib";

/**
 * Value Object: Политика отмены
 * 
 * Определяет правила отмены бронирования:
 * - Отмена за 2+ часа — без штрафа
 * - Отмена менее чем за 2 часа — штраф 10%
 */

const CANCELLATION_WINDOW_HOURS = 2;
const CANCELLATION_PENALTY_PERCENT = 10;

const CancellationPolicySchema = z.object({
  bookingId: z.string(),
  slotStart: z.date(),
  totalCost: z.number().positive(),
  cancelledAt: z.date(),
});

type CancellationPolicyProps = z.infer<typeof CancellationPolicySchema>;

export const CancellationPolicy = createValueObject({
  schema: CancellationPolicySchema,
  actions: {
    /**
     * Применяет штраф если отмена менее чем за 2 часа
     */
    applyPenalty: (state) => {
      const hoursUntilBooking = 
        (state.slotStart.getTime() - state.cancelledAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilBooking < CANCELLATION_WINDOW_HOURS) {
        // Штраф 10% от стоимости
        const penalty = Math.round(state.totalCost * (CANCELLATION_PENALTY_PERCENT / 100));
        console.log(
          `⚠️  Late cancellation penalty: ${penalty} руб. (${hoursUntilBooking.toFixed(1)} hours before booking)`
        );
        // В реальном приложении здесь было бы начисление штрафа
      } else {
        console.log(
          `✅ Cancellation without penalty (${hoursUntilBooking.toFixed(1)} hours before booking)`
        );
      }
    },
  },
  computed: {
    /**
     * Можно ли отменить без штрафа
     */
    canCancelWithoutPenalty: (props) => {
      const hoursUntilBooking = 
        (props.slotStart.getTime() - props.cancelledAt.getTime()) / (1000 * 60 * 60);
      return hoursUntilBooking >= CANCELLATION_WINDOW_HOURS;
    },
    
    /**
     * Размер штрафа (0 если отмена своевременная)
     */
    penaltyAmount: (props) => {
      const hoursUntilBooking = 
        (props.slotStart.getTime() - props.cancelledAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilBooking >= CANCELLATION_WINDOW_HOURS) {
        return 0;
      }
      
      return Math.round(props.totalCost * (CANCELLATION_PENALTY_PERCENT / 100));
    },
    
    /**
     * Часов до начала бронирования
     */
    hoursUntilStart: (props) => {
      return (props.slotStart.getTime() - props.cancelledAt.getTime()) / (1000 * 60 * 60);
    },
  },
});

export type CancellationPolicy = ReturnType<typeof CancellationPolicy.create>;
