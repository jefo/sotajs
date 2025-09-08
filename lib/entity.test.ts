import { describe, it, expect } from "bun:test";
import { z } from "zod";
import { createEntity } from "./entity";

// Define a simple schema for testing
const UserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	email: z.string().email(),
	isActive: z.boolean().default(true),
});
type UserProps = z.infer<typeof UserSchema>;

// Create the Entity class with Immer-based actions
const User = createEntity({
	schema: UserSchema,
	actions: {
		updateName: (state: UserProps, newName: string) => {
			state.name = newName;
		},
		updateEmail: (state: UserProps, newEmail: string) => {
			// In a real scenario, you might add email validation here
			state.email = newEmail;
		},
		deactivate: (state: UserProps) => {
			state.isActive = false;
		},
	},
});

describe("createEntity with Immer", () => {
	const validUserData: UserProps = {
		id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		name: "John Doe",
		email: "john.doe@example.com",
		isActive: true,
	};

	it("should create an Entity instance with valid data", () => {
		const user = User.create(validUserData);
		expect(user).toBeInstanceOf(User);
		expect(user.id).toBe(validUserData.id);
		expect(user.state.name).toBe("John Doe");
	});

	it("should throw an error if initial data violates the schema", () => {
		const invalidData = { ...validUserData, email: "invalid-email" };
		expect(() => User.create(invalidData)).toThrow();
	});

	it("should allow state modification through actions and maintain immutability", () => {
		const user = User.create(validUserData);
		const originalState = user.state;

		user.actions.updateName("Jane Doe");
		const afterNameUpdateState = user.state;

		expect(afterNameUpdateState.name).toBe("Jane Doe");
		expect(afterNameUpdateState).not.toBe(originalState);
		expect(originalState.name).toBe("John Doe");

		user.actions.deactivate();
		const afterDeactivateState = user.state;

		expect(afterDeactivateState.isActive).toBe(false);
		expect(afterDeactivateState).not.toBe(afterNameUpdateState);
		expect(afterNameUpdateState.isActive).toBe(true);
	});

	it("should ensure immutability of the returned state object", () => {
		const user = User.create(validUserData);
		const state = user.state;

		expect(() => {
			(state as any).name = "Attempted Change";
		}).toThrow(); // In strict mode, this will be a TypeError

		expect(user.state.name).toBe("John Doe"); // Original state should be unchanged
	});

	it("should correctly check for identity equality", () => {
		const user1 = User.create(validUserData);
		const user2 = User.create(validUserData); // Same ID, different instance
		const user3 = User.create({ ...validUserData, id: 'a1b2c3d4-e5f6-4890-8234-567890abcdef' }); // Different ID

		expect(user1.equals(user2)).toBe(true);
		expect(user1.equals(user3)).toBe(false);
	});
});