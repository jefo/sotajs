import { z } from "zod";
import { createValueObject } from "../../../lib";

/**
 * Value Object: Временной слот
 *
 * Определяет временной интервал с логикой проверки пересечений
 */

const TimeSlotSchema = z.object({
  start: z.preprocess((val) => {
    if (val instanceof Date) return val;
    if (typeof val === "string") return new Date(val);
    return val;
  }, z.date()),
  end: z.preprocess((val) => {
    if (val instanceof Date) return val;
    if (typeof val === "string") return new Date(val);
    return val;
  }, z.date()),
}).refine((data) => data.end > data.start, {
  message: "End time must be after start time",
  path: ["end"],
});

type TimeSlotProps = z.infer<typeof TimeSlotSchema>;

export const TimeSlot = createValueObject({
  schema: TimeSlotSchema,
  actions: {
    /**
     * Проверяет пересечение с другим слотом
     */
    overlapsWith: (state, other: TimeSlotProps) => {
      // Два слота пересекаются если один начинается до того как другой закончится
      const overlaps = state.start < other.end && other.start < state.end;
      if (overlaps) {
        throw new Error(
          `Time slot overlaps: [${state.start.toISOString()} - ${state.end.toISOString()}] ∩ [${other.start.toISOString()} - ${other.end.toISOString()}]`
        );
      }
    },
    
    /**
     * Проверяет содержится ли другой слот внутри этого
     */
    contains: (state, other: TimeSlotProps) => {
      return state.start <= other.start && state.end >= other.end;
    },
    
    /**
     * Возвращает длительность в часах
     */
    setDuration: (state, hours: number) => {
      const newEnd = new Date(state.start.getTime() + hours * 60 * 60 * 1000);
      state.end = newEnd;
    },
  },
  computed: {
    /**
     * Длительность в часах
     */
    durationHours: (props) => {
      return (props.end.getTime() - props.start.getTime()) / (1000 * 60 * 60);
    },

    /**
     * Стоимость по ставке 500 руб/час
     */
    cost: (props) => {
      const HOURLY_RATE = 500;
      const duration = (props.end.getTime() - props.start.getTime()) / (1000 * 60 * 60);
      return Math.round(duration * HOURLY_RATE);
    },
  },
});

export type TimeSlot = ReturnType<typeof TimeSlot.create>;
