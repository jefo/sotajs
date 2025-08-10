import { setPortAdapter } from '../../../lib/di';
import {
  findAppointmentByIdPort,
  saveAppointmentPort,
  findTimeSlotByIdPort,
  saveTimeSlotPort,
} from './domain/ports';
import {
  findAppointmentByIdMemory,
  saveAppointmentMemory,
} from './infrastructure/memory-appointment.repository';
import {
  findTimeSlotByIdMemory,
  saveTimeSlotMemory,
} from './infrastructure/memory-timeslot.repository';

// This is the Composition Root. It's the only place where the application's
// core is coupled with the infrastructure.
export function bindPorts() {
  setPortAdapter(findAppointmentByIdPort, findAppointmentByIdMemory);
  setPortAdapter(saveAppointmentPort, saveAppointmentMemory);
  setPortAdapter(findTimeSlotByIdPort, findTimeSlotByIdMemory);
  setPortAdapter(saveTimeSlotPort, saveTimeSlotMemory);
  console.log('Ports bound to in-memory adapters.');
}
