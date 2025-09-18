import { Port } from "./di.v2";
import { setPortAdapters } from "./di.v2";

/**
 * A composition function that sets up all the adapters for a module.
 * This allows you to have different compositions for different environments
 * (test, development, production).
 */
export type ModuleComposition<T extends Record<string, Port<any>>> = (
  module: T
) => void;

/**
 * Creates a module composition function that can be applied to a module.
 * This function provides type safety by ensuring that all ports in the module
 * have corresponding adapters provided.
 * 
 * @param adapters - A record mapping port names to their implementations
 * @returns A composition function that can be applied to a module
 */
export function createModuleComposition<T extends Record<string, Port<any>>>(
  adapters: { [K in keyof T]: T[K] extends Port<infer U> ? U : never }
): ModuleComposition<T> {
  return (module: T) => {
    // Validate that all ports in the module have corresponding adapters
    for (const key in module) {
      if (!(key in adapters)) {
        throw new Error(`Missing adapter for port '${key}' in module composition`);
      }
    }
    
    // Validate that no extra adapters are provided that don't correspond to module ports
    for (const key in adapters) {
      if (!(key in module)) {
        throw new Error(`Unexpected adapter for key '${key}' that doesn't correspond to any port in the module`);
      }
    }
    
    // Create pairs of ports and adapters
    const pairs = Object.entries(module).map(([key, port]) => [
      port,
      adapters[key as keyof T],
    ]) as [Port<any>, any][];
    
    // Apply all adapters
    setPortAdapters(pairs);
  };
}

/**
 * A helper function to create environment-specific compositions.
 * 
 * @param environment - The current environment (test, development, production, etc.)
 * @param compositions - A record mapping environment names to their compositions
 * @returns The appropriate composition function for the current environment
 */
export function createEnvironmentModuleComposition<T extends Record<string, Port<any>>>(
  environment: string,
  compositions: Record<string, ModuleComposition<T>>
): ModuleComposition<T> {
  const composition = compositions[environment];
  if (!composition) {
    throw new Error(`No composition found for environment: ${environment}`);
  }
  return composition;
}

/**
 * Applies a composition to a module.
 * 
 * @param module - The module to compose
 * @param composition - The composition function to apply
 */
export function applyModuleComposition<T extends Record<string, Port<any>>>(
  module: T,
  composition: ModuleComposition<T>
): void {
  composition(module);
}