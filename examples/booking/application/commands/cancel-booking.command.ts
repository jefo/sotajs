import { z } from "zod";
import { usePort } from "../../../../lib";
import { CancellationPolicy } from "../../domain/cancellation-policy";
import { Booking } from "../../domain/booking.aggregate";
import {
  findBookingByIdPort,
  updateBookingPort,
  loggerPort,
} from "../../infrastructure/ports/booking.ports";

/**
 * Command: Отменить бронирование
 */

const CancelBookingInputSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(1),
  cancelledAt: z.date().optional(),
});

type CancelBookingInput = z.infer<typeof CancelBookingInputSchema>;

type CancelBookingResult = 
  | { success: true; penaltyApplied: number; refundAmount: number }
  | { success: false; error: string };

export const cancelBookingCommand = async (
  input: CancelBookingInput
): Promise<CancelBookingResult> => {
  const command = CancelBookingInputSchema.parse(input);
  
  const findBookingById = usePort(findBookingByIdPort);
  const updateBooking = usePort(updateBookingPort);
  const logger = usePort(loggerPort);

  const cancelledAt = command.cancelledAt || new Date();

  await logger({
    level: "info",
    message: `Cancelling booking ${command.bookingId}`,
    context: { bookingId: command.bookingId, reason: command.reason },
  });

  // Найти бронирование
  const bookingData = await findBookingById({ bookingId: command.bookingId });
  
  if (!bookingData) {
    return {
      success: false,
      error: "Booking not found",
    };
  }

  // Воссоздать агрегат из сохранённых данных
  const booking = Booking.create({
    ...bookingData,
    slot: {
      start: new Date(bookingData.slot.start),
      end: new Date(bookingData.slot.end),
    },
    createdAt: new Date(bookingData.createdAt),
    updatedAt: new Date(bookingData.updatedAt),
  });

  // Проверка: можно ли отменить
  if (!booking.canBeCancelled) {
    return {
      success: false,
      error: "Booking is already cancelled",
    };
  }

  // Применить политику отмены
  const policy = CancellationPolicy.create({
    bookingId: booking.id,
    slotStart: booking.props.slot.start,
    totalCost: booking.props.totalCost,
    cancelledAt,
  });

  const penaltyAmount = policy.penaltyAmount;
  const refundAmount = booking.props.totalCost - penaltyAmount;

  await logger({
    level: "info",
    message: `Cancellation policy applied`,
    context: {
      bookingId: booking.id,
      hoursUntilStart: policy.hoursUntilStart,
      penaltyAmount,
      refundAmount,
      canCancelWithoutPenalty: policy.canCancelWithoutPenalty,
    },
  });

  // Отменить бронирование
  booking.actions.cancel(command.reason, penaltyAmount);

  // Сохранить изменения
  await updateBooking({ booking: booking.props });

  // Публикация событий
  const events = booking.getPendingEvents();
  for (const event of events) {
    await logger({
      level: "info",
      message: `Domain event: ${event.constructor.name}`,
      context: { 
        aggregateId: event.aggregateId,
        penaltyApplied: event instanceof BookingCancelledEvent ? event.penaltyApplied : 0,
      },
    });
  }

  return {
    success: true,
    penaltyApplied: penaltyAmount,
    refundAmount,
  };
};

// Re-import for event type
import { BookingCancelledEvent } from "../../domain/booking.aggregate";

export type { CancelBookingInput, CancelBookingResult };
