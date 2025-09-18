// Example usage of the new Module concept

import { createPort, setPortAdapter, resetDI } from "./di.v2";
import { createModule, useModule } from "./module";

// Reset DI for clean state
resetDI();

// 1. Define ports
const findUserPort = createPort<() => Promise<{ id: string; name: string }>>();
const saveOrderPort = createPort<(order: { id: string; userId: string }) => Promise<void>>();
const sendEmailPort = createPort<(email: { to: string; subject: string }) => Promise<void>>();

// 2. Set up adapters (implementations)
setPortAdapter(findUserPort, async () => ({ id: "1", name: "John Doe" }));
setPortAdapter(saveOrderPort, async (order) => {
	console.log(`Saving order ${order.id} for user ${order.userId}`);
});
setPortAdapter(sendEmailPort, async (email) => {
	console.log(`Sending email to ${email.to} with subject ${email.subject}`);
});

// 3. Create a module that groups related ports
const orderModule = createModule({
	findUser: findUserPort,
	saveOrder: saveOrderPort,
	sendEmail: sendEmailPort
});

// 4. Use the module in a use case
async function createOrderUseCase(userId: string) {
	// Instead of multiple usePort() calls:
	// const findUser = usePort(findUserPort);
	// const saveOrder = usePort(saveOrderPort);
	// const sendEmail = usePort(sendEmailPort);
	
	// We can now use a single call:
	const { findUser, saveOrder, sendEmail } = useModule(orderModule);
	
	// Use the ports
	const user = await findUser();
	await saveOrder({ id: "order-123", userId });
	await sendEmail({ to: user.name, subject: "Order Confirmation" });
	
	console.log("Order created successfully!");
}

// Run the example
createOrderUseCase("1");