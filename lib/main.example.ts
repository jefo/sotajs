// ============================================================================
// MAIN APPLICATION EXAMPLE (CQRS Approach)
//
// Demonstrates the complete flow with CQRS approach and platform integration.
//
// Key principles:
// 1. Application setup happens through composition root
// 2. Use cases are executed as commands and queries
// 3. Results are returned as DTOs and transformed for presentation
// ============================================================================

import { bootstrapApplicationWithEnvDetection } from "./composition-root.example";
import { initializeDevelopmentData } from "./example-adapters";

// Note: In a real implementation, these would be imported from your use cases
// For this example, we'll define simple mock implementations

// Mock command implementation
const createOrderCommand = async (input: any) => {
	console.log("Mock createOrderCommand called with:", input);
	return {
		success: true,
		orderId: "mock-order-123",
		total: 199.99,
	};
};

// Mock query implementation
const getUserOrdersQuery = async (input: any) => {
	console.log("Mock getUserOrdersQuery called with:", input);
	return {
		orders: [
			{
				id: "mock-order-001",
				status: "confirmed",
				total: 199.99,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				itemCount: 1,
			},
		],
		totalCount: 1,
		hasMore: false,
	};
};

// ============================================================================
// PLATFORM INTEGRATION EXAMPLES
// ============================================================================

/**
 * Web API Controller (Express.js style)
 */
class WebOrderController {
	async createOrder(req: any, res: any) {
		try {
			const result = await createOrderCommand(req.body);

			if (result.success) {
				res.status(201).json({
					success: true,
					orderId: result.orderId,
					total: result.total,
					message: "Order created successfully",
				});
			} else {
				res.status(400).json({
					success: false,
					error: "error" in result ? result.error : "Unknown error",
				});
			}
		} catch (error: any) {
			res.status(500).json({
				success: false,
				error: "Internal server error",
			});
		}
	}

	async getUserOrders(req: any, res: any) {
		try {
			const result = await getUserOrdersQuery({ userId: req.params.userId });

			res.json({
				success: true,
				data: result,
			});
		} catch (error: any) {
			res.status(500).json({
				success: false,
				error: "Internal server error",
			});
		}
	}
}

/**
 * Telegram Bot Handler
 */
class TelegramOrderHandler {
	async handleCreateOrder(ctx: any) {
		try {
			const result = await createOrderCommand({
				userId: ctx.from.id.toString(),
				items: this.parseItemsFromMessage(ctx.message.text),
			});

			if (result.success) {
				await ctx.reply(
					`✅ Заказ создан!\n\n` +
						`📦 ID заказа: ${result.orderId}\n` +
						`💰 Сумма: ${result.total} руб.\n` +
						`📅 Ожидайте подтверждения`,
				);
			} else {
				await ctx.reply(
					`❌ Ошибка: ${"error" in result ? result.error : "Unknown error"}`,
				);
			}
		} catch (error: any) {
			await ctx.reply("❌ Произошла ошибка при создании заказа");
		}
	}

	async handleGetOrders(ctx: any) {
		try {
			const result = await getUserOrdersQuery({
				userId: ctx.from.id.toString(),
			});

			if (result.orders.length === 0) {
				await ctx.reply("📭 У вас пока нет заказов");
				return;
			}

			const message = result.orders
				.map(
					(order: any) =>
						`📦 Заказ #${order.id}\n` +
						`📊 Статус: ${this.getStatusEmoji(order.status)} ${order.status}\n` +
						`💰 Сумма: ${order.total} руб.\n` +
						`📅 Дата: ${new Date(order.createdAt).toLocaleDateString("ru-RU")}`,
				)
				.join("\n\n");

			await ctx.reply(message);
		} catch (error: any) {
			await ctx.reply("❌ Произошла ошибка при получении заказов");
		}
	}

	private parseItemsFromMessage(text: string) {
		// Simplified parsing logic
		return [
			{
				productId: "default-product",
				quantity: 1,
				price: 100,
			},
		];
	}

