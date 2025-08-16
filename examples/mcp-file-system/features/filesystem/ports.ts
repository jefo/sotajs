import { createPort } from '../../../../lib/di';

// This port defines the contract for a function that can list files.
// The Use Case will depend on this abstraction, not a concrete implementation.
export const listFilesPort = createPort<(path: string) => Promise<string[]>>();
