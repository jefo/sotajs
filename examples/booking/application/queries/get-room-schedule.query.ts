import { z } from "zod";
import { usePort } from "../../../../lib";
import { findBookingsByRoomPort, loggerPort } from "../../infrastructure/ports/booking.ports";

/**
 * Query: Получить расписание комнаты
 */

const GetRoomScheduleInputSchema = z.object({
  roomId: z.string(),
  date: z.date().optional(),
});

type GetRoomScheduleInput = z.infer<typeof GetRoomScheduleInputSchema>;

type BookingDto = {
  id: string;
  userId: string;
  slot: {
    start: string;
    end: string;
  };
  status: "pending" | "confirmed" | "cancelled";
  totalCost: number;
  durationHours: number;
  roomName: string;
};

type GetRoomScheduleResult = {
  roomId: string;
  roomName: string;
  date: string;
  bookings: BookingDto[];
  totalBookedHours: number;
  totalRevenue: number;
};

export const getRoomScheduleQuery = async (
  input: GetRoomScheduleInput
): Promise<GetRoomScheduleResult> => {
  const query = GetRoomScheduleInputSchema.parse(input);
  
  const findBookingsByRoom = usePort(findBookingsByRoomPort);
  const logger = usePort(loggerPort);

  const targetDate = query.date || new Date();
  const dateStr = targetDate.toISOString().split("T")[0];

  await logger({
    level: "info",
    message: `Getting schedule for room ${query.roomId}`,
    context: { roomId: query.roomId, date: dateStr },
  });

  const bookings = await findBookingsByRoom({ roomId: query.roomId });

  // Фильтрация по дате (если передана)
  const filteredBookings = bookings.filter((b) => {
    if (!query.date) return true;
    const bookingDate = b.slot.start.toISOString().split("T")[0];
    return bookingDate === dateStr;
  });

  // Маппинг в DTO
  const bookingDtos: BookingDto[] = filteredBookings.map((b) => ({
    id: b.id,
    userId: b.userId,
    slot: {
      start: b.slot.start.toISOString(),
      end: b.slot.end.toISOString(),
    },
    status: b.status,
    totalCost: b.totalCost,
    durationHours: (b.slot.end.getTime() - b.slot.start.getTime()) / (1000 * 60 * 60),
    roomName: getRoomName(b.roomId),
  }));

  // Агрегация
  const activeBookings = bookingDtos.filter((b) => b.status !== "cancelled");
  const totalBookedHours = activeBookings.reduce(
    (sum, b) => sum + b.durationHours,
    0
  );
  const totalRevenue = activeBookings.reduce(
    (sum, b) => sum + b.totalCost,
    0
  );

  await logger({
    level: "info",
    message: `Schedule retrieved`,
    context: {
      roomId: query.roomId,
      bookingCount: bookingDtos.length,
      totalBookedHours,
      totalRevenue,
    },
  });

  return {
    roomId: query.roomId,
    roomName: getRoomName(query.roomId),
    date: dateStr,
    bookings: bookingDtos,
    totalBookedHours,
    totalRevenue,
  };
};

function getRoomName(roomId: string): string {
  const roomNames: Record<string, string> = {
    amber: "Amber",
    sapphire: "Sapphire",
    emerald: "Emerald",
  };
  return roomNames[roomId.toLowerCase()] || roomId;
}

export type { GetRoomScheduleInput, GetRoomScheduleResult, BookingDto };
