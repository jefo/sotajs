import { Hono } from 'hono';
import { setPortAdapter } from './lib/di';

// Import Ports (contracts)
import { loggerPort } from './lib/ports/logger.port';
import { savePostPort } from './lib/posts/domain/post.ports';

// Import Adapters (implementations)
import { createConsoleLoggerAdapter } from './lib/adapters/console-logger.adapter';
import { mockSavePostAdapter } from './lib/posts/adapters/mock-post.adapter';

// Import Controllers (driving adapters)
import { createPostController } from './lib/posts/api/create-post.controller';

// --- Composition Root ---
// This is the single place in the application where concrete implementations (adapters)
// are mapped to the abstract contracts (ports).

// 1. Bind infrastructure adapters to ports
setPortAdapter(loggerPort, createConsoleLoggerAdapter);
setPortAdapter(savePostPort, mockSavePostAdapter);

// 2. Initialize the web server framework
const app = new Hono();

// 3. Register HTTP routes and connect them to controllers
app.post('/posts', createPostController);

console.log('Sota application is running.');
console.log('Try sending a POST request to http://localhost:3000/posts');

export default app;