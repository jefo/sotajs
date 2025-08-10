import { z } from 'zod';
import { usePort } from '../../../lib/di';
import {
  findTimeSlotByIdPort,
  saveAppointmentPort,
} from '../domain/ports';
import { Appointment } from '../domain/appointment.aggregate';

export const ScheduleAppointmentInputSchema = z.object({
  slotId: z.string().uuid(),
  clientId: z.string().uuid(),
  notes: z.string().optional(),
});

type ScheduleAppointmentInput = z.infer<typeof ScheduleAppointmentInputSchema>;

export const scheduleAppointmentUseCase = async (input: unknown) => {
  const validInput = ScheduleAppointmentInputSchema.parse(input);

  // Dependencies
  const findTimeSlotById = usePort(findTimeSlotByIdPort);
  const saveAppointment = usePort(saveAppointmentPort);

  // 1. Find the resource required for the operation
  const timeSlot = await findTimeSlotById(validInput.slotId);

  if (!timeSlot) {
    throw new Error('Time slot not found.');
  }

  // 2. Create the aggregate. The factory method now contains the critical business rule.
  const appointment = Appointment.create({
    clientId: validInput.clientId,
    notes: validInput.notes,
    availableTimeSlot: timeSlot,
  });

  // 3. Persist the new aggregate. The repository will handle the transaction.
  await saveAppointment(appointment);

  return { appointmentId: appointment.id };
};