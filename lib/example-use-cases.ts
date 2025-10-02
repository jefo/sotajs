// ============================================================================
// EXAMPLE USE CASES FOR CQRS APPROACH
//
// This file demonstrates how to implement commands and queries in a SotaJS
// application using the CQRS approach.
// ============================================================================

import { z } from "zod";
import { usePort } from "./di.v2";
import {
	findUserByIdPort,
	saveUserPort,
	createOrderPort,
	findOrdersByUserIdPort,
	getUserProfilePort,
	sendNotificationPort,
	loggerPort,
} from "./example-ports";

// ============================================================================
// COMMAND USE CASES (State-changing operations)
// ============================================================================

/**
 * Create Order Command
 * Creates a new order for a user
 */
const CreateOrderInputSchema = z.object({
	userId: z.string().uuid(),
	items: z.array(
		z.object({
			productId: z.string().uuid(),
			quantity: z.number().positive(),
			price: z.number().positive().optional(),
		}),
	),
});

type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

type CreateOrderResult = {
	success: boolean;
	orderId?: string;
	total?: number;
	error?: string;
};

export const createOrderCommand = async (
	input: CreateOrderInput,
): Promise<CreateOrderResult> => {
	try {
		const command = CreateOrderInputSchema.parse(input);

		// Get dependencies
		const findUserById = usePort(findUserByIdPort);
		const createOrder = usePort(createOrderPort);
		const sendNotification = usePort(sendNotificationPort);
		const logger = usePort(loggerPort);

		// Validate user exists
		const user = await findUserById({ id: command.userId });
		if (!user) {
			await logger({
				level: "warn",
				message: `User not found: ${command.userId}`,
				context: { userId: command.userId },
			});

			return {
				success: false,
				error: "User not found",
			};
		}

		// Calculate total
		const total = command.items.reduce(
			(sum, item) => sum + (item.price || 0) * item.quantity,
			0,
		);

		// Create order with default prices if not provided
		const itemsWithPrices = command.items.map((item) => ({
			...item,
			price: item.price || 0, // Default price if not provided
		}));

		const orderResult = await createOrder({
			userId: command.userId,
			items: itemsWithPrices,
			total,
			status: "pending",
		});

		// Send notification
		await sendNotification({
			userId: command.userId,
			type: "order_created",
			message: `Your order #${orderResult.orderId} has been created`,
		});

		await logger({
			level: "info",
			message: `Order created successfully: ${orderResult.orderId}`,
			context: { orderId: orderResult.orderId, userId: command.userId, total },
		});

		return {
			success: true,
			orderId: orderResult.orderId,
			total,
		};
	} catch (error: any) {
		const logger = usePort(loggerPort);

		await logger({
			level: "error",
			message: "Failed to create order",
			context: { error: error.message, input },
		});

		return {
			success: false,
			error: error.message || "Failed to create order",
		};
	}
};

/**
 * Update User Profile Command
 * Updates user profile information
 */
const UpdateUserProfileInputSchema = z.object({
	userId: z.string().uuid(),
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	profile: z
		.object({
			avatar: z.string().url().optional(),
			bio: z.string().max(500).optional(),
			preferences: z.record(z.any()).optional(),
		})
		.optional(),
});

type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileInputSchema>;

type UpdateUserProfileResult = {
	success: boolean;
	error?: string;
};

export const updateUserProfileCommand = async (
	input: UpdateUserProfileInput,
): Promise<UpdateUserProfileResult> => {
	try {
		const command = UpdateUserProfileInputSchema.parse(input);

		const findUserById = usePort(findUserByIdPort);
		const saveUser = usePort(saveUserPort);
		const logger = usePort(loggerPort);

		// Get existing user
		const existingUser = await findUserById({ id: command.userId });
		if (!existingUser) {
			return {
				success: false,
				error: "User not found",
			};
		}

		// Update user data
		const updatedUser = {
			...existingUser,
			...(command.name && { name: command.name }),
			...(command.email && { email: command.email }),
			updatedAt: new Date(),
			profile: command.profile || {},
			createdAt: (existingUser as any).createdAt || new Date(),
		};

		await saveUser(updatedUser);

		await logger({
			level: "info",
			message: `User profile updated: ${command.userId}`,
			context: { userId: command.userId, updates: command },
		});

		return { success: true };
	} catch (error: any) {
		const logger = usePort(loggerPort);

		await logger({
			level: "error",
			message: "Failed to update user profile",
			context: { error: error.message, input },
		});

		return {
			success: false,
			error: error.message || "Failed to update user profile",
		};
	}
};

// ============================================================================
// QUERY USE CASES (Data-reading operations)
// ============================================================================

/**
 * Get User Orders Query
 * Retrieves orders for a specific user
 */
const GetUserOrdersInputSchema = z.object({
	userId: z.string().uuid(),
	limit: z.number().positive().max(100).default(10),
	offset: z.number().nonnegative().default(0),
});

type GetUserOrdersInput = z.infer<typeof GetUserOrdersInputSchema>;

type OrderDto = {
	id: string;
	status: string;
	total: number;
	createdAt: string;
	updatedAt: string;
	itemCount: number;
};

type GetUserOrdersResult = {
	orders: OrderDto[];
	totalCount: number;
	hasMore: boolean;
};

