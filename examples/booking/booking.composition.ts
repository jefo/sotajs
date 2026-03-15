import { defineCore } from "../../lib";
import { BookingFeature } from "./infrastructure";
import { InMemoryBookingAdapter } from "./infrastructure";

/**
 * Composition Root: Сборка приложения
 * 
 * Здесь определяем ядро и связываем фичи с адаптерами
 */

// Определяем ядро приложения
export const core = defineCore({
  booking: BookingFeature,
});

// Связываем фичу с адаптером
core.bindFeatures(({ booking }) => {
  booking.bind(InMemoryBookingAdapter);
});

export type AppCore = typeof core;
