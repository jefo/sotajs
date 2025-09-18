// Example of using module compositions for different environments

import { createPort, resetDI } from "./di.v2";
import { createModule, useModule } from "./module";
import {
  createModuleComposition,
  createEnvironmentModuleComposition,
  applyModuleComposition
} from "./module-composition";

// Reset DI for clean state
resetDI();

// 1. Define ports
const findUserPort = createPort<() => Promise<{ id: string; name: string }>>();
const saveOrderPort = createPort<(order: { id: string; userId: string }) => Promise<void>>();
const sendEmailPort = createPort<(email: { to: string; subject: string }) => Promise<void>>();

// 2. Create module
const orderModule = createModule({
  findUser: findUserPort,
  saveOrder: saveOrderPort,
  sendEmail: sendEmailPort
});

// 3. Define compositions for different environments
const testComposition = createModuleComposition({
  findUser: async () => ({ id: "test-1", name: "Test User" }),
  saveOrder: async (order: { id: string; userId: string }) => {
    console.log(`[TEST] Saving order ${order.id} for user ${order.userId}`);
  },
  sendEmail: async (email: { to: string; subject: string }) => {
    console.log(`[TEST] Sending email to ${email.to} with subject ${email.subject}`);
  }
});

const productionComposition = createModuleComposition({
  findUser: async () => {
    // In real implementation, this would call a database
    console.log("[PROD] Fetching user from database");
    return { id: "prod-1", name: "Production User" };
  },
  saveOrder: async (order: { id: string; userId: string }) => {
    // In real implementation, this would save to a database
    console.log(`[PROD] Saving order ${order.id} for user ${order.userId} to database`);
  },
  sendEmail: async (email: { to: string; subject: string }) => {
    // In real implementation, this would call an email service
    console.log(`[PROD] Sending email to ${email.to} with subject ${email.subject} via email service`);
  }
});

// 4. Create environment compositions
const compositions = {
  test: testComposition,
  development: testComposition, // Use test composition for development too
  production: productionComposition
};

// 5. Apply the appropriate composition based on environment
const environment = process.env.NODE_ENV || "test";
const environmentComposition = createEnvironmentModuleComposition(environment, compositions);
applyModuleComposition(orderModule, environmentComposition);
console.log(`Applied ${environment} composition`);

// 6. Use the module in a use case
async function createOrderUseCase(userId: string) {
  const { findUser, saveOrder, sendEmail } = useModule(orderModule);
  
  const user = await findUser();
  await saveOrder({ id: "order-123", userId });
  await sendEmail({ to: user.name, subject: "Order Confirmation" });
  
  console.log("Order created successfully!");
}

// Run the example
createOrderUseCase("1");