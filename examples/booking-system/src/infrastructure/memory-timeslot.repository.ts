import { TimeSlot } from '../../domain/timeslot.aggregate';

// In-memory database for time slots
export const timeSlots = new Map<string, TimeSlot>();

// Seed with some initial data
const initialSlot = TimeSlot.create({
    id: '8b7c8c3c-8b4a-4a9b-8b3a-0e8c0b0c0d1e',
    startTime: new Date(),
    duration: 60,
    isBooked: false,
});
timeSlots.set(initialSlot.id, initialSlot);

export const findTimeSlotByIdMemory = async (id: string): Promise<TimeSlot | undefined> => {
  return timeSlots.get(id);
};

export const saveTimeSlotMemory = async (slot: TimeSlot): Promise<void> => {
  timeSlots.set(slot.id, slot);
};
