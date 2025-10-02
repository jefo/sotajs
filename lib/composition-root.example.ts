// ============================================================================
// COMPOSITION ROOT EXAMPLE (CQRS Approach)
//
// This shows how to bind adapters to ports using the CQRS approach.
//
// Key principles:
// 1. All port-to-adapter bindings happen in one place
// 2. Clear separation between commands and queries
// 3. Easy to switch between different environments (test, development, production)
// ============================================================================

import { setPortAdapters, resetDI } from "./di.v2";

// Import ports (contracts) from the application layer
// Note: In a real implementation, these would be imported from your ports
// For this example, we'll define simple mock ports
import { createPort } from "./di.v2";

// Mock ports for demonstration
export const findUserByIdPort =
	createPort<(input: { id: string }) => Promise<any>>();
export const saveUserPort = createPort<(input: any) => Promise<void>>();
export const findOrdersByUserIdPort =
	createPort<(input: { userId: string }) => Promise<any[]>>();
export const getUserProfilePort =
	createPort<(input: { userId: string }) => Promise<any>>();

// Import adapters for different environments
// Note: In a real implementation, these would be imported from your adapters
// For this example, we'll define simple mock adapters

// Mock adapters for demonstration
export const mockFindUserById = async (input: { id: string }) => ({
	id: input.id,
	name: "Mock User",
});
export const mockSaveUser = async (input: any) => {
	/* mock save */
};
export const mockFindOrdersByUserId = async (input: { userId: string }) => [];
export const mockGetUserProfile = async (input: { userId: string }) => ({
	id: input.userId,
});

export const devFindUserById = async (input: { id: string }) => ({
	id: input.id,
	name: "Dev User",
});
export const devSaveUser = async (input: any) => {
	/* dev save */
};
export const devFindOrdersByUserId = async (input: { userId: string }) => [];
export const devGetUserProfile = async (input: { userId: string }) => ({
	id: input.userId,
});

export const prodFindUserById = async (input: { id: string }) => ({
	id: input.id,
	name: "Prod User",
});
export const prodSaveUser = async (input: any) => {
	/* prod save */
};
export const prodFindOrdersByUserId = async (input: { userId: string }) => [];
export const prodGetUserProfile = async (input: { userId: string }) => ({
	id: input.userId,
});

// ============================================================================
// COMPOSITION FUNCTIONS FOR DIFFERENT ENVIRONMENTS
// ============================================================================

/**
 * Test composition - uses mock adapters for isolated testing
 */
export const testComposition = () => {
	resetDI();

	setPortAdapters([
		// Command ports
		[findUserByIdPort, mockFindUserById],
		[saveUserPort, mockSaveUser],

		// Query ports
		[findOrdersByUserIdPort, mockFindOrdersByUserId],
		[getUserProfilePort, mockGetUserProfile],
	]);

	console.log("✅ Test composition applied - using mock adapters");
};

/**
 * Development composition - uses development adapters (e.g., in-memory DB)
 */
export const developmentComposition = () => {
	resetDI();

	setPortAdapters([
		// Command ports
		[findUserByIdPort, devFindUserById],
		[saveUserPort, devSaveUser],

		// Query ports
		[findOrdersByUserIdPort, devFindOrdersByUserId],
		[getUserProfilePort, devGetUserProfile],
	]);

	console.log(
		"✅ Development composition applied - using development adapters",
	);
};

/**
 * Production composition - uses production adapters (e.g., real database)
 */
export const productionComposition = () => {
	resetDI();

	setPortAdapters([
		// Command ports
		[findUserByIdPort, prodFindUserById],
		[saveUserPort, prodSaveUser],

		// Query ports
		[findOrdersByUserIdPort, prodFindOrdersByUserId],
		[getUserProfilePort, prodGetUserProfile],
	]);

	console.log("✅ Production composition applied - using production adapters");
};

// ============================================================================
// ENVIRONMENT-BASED COMPOSITION
// ============================================================================

/**
 * Composition registry for different environments
 */
const compositions = {
	test: testComposition,
	development: developmentComposition,
	production: productionComposition,
} as const;

/**
 * Apply composition based on current environment
 * @param environment - The environment to use ('test', 'development', 'production')
 */
export const bootstrapApplication = (
	environment: keyof typeof compositions = "development",
) => {
	const composition = compositions[environment];
	if (!composition) {
		throw new Error(`Unknown environment: ${environment}`);
	}

	composition();
	return {
		environment,
		ports: {
			findUserByIdPort,
			saveUserPort,
			findOrdersByUserIdPort,
			getUserProfilePort,
		},
	};
};

/**
 * Bootstrap application with environment detection
 */
export const bootstrapApplicationWithEnvDetection = () => {
	const environment = (process.env.NODE_ENV ||
		"development") as keyof typeof compositions;
	return bootstrapApplication(environment);
};

// ============================================================================
// MODULE-BASED COMPOSITION (Alternative approach)
// ============================================================================

/**
 * Composition for user-related operations
 */
export const userModuleComposition = () => {
	setPortAdapters([
		[findUserByIdPort, devFindUserById],
		[getUserProfilePort, devGetUserProfile],
	]);
};

/**
 * Composition for order-related operations
 */
export const orderModuleComposition = () => {
	setPortAdapters([
		[saveUserPort, devSaveUser],
		[findOrdersByUserIdPort, devFindOrdersByUserId],
	]);
};

/**
 * Complete application composition by combining modules
 */
export const modularComposition = () => {
	resetDI();
	userModuleComposition();
	orderModuleComposition();
	console.log("✅ Modular composition applied");
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Bootstrap for testing
// bootstrapApplication('test');

// Example 2: Bootstrap for production
// bootstrapApplication('production');

// Example 3: Bootstrap with environment detection
// bootstrapApplicationWithEnvDetection();

// Example 4: Use modular composition
// modularComposition();