	private getStatusEmoji(status: string) {
		const emojis: Record<string, string> = {
			pending: "⏳",
			confirmed: "✅",
			shipped: "🚚",
			delivered: "📦",
		};
		return emojis[status] || "❓";
	}
}

/**
 * CLI Application
 */
class CLIApplication {
	async createOrder(userId: string, items: any[]) {
		console.log("🔄 Creating order...");

		const result = await createOrderCommand({ userId, items });

		if (result.success) {
			console.log("✅ Order created successfully");
			console.log(`   Order ID: ${result.orderId}`);
			console.log(`   Total: $${result.total}`);
		} else {
			console.log(
				`❌ Failed to create order: ${"error" in result ? result.error : "Unknown error"}`,
			);
		}

		return result;
	}

	async listOrders(userId: string) {
		console.log(`📋 Orders for user ${userId}:`);

		const result = await getUserOrdersQuery({ userId });

		if (result.orders.length === 0) {
			console.log("   No orders found");
			return;
		}

		result.orders.forEach((order: any) => {
			console.log(`   ${order.id} - ${order.status} - $${order.total}`);
		});

		console.log(`   Total: ${result.totalCount} orders`);
	}
}

// ============================================================================
// APPLICATION EXECUTION
// ============================================================================

/**
 * Main function to run the application
 */
async function main() {
	console.log("🚀 Starting SotaJS application with CQRS approach...");

	// Bootstrap the application with environment detection
	const app = bootstrapApplicationWithEnvDetection();
	console.log(`✅ Application bootstrapped for ${app.environment} environment`);

	// Initialize development data (for demo purposes)
	if (app.environment === "development") {
		initializeDevelopmentData();
	}

	console.log("\n--- Testing Web API Integration ---");
	await testWebIntegration();

	console.log("\n--- Testing Telegram Bot Integration ---");
	await testTelegramIntegration();

	console.log("\n--- Testing CLI Integration ---");
	await testCLIIntegration();

	console.log("\n🎉 Application finished successfully!");
}

/**
 * Test web API integration
 */
async function testWebIntegration() {
	const controller = new WebOrderController();

	// Simulate web request
	const mockRequest = {
		body: {
			userId: "test-user-123",
			items: [{ productId: "prod-001", quantity: 2 }],
		},
		params: { userId: "test-user-123" },
	};

	const mockResponse = {
		status: (code: number) => ({
			json: (data: any) =>
				console.log(`Web Response (${code}):`, JSON.stringify(data, null, 2)),
		}),
		json: (data: any) =>
			console.log("Web Response:", JSON.stringify(data, null, 2)),
	};

	console.log("Testing order creation...");
	await controller.createOrder(mockRequest, mockResponse);

	console.log("Testing order listing...");
	await controller.getUserOrders(mockRequest, mockResponse);
}

/**
 * Test Telegram bot integration
 */
async function testTelegramIntegration() {
	const handler = new TelegramOrderHandler();

	// Simulate Telegram context
	const mockContext = {
		from: { id: 123456789 },
		message: { text: "Create order with 2 items" },
		reply: async (text: string) => console.log("Telegram Bot:", text),
	};

	console.log("Testing order creation via Telegram...");
	await handler.handleCreateOrder(mockContext);

	console.log("Testing order listing via Telegram...");
	await handler.handleGetOrders(mockContext);
}

/**
 * Test CLI integration
 */
async function testCLIIntegration() {
	const cli = new CLIApplication();

	console.log("Testing order creation via CLI...");
	await cli.createOrder("test-user-123", [
		{ productId: "prod-001", quantity: 1 },
	]);

	console.log("Testing order listing via CLI...");
	await cli.listOrders("test-user-123");
}

// ============================================================================
// ERROR HANDLING AND GRACEFUL SHUTDOWN
// ============================================================================

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
	process.exit(1);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	process.exit(1);
});

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================

// Run the application if this file is executed directly
if (import.meta.main) {
	main().catch((error: any) => {
		console.error("Application failed:", error);
		process.exit(1);
	});
}

export { WebOrderController, TelegramOrderHandler, CLIApplication, main };
