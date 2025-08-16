import { McpServer, defineTool, stdio } from '@modelcontextprotocol/sdk';
import { createSotaMcpAdapter } from '../../packages/mcp/src/index';
import { listFilesUseCase } from './features/filesystem/use-case';
import { listFilesPort } from './features/filesystem/ports';
import { setPortAdapter } from '../../lib/di';
import fs from 'fs/promises';

// --- Sota DI Configuration ---
// This is the infrastructure layer. We provide a concrete implementation
// for the `listFilesPort` that our Use Case depends on.
const fileSystemAdapter = (path: string) => {
  console.log(`[FileSystemAdapter] Reading directory: ${path}`);
  return fs.readdir(path);
};

// Bind the adapter to the port. Now, any call to `usePort(listFilesPort)`
// will receive our `fileSystemAdapter`.
setPortAdapter(listFilesPort, fileSystemAdapter);
// --------------------------


// --- MCP Server Configuration ---

// 1. Define the MCP Tool, describing its interface for the AI Agent.
const listFilesTool = defineTool({
  name: 'listFiles',
  description: 'Lists files and directories at a given path.',
  input: {
    type: 'object',
    properties: {
      path: { 
        type: 'string',
        description: 'The directory path to list. Defaults to current directory.',
      },
    },
  },
});

// 2. Create a new MCP Server instance.
const server = new McpServer();

// 3. Bridge the MCP Tool with the Sota Use Case.
// Our adapter handles the validation and execution flow.
server.addTool(
  listFilesTool,
  createSotaMcpAdapter(listFilesUseCase)
);

// 4. Start the server using the stdio transport for local communication.
console.log('MCP Server is running. Waiting for input via stdio...');
server.listen(stdio());
