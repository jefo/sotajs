import { Port } from "./di.v2";
import { usePort, usePorts } from "./di.v2";

/**
 * A module is a collection of related ports that can be used together.
 * This helps reduce boilerplate when multiple ports are needed in a use case.
 */
export type Module<T extends Record<string, Port<any>>> = {
	readonly [K in keyof T]: T[K];
};

/**
 * Creates a module from a record of ports.
 * @param ports - A record mapping names to port descriptors
 * @returns A module that can be used with useModule
 */
export function createModule<T extends Record<string, Port<any>>>(ports: T): Module<T> {
	// Simply return the ports as a module (no validation at creation time)
	// Validation will happen when useModule is called
	return ports as Module<T>;
}

/**
 * Retrieves all port implementations from a module at once.
 * @param module - The module created via createModule
 * @returns An object with the same keys as the module, but with implementations instead of port descriptors
 */
export function useModule<T extends Record<string, Port<any>>>(module: Module<T>): {
	readonly [K in keyof T]: T[K] extends Port<infer U> ? U : never;
} {
	// Extract port descriptors and their keys
	const keys = Object.keys(module) as (keyof T)[];
	const ports = keys.map(key => module[key]);
	
	// Get implementations for all ports
	const implementations = usePorts(...ports);
	
	// Map implementations back to their named keys
	const result = {} as {
		[K in keyof T]: T[K] extends Port<infer U> ? U : never;
	};
	
	for (let i = 0; i < keys.length; i++) {
		result[keys[i]] = implementations[i] as any;
	}
	
	return result;
}