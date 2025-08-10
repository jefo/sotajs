import { ZodError } from 'zod';
import { scheduleAppointmentUseCase } from '../../application/schedule-appointment.use-case';

export function startServer() {
  console.log('Starting HTTP server...');

  Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === 'POST' && url.pathname === '/schedule') {
        try {
          const body = await req.json();
          const result = await scheduleAppointmentUseCase(body);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
            status: 201, // Created
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(JSON.stringify(error.errors), {
              headers: { 'Content-Type': 'application/json' },
              status: 400, // Bad Request
            });
          }
          if (error instanceof Error) {
            return new Response(JSON.stringify({ message: error.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 409, // Conflict
            });
          }
          return new Response('Internal Server Error', { status: 500 });
        }
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log('Server listening on http://localhost:3000');
}
