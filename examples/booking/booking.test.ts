import { describe, it, expect, beforeEach } from "bun:test";
import { TimeSlot } from "./domain/time-slot";
import { Booking, BookingCreatedEvent } from "./domain/booking.aggregate";
import { CancellationPolicy } from "./domain/cancellation-policy";
import {
  createBookingCommand,
  cancelBookingCommand,
  getRoomScheduleQuery,
} from "./application";
import { InMemoryBookingAdapter, BookingFeature } from "./infrastructure";
import { defineCore, resetDI } from "../../lib";
import "./booking.composition";

/**
 * Тесты для системы бронирования переговорных
 * 
 * Проверяют:
 * - Инварианты доменной модели
 * - Логику команд и запросов
 * - Политику отмены
 */

// ============================================================================
// Domain Tests: TimeSlot Value Object
// ============================================================================

describe("TimeSlot VO", () => {
  it("should create valid time slot", () => {
    const start = new Date("2025-01-15T10:00:00Z");
    const end = new Date("2025-01-15T12:00:00Z");

    const slot = TimeSlot.create({ start, end });

    expect(slot.props.start).toEqual(start);
    expect(slot.props.end).toEqual(end);
    expect(slot.durationHours).toBeCloseTo(2, 1);
    expect(slot.cost).toBe(1000); // 2 hours * 500 rub/hour
  });

  it("should reject invalid time slot (end before start)", () => {
    const start = new Date("2025-01-15T12:00:00Z");
    const end = new Date("2025-01-15T10:00:00Z");

    expect(() => TimeSlot.create({ start, end })).toThrow(
      "End time must be after start time"
    );
  });

  it("should detect overlapping slots", () => {
    const slot1 = TimeSlot.create({
      start: new Date("2025-01-15T10:00:00Z"),
      end: new Date("2025-01-15T12:00:00Z"),
    });

    const overlappingSlot = {
      start: new Date("2025-01-15T11:00:00Z"),
      end: new Date("2025-01-15T13:00:00Z"),
    };

    expect(() => slot1.actions.overlapsWith(overlappingSlot)).toThrow(
      "Time slot overlaps"
    );
  });

  it("should not throw for non-overlapping slots", () => {
    const slot1 = TimeSlot.create({
      start: new Date("2025-01-15T10:00:00Z"),
      end: new Date("2025-01-15T12:00:00Z"),
    });

    const nonOverlappingSlot = {
      start: new Date("2025-01-15T12:00:00Z"),
      end: new Date("2025-01-15T14:00:00Z"),
    };

    expect(() => slot1.actions.overlapsWith(nonOverlappingSlot)).not.toThrow();
  });
});

// ============================================================================
// Domain Tests: Booking Aggregate
// ============================================================================

describe("Booking Aggregate", () => {
  const validBookingData = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    roomId: "amber",
    userId: "user-123",
    slot: {
      start: new Date("2025-01-15T10:00:00Z"),
      end: new Date("2025-01-15T12:00:00Z"),
    },
    status: "pending" as const,
    totalCost: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should create booking in pending state", () => {
    const booking = Booking.create(validBookingData);

    expect(booking.props.status).toBe("pending");
    expect(booking.props.totalCost).toBe(1000);
    expect(booking.roomName).toBe("Amber");
  });

  it("should confirm booking and emit event", () => {
    const booking = Booking.create(validBookingData);

    booking.actions.confirm();

    expect(booking.props.status).toBe("confirmed");
    const events = booking.getPendingEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(BookingCreatedEvent);
  });

  it("should reject confirmation if already confirmed", () => {
    const confirmedBooking = Booking.create({
      ...validBookingData,
      status: "confirmed" as const,
    });

    expect(() => confirmedBooking.actions.confirm()).toThrow(
      "Cannot confirm booking with status: confirmed"
    );
  });

  it("should cancel booking with reason", () => {
    const booking = Booking.create(validBookingData);
    booking.actions.confirm();

    booking.actions.cancel("Changed plans", 0);

    expect(booking.props.status).toBe("cancelled");
    expect(booking.canBeCancelled).toBe(false);
  });

  it("should reject cancellation if already cancelled", () => {
    const cancelledBooking = Booking.create({
      ...validBookingData,
      status: "cancelled" as const,
    });

    expect(() => cancelledBooking.actions.cancel("Test", 0)).toThrow(
      "Booking is already cancelled"
    );
  });

  it("should enforce positive total cost via schema validation", () => {
    const invalidData = {
      ...validBookingData,
      totalCost: 0,
    };

    expect(() => Booking.create(invalidData)).toThrow();
  });
});

// ============================================================================
// Domain Tests: CancellationPolicy
// ============================================================================

