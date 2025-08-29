import { ILogger } from '../ports/logger.port';

/**
 * A basic logger adapter that uses the native console.
 * This serves as a default, zero-dependency logger for the framework.
 */
export const createConsoleLoggerAdapter = (): ILogger => {
  return {
    info(message: string, context?: object) {
      console.log(`[INFO] ${message}`, context || '');
    },
    warn(message: string, context?: object) {
      console.warn(`[WARN] ${message}`, context || '');
    },
    error(message: string, context?: object) {
      console.error(`[ERROR] ${message}`, context || '');
    },
  };
};
