import { test, expect, beforeEach, describe } from "bun:test";
import { createPort, usePorts, resetDI } from "./di.v2";
import { defineFeature, FeaturePorts } from "./feature";
import { defineCore } from "./core";

// Reset DI container before each test for isolation
beforeEach(() => {
	resetDI();
});

// Mock User type
type User = { id: string; name: string };

// 1. Define Ports
const findUserPort = createPort<(id: string) => User | null>();
const saveUserPort = createPort<(user: User) => void>();

// 2. Define a Feature
const UserFeature = defineFeature({
	findUser: findUserPort,
		saveUser: saveUserPort,
});

// 3. Define an Adapter class that implements the feature's ports
class InMemoryUserAdapter implements FeaturePorts<typeof UserFeature> {
	private users: Map<string, User> = new Map();

	async findUser(id: string): Promise<User | null> {
		return this.users.get(id) || null;
	}

	async saveUser(user: User): Promise<void> {
		this.users.set(user.id, user);
	}
}

describe("Core Feature System", () => {
	test("should bind a feature and use its ports", async () => {
		// 4. Define the application core
		const core = defineCore({
			users: UserFeature,
		});

		// 5. Bind the feature to its implementation
		core.bindFeatures(({ users }) => {
			users.bind(InMemoryUserAdapter);
		});

		// 6. Use the ports in a simulated use case
		const [findUser, saveUser] = usePorts(findUserPort, saveUserPort);

		// 7. Assert initial state
		const userBeforeSave = await findUser("1");
		expect(userBeforeSave).toBeNull();

		// 8. Perform actions
		const newUser: User = { id: "1", name: "John Doe" };
		await saveUser(newUser);

		// 9. Assert final state
		const userAfterSave = await findUser("1");
		expect(userAfterSave).toEqual(newUser);
	});

	test("bindFeatures should throw if adapter is missing a method", () => {
		const core = defineCore({
			users: UserFeature,
		});

		// Adapter missing the 'saveUser' method
		class IncompleteUserAdapter {
			async findUser(id: string): Promise<User | null> {
				return null;
			}
		}

		expect(() => {
			core.bindFeatures(({ users }) => {
        // @ts-ignore - we are intentionally passing an incomplete adapter for testing
				users.bind(IncompleteUserAdapter);
			});
		}).toThrow("Adapter class for feature 'users' is missing method 'saveUser'.");
	});

    test("should handle multiple features", async () => {
        // Another feature for authentication
        const getAuthStatusPort = createPort<() => { loggedIn: boolean }>();
        const AuthFeature = defineFeature({
            getAuthStatus: getAuthStatusPort
        });

        class MockAuthAdapter implements FeaturePorts<typeof AuthFeature> {
            async getAuthStatus(): Promise<{ loggedIn: boolean }> {
                return { loggedIn: true };
            }
        }

        const core = defineCore({
            users: UserFeature,
            auth: AuthFeature,
        });

        core.bindFeatures(({ users, auth }) => {
            users.bind(InMemoryUserAdapter);
            auth.bind(MockAuthAdapter);
        });

        const [findUser, saveUser, getAuthStatus] = usePorts(findUserPort, saveUserPort, getAuthStatusPort);

        await saveUser({ id: '1', name: 'Jane' });

        const user = await findUser('1');
        const authStatus = await getAuthStatus();

        expect(user).toEqual({ id: '1', name: 'Jane' });
        expect(authStatus).toEqual({ loggedIn: true });
    });
});