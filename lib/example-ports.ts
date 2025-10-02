// ============================================================================
// EXAMPLE PORTS FOR CQRS APPROACH
//
// This file demonstrates how to define ports (contracts) for commands and queries
// in a SotaJS application using the CQRS approach.
// ============================================================================

import { createPort } from "./di.v2";

// ============================================================================
// COMMAND PORTS (State-changing operations)
// ============================================================================

/**
 * Port for finding a user by ID (used in commands)
 */
export const findUserByIdPort =
	createPort<
		(input: { id: string }) => Promise<{
			id: string;
			name: string;
			email: string;
			status: "active" | "inactive";
		} | null>
	>();

/**
 * Port for saving a user entity
 */
export const saveUserPort =
	createPort<
		(input: {
			id: string;
			name: string;
			email: string;
			status: "active" | "inactive";
			createdAt: Date;
			updatedAt: Date;
		}) => Promise<void>
	>();

/**
 * Port for creating an order
 */
export const createOrderPort =
	createPort<
		(input: {
			userId: string;
			items: Array<{
				productId: string;
				quantity: number;
				price: number;
			}>;
			total: number;
			status: "pending" | "confirmed" | "shipped" | "delivered";
		}) => Promise<{ orderId: string }>
	>();

/**
 * Port for updating order status
 */
export const updateOrderStatusPort =
	createPort<
		(input: {
			orderId: string;
			status: "pending" | "confirmed" | "shipped" | "delivered";
		}) => Promise<void>
	>();

/**
 * Port for sending notifications
 */
export const sendNotificationPort =
	createPort<
		(input: {
			userId: string;
			type: "order_created" | "order_shipped" | "payment_received";
			message: string;
		}) => Promise<void>
	>();

// ============================================================================
// QUERY PORTS (Data-reading operations)
// ============================================================================

/**
 * Port for finding orders by user ID
 */
export const findOrdersByUserIdPort =
	createPort<
		(input: { userId: string }) => Promise<
			Array<{
				id: string;
				userId: string;
				status: string;
				total: number;
				createdAt: Date;
				updatedAt: Date;
				items: Array<{
					productId: string;
					name: string;
					quantity: number;
					price: number;
				}>;
			}>
		>
	>();

/**
 * Port for getting user profile
 */
export const getUserProfilePort =
	createPort<
		(input: { userId: string }) => Promise<{
			id: string;
			name: string;
			email: string;
			profile: {
				avatar?: string;
				bio?: string;
				preferences: Record<string, any>;
			};
			statistics: {
				totalOrders: number;
				totalSpent: number;
				lastOrderDate?: Date;
			};
		} | null>
	>();

/**
 * Port for searching products
 */
export const searchProductsPort =
	createPort<
		(input: {
			query: string;
			category?: string;
			limit?: number;
			offset?: number;
		}) => Promise<{
			products: Array<{
				id: string;
				name: string;
				description: string;
				price: number;
				category: string;
				inStock: boolean;
				rating: number;
			}>;
			totalCount: number;
			hasMore: boolean;
		}>
	>();

/**
 * Port for getting order statistics
 */
export const getOrderStatisticsPort =
	createPort<
		(input: {
			userId: string;
			period: "day" | "week" | "month" | "year";
		}) => Promise<{
			period: string;
			totalOrders: number;
			totalRevenue: number;
			averageOrderValue: number;
			popularProducts: Array<{
				productId: string;
				name: string;
				quantity: number;
				revenue: number;
			}>;
		}>
	>();

/**
 * Port for checking product availability
 */
export const checkProductAvailabilityPort =
	createPort<
		(input: { productId: string; quantity: number }) => Promise<{
			available: boolean;
			availableQuantity: number;
			price: number;
			estimatedDelivery?: Date;
		}>
	>();

// ============================================================================
// UTILITY PORTS (Cross-cutting concerns)
// ============================================================================

/**
 * Port for logging operations
 */
export const loggerPort =
	createPort<
		(input: {
			level: "info" | "warn" | "error";
			message: string;
			context?: Record<string, any>;
		}) => Promise<void>
	>();

/**
 * Port for caching operations
 */
