import Bottle from "bottlejs";

let container = new Bottle();
const PORT_ID_SYMBOL = Symbol("portId");

// A registry to store all defined ports.
// Key - portId, Value - the port object itself for debugging.
const portRegistry = new Map<string, Port<any>>();

/**
 * A unique descriptor object for a port.
 * This is a simple object used as a "tag" or a "key".
 */
export interface Port<T extends (...args: any[]) => any> {
	// This property is just for holding the type T, it's not meant to be used at runtime.
	__TYPE__: T;
	[PORT_ID_SYMBOL]?: string;
}

/**
 * Defines a new port in the system.
 * This function only creates and registers a "contract" (interface),
 * but does not provide any implementation.
 * @returns Port<T> - A unique port descriptor.
 */
export function createPort<T extends (...args: any[]) => any>(): Port<T> {
	const portId = crypto.randomUUID();

	// Create a simple object that will serve as the port descriptor.
	const port: Port<T> = {
		// This is a trick to make the type T available to TypeScript's inference
		// It will be compiled away and doesn't exist at runtime.
		__TYPE__: undefined as any,
		[PORT_ID_SYMBOL]: portId,
	};

	portRegistry.set(portId, port);

	return port;
}

/**
 * Binds a specific implementation (adapter) to a port.
 * @param port - The port descriptor created via createPort().
 * @param adapter - The implementation function matching the port's signature.
 * @throws {Error} If the port is invalid or unregistered.
 */
export function setPortAdapter<T extends (...args: any[]) => any>(
	port: Port<T>,
	adapter: T,
): void {
	const portId = port[PORT_ID_SYMBOL];
	if (!portId || !portRegistry.has(portId)) {
		throw new Error("An invalid or unregistered port was provided.");
	}

	container.factory(portId, () => adapter);
}

/**
 * Binds a specific implementation (adapter) to a port with dependencies.
 * @param port - The port descriptor created via createPort().
 * @param factory - A function that creates the adapter implementation, potentially using other ports.
 * @throws {Error} If the port is invalid or unregistered.
 */
export function setPortAdapterWithDependencies<
	T extends (...args: any[]) => any,
>(port: Port<T>, factory: () => T): void {
	const portId = port[PORT_ID_SYMBOL];
	if (!portId || !portRegistry.has(portId)) {
		throw new Error("An invalid or unregistered port was provided.");
	}

	container.factory(portId, factory);
}

/**
 * Retrieves a port's implementation from the DI container.
 * @param port - The port descriptor for which to retrieve the implementation.
 * @returns T - The implementation function (adapter).
 * @throws {Error} If the port is invalid, unregistered, or has no implementation.
 */
export function usePort<T extends (...args: any[]) => any>(port: Port<T>): T {
	const portId = port[PORT_ID_SYMBOL];
	if (!portId || !portRegistry.has(portId)) {
		throw new Error("Attempted to use an invalid or unregistered port.");
	}

	const implementation = container.container[portId];
	if (!implementation) {
		throw new Error(
			`No implementation found for the port. Did you forget to call setPortAdapter() or setPortAdapterWithDependencies()?`,
		);
	}

	return implementation as T;
}

/**
 * Binds a specific implementation (adapter) to a port with dependencies.
 * @param port - The port descriptor created via createPort().
 * @param factory - A function that creates the adapter implementation, potentially using other ports.
 * @throws {Error} If the port is invalid or unregistered.
 */
export function setPortAdapterWithDependencies<
	T extends (...args: any[]) => any,
>(port: Port<T>, factory: () => T): void {
	const portId = port[PORT_ID_SYMBOL];
	if (!portId || !portRegistry.has(portId)) {
		throw new Error("An invalid or unregistered port was provided.");
	}

	container.factory(portId, factory);
}

/**
 * Resets the state of the DI container and port registry.
 * Necessary for test isolation.
 */
export function resetDI() {
	container = new Bottle();
}