describe("CancellationPolicy", () => {
  const bookingStart = new Date("2025-01-15T10:00:00Z");
  const totalCost = 1000;

  it("should allow cancellation without penalty (more than 2 hours)", () => {
    const cancelledAt = new Date("2025-01-15T07:00:00Z"); // 3 hours before

    const policy = CancellationPolicy.create({
      bookingId: "booking-123",
      slotStart: bookingStart,
      totalCost,
      cancelledAt,
    });

    expect(policy.canCancelWithoutPenalty).toBe(true);
    expect(policy.penaltyAmount).toBe(0);
    expect(policy.hoursUntilStart).toBe(3);
  });

  it("should apply penalty for late cancellation (less than 2 hours)", () => {
    const cancelledAt = new Date("2025-01-15T09:00:00Z"); // 1 hour before

    const policy = CancellationPolicy.create({
      bookingId: "booking-123",
      slotStart: bookingStart,
      totalCost,
      cancelledAt,
    });

    expect(policy.canCancelWithoutPenalty).toBe(false);
    expect(policy.penaltyAmount).toBe(100); // 10% of 1000
    expect(policy.hoursUntilStart).toBe(1);
  });

  it("should apply penalty for cancellation at exact boundary", () => {
    const cancelledAt = new Date("2025-01-15T08:00:00Z"); // Exactly 2 hours before

    const policy = CancellationPolicy.create({
      bookingId: "booking-123",
      slotStart: bookingStart,
      totalCost,
      cancelledAt,
    });

    // На границе 2 часов — ещё без штрафа
    expect(policy.canCancelWithoutPenalty).toBe(true);
    expect(policy.penaltyAmount).toBe(0);
  });
});

// ============================================================================
// Application Tests: Commands & Queries
// ============================================================================

describe("Booking Commands & Queries", () => {
  beforeEach(() => {
    resetDI();

    const core = defineCore({
      booking: BookingFeature,
    });

    core.bindFeatures(({ booking }) => {
      booking.bind(InMemoryBookingAdapter);
    });
  });

  it("should create booking successfully", async () => {
    const start = new Date("2025-01-15T10:00:00Z");
    const end = new Date("2025-01-15T12:00:00Z");

    const result = await createBookingCommand({
      roomId: "amber",
      userId: "user-123",
      start,
      end,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.bookingId).toBeDefined();
      expect(result.totalCost).toBe(1000);
    }
  });

  it("should reject overlapping booking", async () => {
    const start = new Date("2025-01-15T10:00:00Z");
    const end = new Date("2025-01-15T12:00:00Z");

    // Create first booking
    await createBookingCommand({
      roomId: "amber",
      userId: "user-123",
      start,
      end,
    });

    // Try to create overlapping booking
    const overlapStart = new Date("2025-01-15T11:00:00Z");
    const overlapEnd = new Date("2025-01-15T13:00:00Z");

    const result = await createBookingCommand({
      roomId: "amber",
      userId: "user-456",
      start: overlapStart,
      end: overlapEnd,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("overlaps");
    }
  });

  it("should allow booking in different room", async () => {
    const start = new Date("2025-01-15T10:00:00Z");
    const end = new Date("2025-01-15T12:00:00Z");

    // Create booking in amber
    await createBookingCommand({
      roomId: "amber",
      userId: "user-123",
      start,
      end,
    });

    // Create booking in sapphire at same time
    const result = await createBookingCommand({
      roomId: "sapphire",
      userId: "user-123",
      start,
      end,
    });

    expect(result.success).toBe(true);
  });

  it("should get room schedule", async () => {
    const start = new Date("2025-01-15T10:00:00Z");
    const end = new Date("2025-01-15T12:00:00Z");

    await createBookingCommand({
      roomId: "amber",
      userId: "user-123",
      start,
      end,
    });

    const schedule = await getRoomScheduleQuery({
      roomId: "amber",
      date: new Date("2025-01-15"),
    });

    expect(schedule.roomId).toBe("amber");
    expect(schedule.roomName).toBe("Amber");
    expect(schedule.bookings.length).toBe(1);
    expect(schedule.totalBookedHours).toBe(2);
    expect(schedule.totalRevenue).toBe(1000);
  });

  it("should cancel booking without penalty (early)", async () => {
    const start = new Date("2025-01-15T10:00:00Z");
    const end = new Date("2025-01-15T12:00:00Z");

    const createResult = await createBookingCommand({
      roomId: "amber",
      userId: "user-123",
      start,
      end,
    });

    if (!createResult.success) throw new Error("Failed to create booking");

    // Cancel 3 hours before (no penalty)
    const cancelledAt = new Date("2025-01-15T07:00:00Z");

    const cancelResult = await cancelBookingCommand({
      bookingId: createResult.bookingId,
      reason: "Changed plans",
      cancelledAt,
    });

    expect(cancelResult.success).toBe(true);
    if (cancelResult.success) {
      expect(cancelResult.penaltyApplied).toBe(0);
      expect(cancelResult.refundAmount).toBe(1000);
    }
  });

  it("should cancel booking with penalty (late)", async () => {
    const start = new Date("2025-01-15T10:00:00Z");
    const end = new Date("2025-01-15T12:00:00Z");

    const createResult = await createBookingCommand({
      roomId: "amber",
      userId: "user-123",
      start,
      end,
    });

    if (!createResult.success) throw new Error("Failed to create booking");

    // Cancel 1 hour before (10% penalty)
    const cancelledAt = new Date("2025-01-15T09:00:00Z");

    const cancelResult = await cancelBookingCommand({
      bookingId: createResult.bookingId,
      reason: "Emergency",
      cancelledAt,
    });

    expect(cancelResult.success).toBe(true);
    if (cancelResult.success) {
      expect(cancelResult.penaltyApplied).toBe(100); // 10% of 1000
      expect(cancelResult.refundAmount).toBe(900);
    }
  });
});
