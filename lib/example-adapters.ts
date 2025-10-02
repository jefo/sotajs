// ============================================================================
// EXAMPLE ADAPTERS FOR CQRS APPROACH
//
// This file demonstrates how to implement adapters for ports in a SotaJS
// application using the CQRS approach. Adapters provide concrete implementations
// for the abstract port contracts.
// ============================================================================

import { loggerPort, cachePort } from "./example-ports";

// ============================================================================
// TEST ADAPTERS (Mock implementations for testing)
// ============================================================================

/**
 * Mock adapter for finding user by ID (test environment)
 */
export const mockFindUserById = async (input: { id: string }) => {
	console.log(`[MOCK] Finding user by ID: ${input.id}`);

	// Mock user data
	if (input.id === "test-user-123") {
		return {
			id: "test-user-123",
			name: "Test User",
			email: "test@example.com",
			status: "active" as const,
		};
	}

	return null;
};

/**
 * Mock adapter for saving user (test environment)
 */
export const mockSaveUser = async (input: any) => {
	console.log(`[MOCK] Saving user: ${input.id}`);
	// Mock save operation - just return success
	return;
};

/**
 * Mock adapter for finding orders by user ID (test environment)
 */
export const mockFindOrdersByUserId = async (input: { userId: string }) => {
	console.log(`[MOCK] Finding orders for user: ${input.userId}`);

	// Mock order data
	if (input.userId === "test-user-123") {
		return [
			{
				id: "order-001",
				userId: "test-user-123",
				status: "confirmed",
				total: 150.75,
				createdAt: new Date("2024-01-15"),
				updatedAt: new Date("2024-01-15"),
				items: [
					{
						productId: "prod-001",
						name: "Test Product",
						quantity: 2,
						price: 75.37,
					},
				],
			},
		];
	}

	return [];
};

/**
 * Mock adapter for getting user profile (test environment)
 */
export const mockGetUserProfile = async (input: { userId: string }) => {
	console.log(`[MOCK] Getting profile for user: ${input.userId}`);

	if (input.userId === "test-user-123") {
		return {
			id: "test-user-123",
			name: "Test User",
			email: "test@example.com",
			profile: {
				avatar: "https://example.com/avatar.jpg",
				bio: "Test user bio",
				preferences: { theme: "dark", notifications: true },
			},
			statistics: {
				totalOrders: 5,
				totalSpent: 753.25,
				lastOrderDate: new Date("2024-01-15"),
			},
		};
	}

	return null;
};

// ============================================================================
// DEVELOPMENT ADAPTERS (In-memory implementations)
// ============================================================================

// In-memory storage for development
const devUsers = new Map<string, any>();
const devOrders = new Map<string, any>();

/**
 * Development adapter for finding user by ID (in-memory storage)
 */
export const devFindUserById = async (input: { id: string }) => {
	console.log(`[DEV] Finding user by ID: ${input.id}`);
	return devUsers.get(input.id) || null;
};

/**
 * Development adapter for saving user (in-memory storage)
 */
export const devSaveUser = async (input: any) => {
	console.log(`[DEV] Saving user: ${input.id}`);
	devUsers.set(input.id, { ...input, updatedAt: new Date() });
};

/**
 * Development adapter for finding orders by user ID (in-memory storage)
 */
export const devFindOrdersByUserId = async (input: { userId: string }) => {
	console.log(`[DEV] Finding orders for user: ${input.userId}`);

	const userOrders = Array.from(devOrders.values()).filter(
		(order) => order.userId === input.userId,
	);

	return userOrders.sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Development adapter for getting user profile (in-memory storage)
 */
export const devGetUserProfile = async (input: { userId: string }) => {
	console.log(`[DEV] Getting profile for user: ${input.userId}`);

	const user = devUsers.get(input.userId);
	if (!user) return null;

	const orders = await devFindOrdersByUserId(input);

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		profile: user.profile || {
			preferences: { theme: "light", notifications: true },
		},
		statistics: {
			totalOrders: orders.length,
			totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
			lastOrderDate: orders[0]?.createdAt,
		},
	};
};

// ============================================================================
// PRODUCTION ADAPTERS (Real implementations)
// ============================================================================

/**
 * Production adapter for finding user by ID (database implementation)
 */
export const prodFindUserById = async (input: { id: string }) => {
	console.log(`[PROD] Finding user by ID in database: ${input.id}`);

	// In a real implementation, this would query the database
	// Example with a hypothetical database client:
	// const result = await db.user.findUnique({ where: { id: input.id } });

	// Mock database response
	if (input.id === "user-123") {
		return {
			id: "user-123",
			name: "Production User",
			email: "user@example.com",
			status: "active" as const,
		};
	}

	return null;
};

/**
 * Production adapter for saving user (database implementation)
 */
export const prodSaveUser = async (input: any) => {
	console.log(`[PROD] Saving user to database: ${input.id}`);

	// In a real implementation, this would save to the database
	// Example with a hypothetical database client:
	// await db.user.upsert({
	//   where: { id: input.id },
	//   update: input,
	//   create: input,
	// });
};

/**
 * Production adapter for finding orders by user ID (database implementation)
 */
