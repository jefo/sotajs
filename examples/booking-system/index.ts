import { bindPorts } from './src/composition-root';
import { startServer } from './src/infrastructure/api/server';

// Bind the ports to their adapters
bindPorts();

// Start the web server
startServer();
