import { test, expect, beforeEach } from "bun:test";
import {
	createPort,
	setPortAdapter,
	setPortAdapterWithDependencies,
	usePort,
	resetDI,
} from "./di.v2";

// 1. Reset DI container before each test for isolation
beforeEach(() => {
	resetDI();
});

test("should register and resolve a simple service", () => {
	// 2. Define a Port with a specific function signature
	const greeterPort = createPort<(name: string) => string>();

	// 3. Define an Adapter (implementation)
	const greeterAdapter = (name: string) => `Hello, ${name}!`;

	// 4. Bind the adapter to the port
	setPortAdapter(greeterPort, greeterAdapter);

	// 5. Use the port to get the adapter implementation
	const greeterService = usePort(greeterPort);

	// DEMONSTRATION: At this point, `greeterService` is correctly typed
	// as `(name: string) => string`. No `unknown` or `any`.

	// 6. Call the service and assert the result
	const result = greeterService("World");
	expect(result).toBe("Hello, World!");
});

test("should handle services with complex types (objects and promises)", async () => {
	type User = { id: number; name: string };
	type GetUserFn = (id: number) => Promise<User | null>;

	// Define port
	const getUserPort = createPort<GetUserFn>();

	// Define adapter
	const getUserAdapter: GetUserFn = async (id) => {
		if (id === 1) {
			return { id: 1, name: "John Doe" };
		}
		return null;
	};

	// Bind
	setPortAdapter(getUserPort, getUserAdapter);

	// Use
	const getUser = usePort(getUserPort);

	// DEMONSTRATION: `getUser` is correctly typed as `(id: number) => Promise<User | null>`

	// Assert
	const user = await getUser(1);
	expect(user).toEqual({ id: 1, name: "John Doe" });

	const nonExistentUser = await getUser(2);
	expect(nonExistentUser).toBeNull();
});

test("usePort should throw if no adapter is set", () => {
	const myPort = createPort<() => void>();

	expect(() => {
		usePort(myPort);
	}).toThrow(
		"No implementation found for the port. Did you forget to call setPortAdapter() or setPortAdapterWithDependencies()?",
	);
});

test("setPortAdapter should throw if port is invalid or unregistered", () => {
	// Create a fake port that's not registered
	const fakePort = {
		__TYPE__: undefined as any,
		[Symbol("portId")]: "fake-id",
	};

	const adapter = () => {};

	expect(() => {
		setPortAdapter(fakePort, adapter);
	}).toThrow("An invalid or unregistered port was provided.");
});

test("usePort should throw if port is invalid or unregistered", () => {
	// Create a fake port that's not registered
	const fakePort = {
		__TYPE__: undefined as any,
		[Symbol("portId")]: "fake-id",
	};

	expect(() => {
		usePort(fakePort);
	}).toThrow("Attempted to use an invalid or unregistered port.");
});

test("should handle multiple ports with different implementations", () => {
	// Define first port and adapter
	const greeterPort = createPort<(name: string) => string>();
	const greeterAdapter = (name: string) => `Hello, ${name}!`;
	setPortAdapter(greeterPort, greeterAdapter);

	// Define second port and adapter
	const farewellPort = createPort<(name: string) => string>();
	const farewellAdapter = (name: string) => `Goodbye, ${name}!`;
	setPortAdapter(farewellPort, farewellAdapter);

	// Use both ports
	const greeterService = usePort(greeterPort);
	const farewellService = usePort(farewellPort);

	// Verify they work independently
	expect(greeterService("World")).toBe("Hello, World!");
	expect(farewellService("World")).toBe("Goodbye, World!");
});

test("should handle dependencies between services", () => {
	// Define a logger port
	const loggerPort = createPort<(message: string) => void>();
	const loggerAdapter = (message: string) => console.log(`LOG: ${message}`);
	setPortAdapter(loggerPort, loggerAdapter);

	// Define a service port as a function, not an object with methods
	const getUserPort =
		createPort<(id: number) => { id: number; name: string }>();

	// Create a factory that uses the logger service
	const getUserFactory = () => {
		const logger = usePort(loggerPort);
		return (id: number) => {
			logger(`Fetching user ${id}`);
			return { id, name: `User ${id}` };
		};
	};

	setPortAdapterWithDependencies(getUserPort, getUserFactory);

	// Use the service
	const getUser = usePort(getUserPort);
	const user = getUser(1);

	expect(user).toEqual({ id: 1, name: "User 1" });
});
