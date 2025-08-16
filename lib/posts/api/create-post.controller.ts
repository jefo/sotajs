import { z } from 'zod';
import { Context } from 'hono';
import { createPostUseCase, CreatePostInputSchema } from '../use-cases/create-post.use-case';

/**
 * This is the Controller, or Driving Adapter.
 * Its sole responsibility is to translate HTTP requests into calls to the Use Case.
 * It knows how to handle HTTP context (request, response, status codes),
 * but it knows nothing about the business logic itself.
 */
export const createPostController = async (c: Context) => {
  try {
    // 1. Extract and validate raw data from the request.
    const body = await c.req.json();

    // 2. Call the application core (Use Case).
    const result = await createPostUseCase(body);

    // 3. Format the successful HTTP response.
    return c.json({ postId: result.postId }, 201); // 201 Created

  } catch (error) {
    // Handle specific errors and format the HTTP error response.
    if (error instanceof z.ZodError) {
      return c.json({ message: 'Invalid input', errors: error.issues }, 400); // 400 Bad Request
    }

    // Handle business logic errors thrown from the use case.
    // We can check for specific error types if we define custom error classes.
    return c.json({ message: error.message }, 422); // 422 Unprocessable Entity
  }
};
