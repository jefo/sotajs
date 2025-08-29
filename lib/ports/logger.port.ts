import { createPort } from '../di';

/**
 * Defines the standard interface for a logger within the Sota framework.
 * Any logger adapter must implement this interface.
 */
export interface ILogger {
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, context?: object): void;
}

/**
 * The port for retrieving the application's logger instance.
 * UseCases and other services will use this port to get a logger,
 * without knowing the concrete implementation.
 */
export const loggerPort = createPort<() => ILogger>();
