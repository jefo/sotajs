/**
 * A bridge function that wraps a SotaUseCase into a handler compatible
 * with the Model Context Protocol SDK.
 * 
 * @param useCase The Sota Use Case to wrap (a function with built-in validation).
 * @returns A handler function for MCP's `server.addTool` or `server.addResource`.
 */
export function createSotaMcpAdapter<TOutput>(
  useCase: (rawInput: unknown) => Promise<TOutput>
) {
  /**
   * This is the actual handler that the MCP server will call.
   * It simply invokes the Sota use case, which now has validation built-in.
   * @param mcpInput The raw input from the MCP client.
   * @returns The result from the Sota Use Case.
   */
  return async (mcpInput: unknown): Promise<TOutput> => {
    console.log(`[SotaMcpAdapter] Received input:`, mcpInput);

    // The useCase function now handles its own validation internally.
    // We can call it directly.
    return useCase(mcpInput);
  };
}