export const getUserOrdersQuery = async (
	input: GetUserOrdersInput,
): Promise<GetUserOrdersResult> => {
	try {
		const query = GetUserOrdersInputSchema.parse(input);

		const findOrdersByUserId = usePort(findOrdersByUserIdPort);
		const logger = usePort(loggerPort);

		const orders = await findOrdersByUserId({ userId: query.userId });

		// Apply pagination
		const paginatedOrders = orders.slice(
			query.offset,
			query.offset + query.limit,
		);

		const result = {
			orders: paginatedOrders.map((order) => ({
				id: order.id,
				status: order.status,
				total: order.total,
				createdAt: order.createdAt.toISOString(),
				updatedAt: order.updatedAt.toISOString(),
				itemCount: order.items.length,
			})),
			totalCount: orders.length,
			hasMore: query.offset + query.limit < orders.length,
		};

		await logger({
			level: "info",
			message: `Retrieved orders for user: ${query.userId}`,
			context: {
				userId: query.userId,
				orderCount: result.orders.length,
				totalCount: result.totalCount,
			},
		});

		return result;
	} catch (error: any) {
		const logger = usePort(loggerPort);

		await logger({
			level: "error",
			message: "Failed to get user orders",
			context: { error: error.message, input },
		});

		// Return empty result on error
		return {
			orders: [],
			totalCount: 0,
			hasMore: false,
		};
	}
};

/**
 * Get User Profile Query
 * Retrieves complete user profile with statistics
 */
const GetUserProfileInputSchema = z.object({
	userId: z.string().uuid(),
});

type GetUserProfileInput = z.infer<typeof GetUserProfileInputSchema>;

type UserProfileDto = {
	id: string;
	name: string;
	email: string;
	status: string;
	profile: {
		avatar?: string;
		bio?: string;
		preferences: Record<string, any>;
	};
	statistics: {
		totalOrders: number;
		totalSpent: number;
		averageOrderValue: number;
		lastOrderDate?: string;
	};
	createdAt: string;
	updatedAt: string;
};

type GetUserProfileResult = {
	user?: UserProfileDto;
	error?: string;
};

export const getUserProfileQuery = async (
	input: GetUserProfileInput,
): Promise<GetUserProfileResult> => {
	try {
		const query = GetUserProfileInputSchema.parse(input);

		const getUserProfile = usePort(getUserProfilePort);
		const logger = usePort(loggerPort);

		const userProfile = await getUserProfile({ userId: query.userId });

		if (!userProfile) {
			await logger({
				level: "warn",
				message: `User profile not found: ${query.userId}`,
				context: { userId: query.userId },
			});

			return { error: "User not found" };
		}

		const result = {
			user: {
				id: userProfile.id,
				name: userProfile.name,
				email: userProfile.email,
				status: "active", // Default status since it's not in the profile type
				profile: userProfile.profile,
				statistics: {
					totalOrders: userProfile.statistics.totalOrders,
					totalSpent: userProfile.statistics.totalSpent,
					averageOrderValue:
						userProfile.statistics.totalSpent /
						Math.max(userProfile.statistics.totalOrders, 1),
					lastOrderDate: userProfile.statistics.lastOrderDate?.toISOString(),
				},
				createdAt: new Date().toISOString(), // Would come from user entity in real implementation
				updatedAt: new Date().toISOString(),
			},
		};

		await logger({
			level: "info",
			message: `Retrieved user profile: ${query.userId}`,
			context: { userId: query.userId },
		});

		return result;
	} catch (error: any) {
		const logger = usePort(loggerPort);

		await logger({
			level: "error",
			message: "Failed to get user profile",
			context: { error: error.message, input },
		});

		return { error: error.message || "Failed to get user profile" };
	}
};

/**
 * Search Products Query
 * Searches products with filtering and pagination
 */
const SearchProductsInputSchema = z.object({
	query: z.string().min(1).max(100),
	category: z.string().optional(),
	minPrice: z.number().nonnegative().optional(),
	maxPrice: z.number().nonnegative().optional(),
	inStock: z.boolean().optional(),
	limit: z.number().positive().max(50).default(20),
	offset: z.number().nonnegative().default(0),
});

type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

// This would use a search port in a real implementation
// For now, we'll simulate the search
export const searchProductsQuery = async (
	input: SearchProductsInput,
): Promise<any> => {
	const query = SearchProductsInputSchema.parse(input);
	const logger = usePort(loggerPort);

	// Simulate search operation
	await new Promise((resolve) => setTimeout(resolve, 100));

	const mockResults = {
		products: [
			{
				id: "prod-001",
				name: `Search result for "${query.query}"`,
				description: "Product description",
				price: 99.99,
				category: query.category || "general",
				inStock: true,
				rating: 4.5,
			},
		],
		totalCount: 1,
		hasMore: false,
	};

	await logger({
		level: "info",
		message: `Product search executed: "${query.query}"`,
		context: {
			query: query.query,
			category: query.category,
			resultCount: mockResults.products.length,
		},
	});

	return mockResults;
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
	CreateOrderInput,
	CreateOrderResult,
	UpdateUserProfileInput,
	UpdateUserProfileResult,
	GetUserOrdersInput,
	GetUserOrdersResult,
	GetUserProfileInput,
	GetUserProfileResult,
	SearchProductsInput,
};

// ============================================================================
// USE CASE GROUPS (For better organization)
// ============================================================================

/**
 * User-related use cases
 */
export const userUseCases = {
	commands: {
		updateProfile: updateUserProfileCommand,
	},
	queries: {
		getProfile: getUserProfileQuery,
	},
} as const;

/**
 * Order-related use cases
 */
export const orderUseCases = {
	commands: {
		create: createOrderCommand,
	},
	queries: {
		getOrders: getUserOrdersQuery,
	},
} as const;

/**
 * Product-related use cases
 */
export const productUseCases = {
	queries: {
		search: searchProductsQuery,
	},
} as const;

/**
 * Complete use case registry
 */
export const useCaseRegistry = {
	user: userUseCases,
	order: orderUseCases,
	product: productUseCases,
} as const;
