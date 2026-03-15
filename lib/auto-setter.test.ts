import { describe, it, expect } from "bun:test";
import { z } from "zod";
import { createEntity } from "./entity";

// Define a simple schema for testing
const UserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	email: z.string().email(),
	age: z.number().min(0).max(120),
	isActive: z.boolean().default(true),
});
type UserProps = z.infer<typeof UserSchema>;

// Create the Entity class (auto-setters are always enabled)
const User = createEntity({
	schema: UserSchema,
	actions: {
		deactivate: (state) => {
			state.isActive = false;
		},
	},
	computed: {
		displayName: (props: UserProps) => `${props.name} (${props.email})`,
	},
});

describe("createEntity with auto-setters", () => {
	const validUserData = {
		id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		name: "John Doe",
		email: "john.doe@example.com",
		age: 30,
		isActive: true,
	};

	it("should create an Entity instance with valid data", () => {
		const user = User.create(validUserData);
		expect(user).toBeInstanceOf(User);
		expect(user.id).toBe(validUserData.id);
		expect(user.props.name).toBe("John Doe");
	});

	it("should have auto-generated setter actions", () => {
		const user = User.create(validUserData);

		// Check that auto-setters exist
		expect(typeof user.actions.setName).toBe("function");
		expect(typeof user.actions.setEmail).toBe("function");
		expect(typeof user.actions.setAge).toBe("function");
		expect(typeof user.actions.setIsActive).toBe("function");

		// The id should not have a setter
		expect(typeof user.actions.setId).toBe("undefined");
	});

	it("should allow updating properties using auto-generated setters", () => {
		const user = User.create(validUserData);

		// Update name using auto-generated setter
		user.actions.setName("Jane Doe");
		expect(user.props.name).toBe("Jane Doe");

		// Update email using auto-generated setter
		user.actions.setEmail("jane.doe@example.com");
		expect(user.props.email).toBe("jane.doe@example.com");

		// Update age using auto-generated setter
		user.actions.setAge(25);
		expect(user.props.age).toBe(25);

		// Update isActive using auto-generated setter
		user.actions.setIsActive(false);
		expect(user.props.isActive).toBe(false);
	});

	it("should validate property updates with auto-generated setters", () => {
		const user = User.create(validUserData);

		// Try to set invalid email - should throw validation error
		expect(() => {
			user.actions.setEmail("invalid-email");
		}).toThrow();

		// Try to set invalid age - should throw validation error
		expect(() => {
			user.actions.setAge(-5);
		}).toThrow();

		// Try to set empty name - should throw validation error
		expect(() => {
			user.actions.setName("");
		}).toThrow();

		// Properties should remain unchanged after failed validations
		expect(user.props.name).toBe("John Doe");
		expect(user.props.email).toBe("john.doe@example.com");
		expect(user.props.age).toBe(30);
	});

	it("should work with both custom actions and auto-setters", () => {
		const user = User.create(validUserData);

		// Use custom action
		user.actions.deactivate();
		expect(user.props.isActive).toBe(false);

		// Use auto-setter
		user.actions.setAge(35);
		expect(user.props.age).toBe(35);
	});

	it("should correctly calculate and access computed properties after auto-setter updates", () => {
		const user = User.create(validUserData);

		// Check initial computed value
		expect(user.displayName).toBe("John Doe (john.doe@example.com)");

		// Update name using auto-generated setter
		user.actions.setName("Jane Doe");

		// Check if computed value updated
		expect(user.displayName).toBe("Jane Doe (john.doe@example.com)");

		// Update email using auto-generated setter
		user.actions.setEmail("jane@example.com");

		// Check if computed value updated again
		expect(user.displayName).toBe("Jane Doe (jane@example.com)");
	});
});
