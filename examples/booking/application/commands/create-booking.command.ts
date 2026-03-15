import { z } from "zod";
import { usePort } from "../../../../lib";
import { Booking } from "../../domain/booking.aggregate";
import {
  findBookingsByRoomPort,
  saveBookingPort,
  loggerPort,
} from "../../infrastructure/ports/booking.ports";

/**
 * Command: Создать бронирование
 */

const CreateBookingInputSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  start: z.date(),
  end: z.date(),
});

type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>;

type CreateBookingResult = 
  | { success: true; bookingId: string; totalCost: number }
  | { success: false; error: string };

export const createBookingCommand = async (
  input: CreateBookingInput
): Promise<CreateBookingResult> => {
  const command = CreateBookingInputSchema.parse(input);
  
  const findBookingsByRoom = usePort(findBookingsByRoomPort);
  const saveBooking = usePort(saveBookingPort);
  const logger = usePort(loggerPort);

  await logger({
    level: "info",
    message: `Creating booking for room ${command.roomId}`,
    context: { roomId: command.roomId, userId: command.userId },
  });

  // Проверка на пересечения с существующими бронированиями
  const existingBookings = await findBookingsByRoom({ roomId: command.roomId });
  
  for (const existing of existingBookings) {
    if (existing.status === "cancelled") continue;
    
    // Проверка пересечения
    const hasOverlap = 
      command.start < existing.slot.end && 
      existing.slot.start < command.end;
    
    if (hasOverlap) {
      await logger({
        level: "warn",
        message: `Booking rejected: time slot overlaps`,
        context: { 
          roomId: command.roomId,
          conflictingBookingId: existing.id,
        },
      });
      
      return {
        success: false,
        error: `Time slot overlaps with existing booking at ${existing.slot.start.toLocaleTimeString()}`,
      };
    }
  }

  // Создание агрегата
  const booking = Booking.create({
    id: crypto.randomUUID(),
    roomId: command.roomId,
    userId: command.userId,
    slot: {
      start: command.start,
      end: command.end,
    },
    status: "pending",
    totalCost: calculateCost(command.start, command.end),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Подтверждение
  booking.actions.confirm();

  // Сохранение
  await saveBooking({ booking: booking.props });

  // Публикация событий
  const events = booking.getPendingEvents();
  for (const event of events) {
    await logger({
      level: "info",
      message: `Domain event: ${event.constructor.name}`,
      context: { aggregateId: event.aggregateId },
    });
  }

  await logger({
    level: "info",
    message: `Booking created successfully`,
    context: { bookingId: booking.id, totalCost: booking.props.totalCost },
  });

  return {
    success: true,
    bookingId: booking.id,
    totalCost: booking.props.totalCost,
  };
};

function calculateCost(start: Date, end: Date): number {
  const HOURLY_RATE = 500;
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.round(hours * HOURLY_RATE);
}

export type { CreateBookingInput, CreateBookingResult };
