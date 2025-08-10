import { z } from 'zod';
import { createAggregate } from '../../../lib/aggregate';

export const TimeSlotSchema = z.object({
  id: z.string().uuid(),
  startTime: z.date(),
  duration: z.number().positive(), // in minutes
  isBooked: z.boolean(),
});

export type TimeSlotState = z.infer<typeof TimeSlotSchema>;

export const TimeSlot = createAggregate({
  name: 'TimeSlot',
  schema: TimeSlotSchema,
  invariants: [
    (state) => {
      if (state.duration <= 0) {
        throw new Error('Duration must be positive.');
      }
    },
  ],
  actions: {
    book: (state) => {
      if (state.isBooked) {
        throw new Error('Time slot is already booked.');
      }
      return { state: { ...state, isBooked: true } };
    },
    cancelBooking: (state) => {
      if (!state.isBooked) {
        throw new Error('Time slot is not booked.');
      }
      return { state: { ...state, isBooked: false } };
    },
  },
});

export type TimeSlot = InstanceType<typeof TimeSlot>;
