import { describe, it, expect } from "bun:test";
import { z } from "zod";
import { createAggregate } from "./aggregate";
import { createEntity } from "./entity"; // Import createEntity

// --- Test Setup ---

// 1. Define a sample event
class OrderPaidEvent {
	constructor(
		public readonly aggregateId: string,
		public readonly timestamp = new Date(),
	) {}
}

// 2. Define a sample Form entity for composition testing
const FormSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
});
type FormState = z.infer<typeof FormSchema>;

const Form = createEntity({
	schema: FormSchema,
	actions: {
		setTitle: (state: FormState, newTitle: string) => {
			state.title = newTitle;
		},
	},
});

// 3. Define the schema for our main test aggregate
const OrderSchema = z.object({
	id: z.string().uuid(),
	status: z.enum(["pending", "paid", "shipped"]),
	amount: z.number(),
	form: FormSchema, // Embed the form schema
});
type OrderState = z.infer<typeof OrderSchema>;

// 4. Define the aggregate using the new `entities` config
const Order = createAggregate({
	name: "Order",
	schema: OrderSchema,
	entities: {
		form: Form, // Map the 'form' property to the Form entity class
	},
	invariants: [
		(state) => {
			if (state.amount <= 0) {
				throw new Error("Order amount must be positive.");
			}
		},
	],
	actions: {
		// The `state` here is now the HYDRATED state
		pay: (state, paymentMethod: string) => {
			if (state.status !== "pending") {
				throw new Error("Only pending orders can be paid.");
			}
			console.log(`Paid with ${paymentMethod}`);
			state.status = "paid";
			return {
				event: new OrderPaidEvent(state.id),
			};
		},
		ship: (state) => {
			if (state.status !== "paid") {
				throw new Error("Only paid orders can be shipped.");
			}
			state.status = "shipped";
		},
		// New action to demonstrate entity interaction
		changeFormTitle: (state, newTitle: string) => {
			// `state.form` is an instance of Form, so we can call its actions
			state.form.actions.setTitle(newTitle);
		},
	},
	computed: {
		isPaid: (state) => state.status === "paid",
	},
});

// --- Tests ---

describe("createAggregate with Immer", () => {
	const validOrderData = {
		id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		status: "pending" as const,
		amount: 100,
		form: {
			id: "a1b2c3d4-e5f6-4890-9234-567890abcdef",
			title: "Initial Title",
		},
	};

	it("should create an aggregate instance with valid data", () => {
		const order = Order.create(validOrderData);
		expect(order).toBeInstanceOf(Order);
		expect(order.state.status).toBe("pending");
	});

	it("should throw an error if initial data violates the schema", () => {
		const invalidData = { ...validOrderData, amount: "not-a-number" };
		expect(() => Order.create(invalidData)).toThrow();
	});

	it("should successfully execute an action and change state", () => {
		const order = Order.create(validOrderData);
		const originalState = order.state;

		order.actions.pay("credit-card");

		const newState = order.state;
		expect(newState.status).toBe("paid");
		// Verify immutability
		expect(newState).not.toBe(originalState);
		expect(originalState.status).toBe("pending");
	});

	it("should collect domain events when an action is executed", () => {
		const order = Order.create(validOrderData);
		order.actions.pay("credit-card");
		const events = order.getPendingEvents();
		expect(events).toHaveLength(1);
		expect(events[0]).toBeInstanceOf(OrderPaidEvent);
		expect(events[0].aggregateId).toBe(validOrderData.id);
	});

	it("getPendingEvents should clear the event queue", () => {
		const order = Order.create(validOrderData);
		order.actions.pay("credit-card");

		// First call gets the event
		expect(order.getPendingEvents()).toHaveLength(1);
		// Second call gets nothing because the queue was cleared
		expect(order.getPendingEvents()).toHaveLength(0);
	});

	it("clearEvents should clear the event queue", () => {
		const order = Order.create(validOrderData);
		order.actions.pay("credit-card");
		order.clearEvents(); // Explicitly clear the queue
		const subsequentEvents = order.getPendingEvents();
		expect(subsequentEvents).toHaveLength(0);
	});

	it("should throw an error if an action's precondition is not met", () => {
		const paidOrderData = { ...validOrderData, status: "paid" as const };
		const order = Order.create(paidOrderData);
		expect(() => order.actions.pay("credit-card")).toThrow(
			"Only pending orders can be paid.",
		);
	});

	it("should correctly calculate and access computed properties", () => {
		const order = Order.create(validOrderData);

		// 1. Check initial computed values
		expect(order.isPaid).toBe(false);

		// 2. Execute an action to change the state
		order.actions.pay("credit-card");

		// 3. Check if computed value updated
		expect(order.isPaid).toBe(true);
	});

	describe("with nested entities", () => {
		it("should hydrate entities on creation", () => {
			const order = Order.create(validOrderData);
			// The internal `form` property should be an instance of Form, not a plain object.
			// We can't access it directly, but we can verify its behavior through actions.
			// The public `state` should still be a plain object.
			expect(order.state.form.title).toBe("Initial Title");
			expect(order.state.form).not.toBeInstanceOf(Form);
		});

		it("should allow actions to call methods on nested entities", () => {
			const order = Order.create(validOrderData);
			order.actions.changeFormTitle("New Form Title");

			const newState = order.state;
			expect(newState.form.title).toBe("New Form Title");
		});

		it("should dehydrate entities when accessing public state", () => {
			const order = Order.create(validOrderData);
			const state = order.state;

			// The returned state should be a plain object, not containing entity instances.
			expect(state.form).not.toBeInstanceOf(Form);
			expect(state.form.title).toBe("Initial Title");
		});
	});
});