export const cachePort =
	createPort<
		(input: {
			operation: "get" | "set" | "delete";
			key: string;
			value?: any;
			ttl?: number;
		}) => Promise<any>
	>();

/**
 * Port for validation operations
 */
export const validatorPort =
	createPort<
		(input: { schema: any; data: any }) => Promise<{
			valid: boolean;
			errors?: Array<{ path: string; message: string }>;
		}>
	>();

// ============================================================================
// MODULE PORT GROUPS (For better organization)
// ============================================================================

/**
 * User module ports
 */
export const userModulePorts = {
	findById: findUserByIdPort,
	save: saveUserPort,
	getProfile: getUserProfilePort,
} as const;

/**
 * Order module ports
 */
export const orderModulePorts = {
	create: createOrderPort,
	updateStatus: updateOrderStatusPort,
	findByUserId: findOrdersByUserIdPort,
	getStatistics: getOrderStatisticsPort,
} as const;

/**
 * Product module ports
 */
export const productModulePorts = {
	search: searchProductsPort,
	checkAvailability: checkProductAvailabilityPort,
} as const;

/**
 * Notification module ports
 */
export const notificationModulePorts = {
	send: sendNotificationPort,
} as const;

/**
 * Utility module ports
 */
export const utilityModulePorts = {
	logger: loggerPort,
	cache: cachePort,
	validator: validatorPort,
} as const;

// ============================================================================
// TYPE EXPORTS (For better TypeScript support)
// ============================================================================

// Manual type definitions since TypeScript can't infer from Port types directly
export type FindUserByIdInput = { id: string };
export type FindUserByIdResult = Promise<{
	id: string;
	name: string;
	email: string;
	status: "active" | "inactive";
} | null>;

export type SaveUserInput = {
	id: string;
	name: string;
	email: string;
	status: "active" | "inactive";
	createdAt: Date;
	updatedAt: Date;
};

export type CreateOrderInput = {
	userId: string;
	items: Array<{
		productId: string;
		quantity: number;
		price: number;
	}>;
	total: number;
	status: "pending" | "confirmed" | "shipped" | "delivered";
};
export type CreateOrderResult = Promise<{ orderId: string }>;

export type FindOrdersByUserIdInput = { userId: string };
export type FindOrdersByUserIdResult = Promise<
	Array<{
		id: string;
		userId: string;
		status: string;
		total: number;
		createdAt: Date;
		updatedAt: Date;
		items: Array<{
			productId: string;
			name: string;
			quantity: number;
			price: number;
		}>;
	}>
>;

export type GetUserProfileInput = { userId: string };
export type GetUserProfileResult = Promise<{
	id: string;
	name: string;
	email: string;
	profile: {
		avatar?: string;
		bio?: string;
		preferences: Record<string, any>;
	};
	statistics: {
		totalOrders: number;
		totalSpent: number;
		lastOrderDate?: Date;
	};
} | null>;

export type SearchProductsInput = {
	query: string;
	category?: string;
	limit?: number;
	offset?: number;
};
export type SearchProductsResult = Promise<{
	products: Array<{
		id: string;
		name: string;
		description: string;
		price: number;
		category: string;
		inStock: boolean;
		rating: number;
	}>;
	totalCount: number;
	hasMore: boolean;
}>;

export type SendNotificationInput = {
	userId: string;
	type: "order_created" | "order_shipped" | "payment_received";
	message: string;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to get all ports for easy registration
 */
export const getAllPorts = () => ({
	// Command ports
	findUserByIdPort,
	saveUserPort,
	createOrderPort,
	updateOrderStatusPort,
	sendNotificationPort,

	// Query ports
	findOrdersByUserIdPort,
	getUserProfilePort,
	searchProductsPort,
	getOrderStatisticsPort,
	checkProductAvailabilityPort,

	// Utility ports
	loggerPort,
	cachePort,
	validatorPort,
});

/**
 * Helper to get ports by module
 */
export const getPortsByModule = (
	module: "user" | "order" | "product" | "notification" | "utility",
) => {
	const modulePorts = {
		user: userModulePorts,
		order: orderModulePorts,
		product: productModulePorts,
		notification: notificationModulePorts,
		utility: utilityModulePorts,
	} as const;

	return modulePorts[module];
};
