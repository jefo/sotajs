import { z } from 'zod';
import { usePort } from '../../../../lib/di';
import { listFilesPort } from './ports';
import { withValidation } from '../../../../lib/validation';

// 1. The Zod schema defines the contract for the input data.
const ListFilesInputSchema = z.object({
  path: z.string().default('.').describe('The directory path to list files from.'),
});

// 2. The handler is a plain async function containing the core business logic.
// It expects to receive an already-validated `input` object.
async function handleListFiles(input: z.infer<typeof ListFilesInputSchema>) {
  const listFiles = usePort(listFilesPort);
  const files = await listFiles(input.path);
  return { files };
}

// 3. The final exported "use case" is the handler wrapped with validation.
// This creates a single, safe-to-call function.
export const listFilesUseCase = withValidation(
  handleListFiles,
  ListFilesInputSchema
);
