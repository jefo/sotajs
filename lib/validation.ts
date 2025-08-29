import { z } from 'zod';

/**
 * A higher-order function that takes a handler function and a Zod schema,
 * and returns a new function that automatically validates its input.
 * 
 * @param handler The core logic function that receives validated data.
 * @param schema The Zod schema to validate the input against.
 * @returns A new, safe-to-call function with built-in validation.
 */
export function withValidation<TInput extends z.ZodType, TOutput>(
  handler: (input: z.infer<TInput>) => Promise<TOutput>,
  schema: TInput
) {
  return async (rawInput: unknown): Promise<TOutput> => {
    // --- DEBUG LOGGING ---
    console.log('--- [withValidation] ---');
    console.log('Schema exists:', !!schema); // Check if schema object exists
    if (schema) {
      console.log('Schema type:', 'shape' in schema ? 'object' : 'other'); // Is it an object schema?
    }
    console.log('Raw Input:', rawInput);
    console.log('------------------------');
    // --- END DEBUG LOGGING ---

    const validationResult = schema.safeParse(rawInput);

    if (!validationResult.success) {
      // TODO: Implement a structured error for validation failures.
      console.error('Validation failed:', validationResult.error.flatten());
      throw new Error('Input validation failed');
    }

    return handler(validationResult.data);
  };
}
