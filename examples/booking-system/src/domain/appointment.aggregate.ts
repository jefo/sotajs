import { z } from 'zod';
import { createAggregate, IDomainEvent } from '../../../lib/aggregate';
import { TimeSlot } from './timeslot.aggregate';

// --- Domain Event ---
// Defines the contract for an event that is raised when an appointment is created.
export class AppointmentCreatedEvent implements IDomainEvent {
  public readonly aggregateId: string;
  public readonly slotToReserve: string;
  public readonly timestamp: Date;

  constructor(payload: { appointmentId: string; slotToReserve: string }) {
    this.aggregateId = payload.appointmentId;
    this.slotToReserve = payload.slotToReserve;
    this.timestamp = new Date();
  }
}

// --- Aggregate ---
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  slotId: z.string().uuid(),
  clientId: z.string().uuid(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'confirmed', 'cancelled']),
});

export type AppointmentState = z.infer<typeof AppointmentSchema>;

// We need to manually define the class to add a custom static `create` method
class AppointmentAggregate {
  private readonly props: AppointmentState;
  private pendingEvents: IDomainEvent[] = [];

  private constructor(props: AppointmentState) {
    this.props = props;
  }

  // The static create method now enforces a critical business rule.
  static create(payload: {
    clientId: string;
    notes?: string;
    availableTimeSlot: TimeSlot;
  }): AppointmentAggregate {
    // 1. Enforce the invariant: Cannot book a slot that is already booked.
    if (payload.availableTimeSlot.state.isBooked) {
      throw new Error('Cannot create an appointment for a booked time slot.');
    }

    // 2. Create the appointment state
    const appointmentState = {
      id: crypto.randomUUID(),
      slotId: payload.availableTimeSlot.id,
      clientId: payload.clientId,
      notes: payload.notes,
      status: 'scheduled' as const,
    };
    AppointmentSchema.parse(appointmentState); // Validate the new state

    const appointment = new AppointmentAggregate(appointmentState);

    // 3. Add a domain event to signify that the slot needs to be reserved.
    appointment.addDomainEvent(
      new AppointmentCreatedEvent({
        appointmentId: appointment.id,
        slotToReserve: payload.availableTimeSlot.id,
      }),
    );

    return appointment;
  }
  
  // Expose actions and state similar to createAggregate
  // NOTE: This is a simplified version. A full implementation would re-use more from createAggregate.
  get id() { return this.props.id; }
  get state() { return { ...this.props }; }
  getPendingEvents() { return [...this.pendingEvents]; }
  clearEvents() { this.pendingEvents = []; }
  addDomainEvent(event: IDomainEvent) { this.pendingEvents.push(event); }
  findEvent<T extends IDomainEvent>(eventType: any): T | undefined {
    return this.pendingEvents.find(e => e instanceof eventType) as T | undefined;
  }
}

// To maintain consistency with the rest of the framework, we export the type.
// In a real scenario, `createAggregate` would be enhanced to support custom create methods.
export type Appointment = AppointmentAggregate;
export const Appointment = AppointmentAggregate;