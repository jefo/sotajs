import { createPort } from '../../../lib/di';
import { TimeSlot } from './timeslot.aggregate';
import { Appointment } from './appointment.aggregate';

// Ports for TimeSlot
export const findTimeSlotByIdPort = createPort<(id: string) => Promise<TimeSlot | undefined>>('findTimeSlotByIdPort');
export const saveTimeSlotPort = createPort<(slot: TimeSlot) => Promise<void>>('saveTimeSlotPort');

// Ports for Appointment
export const findAppointmentByIdPort = createPort<(id: string) => Promise<Appointment | undefined>>('findAppointmentByIdPort');
export const saveAppointmentPort = createPort<(appointment: Appointment) => Promise<void>>('saveAppointmentPort');
