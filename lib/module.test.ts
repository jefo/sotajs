import { describe, it, expect, beforeEach } from "bun:test";
import { createPort, setPortAdapter, resetDI } from "./di.v2";
import { createModule, useModule } from "./module";

// Reset DI container before each test
describe("Module", () => {
	beforeEach(() => {
		resetDI();
	});

	// Define some ports for testing
	const findUserPort = createPort<() => Promise<{ id: string; name: string }>>();
	const saveOrderPort = createPort<(order: { id: string; userId: string }) => Promise<void>>();
	const sendEmailPort = createPort<(email: { to: string; subject: string }) => Promise<void>>();

	it("should create a module from ports", () => {
		const orderModule = createModule({
			findUser: findUserPort,
			saveOrder: saveOrderPort,
			sendEmail: sendEmailPort
		});

		expect(orderModule).toBeDefined();
		expect(orderModule.findUser).toBe(findUserPort);
		expect(orderModule.saveOrder).toBe(saveOrderPort);
		expect(orderModule.sendEmail).toBe(sendEmailPort);
	});

	it("should not validate ports at creation time", () => {
		// Our implementation doesn't validate ports at creation time
		// Validation happens when useModule is called
		expect(() => {
			createModule({
				// @ts-ignore - intentionally passing invalid port for testing
				invalidPort: "not a port"
			});
		}).not.toThrow();
	});

	it("should retrieve all port implementations from a module", () => {
		// Set up adapters for the ports
		setPortAdapter(findUserPort, async () => ({ id: "1", name: "John Doe" }));
		setPortAdapter(saveOrderPort, async (order) => {
			// Save order logic
		});
		setPortAdapter(sendEmailPort, async (email) => {
			// Send email logic
		});

		// Create module
		const orderModule = createModule({
			findUser: findUserPort,
			saveOrder: saveOrderPort,
			sendEmail: sendEmailPort
		});

		// Use module to get implementations
		const { findUser, saveOrder, sendEmail } = useModule(orderModule);

		expect(findUser).toBeInstanceOf(Function);
		expect(saveOrder).toBeInstanceOf(Function);
		expect(sendEmail).toBeInstanceOf(Function);
	});

	it("should work with modules that have a single port", () => {
		// Set up adapter
		setPortAdapter(findUserPort, async () => ({ id: "1", name: "John Doe" }));

		// Create module with single port
		const userModule = createModule({
			findUser: findUserPort
		});

		// Use module
		const { findUser } = useModule(userModule);

		expect(findUser).toBeInstanceOf(Function);
	});
});