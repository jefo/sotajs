import { Appointment, AppointmentCreatedEvent } from '../../domain/appointment.aggregate';
import { timeSlots } from './memory-timeslot.repository'; // Import for transactional behavior

const appointments = new Map<string, Appointment>();

export const findAppointmentByIdMemory = async (id: string): Promise<Appointment | undefined> => {
  return appointments.get(id);
};

// The repository now handles the transactional logic based on the aggregate's events.
export const saveAppointmentMemory = async (appointment: Appointment): Promise<void> => {
  const event = appointment.findEvent(AppointmentCreatedEvent);

  // Check for the specific event that requires a transaction
  if (event) {
    const slotToReserve = timeSlots.get(event.slotToReserve);

    // This block simulates a transaction
    if (!slotToReserve || slotToReserve.state.isBooked) {
      throw new Error('Failed to reserve slot, it was booked just now.'); // Simulate race condition
    }
    
    // 1. Update the time slot
    slotToReserve.actions.book();
    timeSlots.set(slotToReserve.id, slotToReserve);

    // 2. Save the appointment
    appointments.set(appointment.id, appointment);

  } else {
    // If no special event, just save the appointment (e.g., for a simple status update)
    appointments.set(appointment.id, appointment);
  }

  // In a real system, this would happen only after the transaction is committed.
  appointment.clearEvents();
};