export const prodFindOrdersByUserId = async (input: { userId: string }) => {
	console.log(`[PROD] Finding orders for user in database: ${input.userId}`);

	// In a real implementation, this would query the database
	// Example:
	// const orders = await db.order.findMany({
	//   where: { userId: input.userId },
	//   include: { items: true },
	//   orderBy: { createdAt: 'desc' },
	// });

	// Mock database response
	if (input.userId === "user-123") {
		return [
			{
				id: "order-prod-001",
				userId: "user-123",
				status: "confirmed",
				total: 299.99,
				createdAt: new Date("2024-01-20"),
				updatedAt: new Date("2024-01-20"),
				items: [
					{
						productId: "prod-002",
						name: "Premium Product",
						quantity: 1,
						price: 299.99,
					},
				],
			},
		];
	}

	return [];
};

/**
 * Production adapter for getting user profile (database implementation)
 */
export const prodGetUserProfile = async (input: { id: string }) => {
	console.log(`[PROD] Getting profile for user from database: ${input.id}`);

	const user = await prodFindUserById({ id: input.id });
	if (!user) return null;

	const orders = await prodFindOrdersByUserId({ userId: input.id });

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		profile: {
			preferences: { theme: "system", notifications: true },
		},
		statistics: {
			totalOrders: orders.length,
			totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
			lastOrderDate: orders[0]?.createdAt,
		},
	};
};

// ============================================================================
// UTILITY ADAPTERS (Cross-cutting concerns)
// ============================================================================

/**
 * Console logger adapter
 */
export const consoleLoggerAdapter = async (input: {
	level: "info" | "warn" | "error";
	message: string;
	context?: Record<string, any>;
}) => {
	const timestamp = new Date().toISOString();
	const contextStr = input.context ? ` ${JSON.stringify(input.context)}` : "";

	switch (input.level) {
		case "error":
			console.error(`[${timestamp}] ERROR: ${input.message}${contextStr}`);
			break;
		case "warn":
			console.warn(`[${timestamp}] WARN: ${input.message}${contextStr}`);
			break;
		default:
			console.log(`[${timestamp}] INFO: ${input.message}${contextStr}`);
	}
};

/**
 * Memory cache adapter
 */
const memoryCache = new Map<string, { value: any; expires: number }>();

export const memoryCacheAdapter = async (input: {
	operation: "get" | "set" | "delete";
	key: string;
	value?: any;
	ttl?: number;
}) => {
	const now = Date.now();

	switch (input.operation) {
		case "get":
			const cached = memoryCache.get(input.key);
			if (cached && cached.expires > now) {
				return cached.value;
			}
			// Remove expired entry
			if (cached && cached.expires <= now) {
				memoryCache.delete(input.key);
			}
			return null;

		case "set":
			const expires = input.ttl ? now + input.ttl * 1000 : now + 3600 * 1000; // Default 1 hour
			memoryCache.set(input.key, { value: input.value, expires });
			return input.value;

		case "delete":
			memoryCache.delete(input.key);
			return true;
	}
};

/**
 * Zod validation adapter
 */
export const zodValidatorAdapter = async (input: {
	schema: any;
	data: any;
}) => {
	try {
		const result = input.schema.parse(input.data);
		return { valid: true, data: result };
	} catch (error: any) {
		return {
			valid: false,
			errors: error.errors?.map((err: any) => ({
				path: err.path.join("."),
				message: err.message,
			})) || [{ path: "unknown", message: error.message }],
		};
	}
};

// ============================================================================
// ADAPTER GROUPS (For easy composition)
// ============================================================================

/**
 * Test environment adapters
 */
export const testAdapters = {
	findUserById: mockFindUserById,
	saveUser: mockSaveUser,
	findOrdersByUserId: mockFindOrdersByUserId,
	getUserProfile: mockGetUserProfile,
	logger: consoleLoggerAdapter,
	cache: memoryCacheAdapter,
	validator: zodValidatorAdapter,
} as const;

/**
 * Development environment adapters
 */
export const developmentAdapters = {
	findUserById: devFindUserById,
	saveUser: devSaveUser,
	findOrdersByUserId: devFindOrdersByUserId,
	getUserProfile: devGetUserProfile,
	logger: consoleLoggerAdapter,
	cache: memoryCacheAdapter,
	validator: zodValidatorAdapter,
} as const;

/**
 * Production environment adapters
 */
export const productionAdapters = {
	findUserById: prodFindUserById,
	saveUser: prodSaveUser,
	findOrdersByUserId: prodFindOrdersByUserId,
	getUserProfile: prodGetUserProfile,
	logger: consoleLoggerAdapter,
	cache: memoryCacheAdapter,
	validator: zodValidatorAdapter,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get adapters for a specific environment
 */
export const getAdaptersForEnvironment = (
	environment: "test" | "development" | "production",
) => {
	switch (environment) {
		case "test":
			return testAdapters;
		case "development":
			return developmentAdapters;
		case "production":
			return productionAdapters;
		default:
			throw new Error(`Unknown environment: ${environment}`);
	}
};

/**
 * Initialize development data (for demo purposes)
 */
export const initializeDevelopmentData = () => {
	// Add some sample users
	devUsers.set("dev-user-001", {
		id: "dev-user-001",
		name: "Development User",
		email: "dev@example.com",
		status: "active",
		profile: {
			avatar: "https://example.com/dev-avatar.jpg",
			bio: "Development user for testing",
			preferences: { theme: "dark", notifications: true },
		},
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	// Add some sample orders
	devOrders.set("dev-order-001", {
		id: "dev-order-001",
		userId: "dev-user-001",
		status: "confirmed",
		total: 199.99,
		createdAt: new Date("2024-01-10"),
		updatedAt: new Date("2024-01-10"),
		items: [
			{
				productId: "dev-prod-001",
				name: "Development Product",
				quantity: 1,
				price: 199.99,
			},
		],
	});

	console.log("✅ Development data initialized");
};
