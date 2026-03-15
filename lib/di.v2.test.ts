import { test, expect, beforeEach, describe } from "bun:test";
import {
	createPort,
	setPortAdapter,
	usePort,
	resetDI,
	setPortAdapters,
	usePorts,
} from "./di.v2";

// 1. Reset DI container before each test for isolation
beforeEach(() => {
	resetDI();
});

test("should register and resolve a simple service with async adapter", async () => {
	// 2. Define a Port with a simple function signature (no Promise)
	const greeterPort = createPort<(name: string) => string>();

	// 3. Define an async Adapter (implementation)
	const greeterAdapter = async (name: string) => `Hello, ${name}!`;

	// 4. Bind the adapter to the port
	setPortAdapter(greeterPort, greeterAdapter);

	// 5. Use the port to get the adapter implementation
	const greeterService = usePort(greeterPort);

	// DEMONSTRATION: `greeterService` is now correctly typed as `(name: string) => Promise<string>`

	// 6. Call the service and assert the result
	const result = await greeterService("World");
	expect(result).toBe("Hello, World!");
});

test("should handle services with complex types (objects and promises)", async () => {
	type User = { id: number; name: string };
	// The signature is now simpler, without the outer Promise
	type GetUserFn = (id: number) => User | null;

	// Define port
	const getUserPort = createPort<GetUserFn>();

	// Define adapter - it must be async or return a promise
	const getUserAdapter = async (id: number): Promise<User | null> => {
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
	}).toThrow(/Adapter for port.*not set/);
});

test("should handle multiple ports with different implementations", async () => {
	// Define first port and adapter
	const greeterPort = createPort<(name: string) => string>();
	const greeterAdapter = async (name: string) => `Hello, ${name}!`;
	setPortAdapter(greeterPort, greeterAdapter);

	// Define second port and adapter
	const farewellPort = createPort<(name: string) => string>();
	const farewellAdapter = async (name: string) => `Goodbye, ${name}!`;
	setPortAdapter(farewellPort, farewellAdapter);

	// Use both ports
	const greeterService = usePort(greeterPort);
	const farewellService = usePort(farewellPort);

	// Verify they work independently
	expect(await greeterService("World")).toBe("Hello, World!");
	expect(await farewellService("World")).toBe("Goodbye, World!");
});

test("should handle dependencies between services", async () => {
	// Define a logger port
	const loggerPort = createPort<(message: string) => void>();
	const logMessages: string[] = [];
	const loggerAdapter = async (message: string) => {
		logMessages.push(message);
	};
	setPortAdapter(loggerPort, loggerAdapter);

	// Define a service port
	const getUserPort =
		createPort<(id: number) => { id: number; name: string }>();

	// Create a factory that returns an async adapter
	const getUserFactory = () => {
		const logger = usePort(loggerPort);
		return async (id: number) => {
			await logger(`Fetching user ${id}`);
			return { id, name: `User ${id}` };
		};
	};

	// Bind the factory's result (the adapter) to the port
	setPortAdapter(getUserPort, getUserFactory());

	// Use the service
	const getUser = usePort(getUserPort);
	const user = await getUser(1);

	expect(user).toEqual({ id: 1, name: "User 1" });
	expect(logMessages).toContain("Fetching user 1");
});

describe("setPortAdapters", () => {
	test("should bind multiple adapters at once", async () => {
		const portA = createPort<() => string>();
		const portB = createPort<(n: number) => number>();

		const adapterA = async () => "A";
		const adapterB = async (n: number) => n * 2;

		setPortAdapters([
			[portA, adapterA],
			[portB, adapterB],
		]);

		const serviceA = usePort(portA);
		const serviceB = usePort(portB);

		expect(await serviceA()).toBe("A");
		expect(await serviceB(10)).toBe(20);
	});
});

describe("usePorts (array-based)", () => {
	test("should resolve multiple ports in the correct order", async () => {
		const portA = createPort<() => string>();
		const portB = createPort<(n: number) => number>();
		const portC = createPort<() => boolean>();

		setPortAdapters([
			[portA, async () => "A"],
			[portB, async (n: number) => n * 2],
			[portC, async () => true],
		]);

		const [serviceA, serviceB, serviceC] = usePorts(portA, portB, portC);

		expect(await serviceA()).toBe("A");
		expect(await serviceB(10)).toBe(20);
		expect(await serviceC()).toBe(true);
	});
});
