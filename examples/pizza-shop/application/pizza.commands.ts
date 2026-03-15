import { usePorts } from "../../../lib/use-ports";
import { Order, OrderStatusChangedEvent } from "../domain/order.aggregate";
import {
	saveOrderPort,
	findOrderByIdPort,
	OrderDto,
} from "../infrastructure/order.ports";

/**
 * Команда: Создать заказ
 */
export const createOrderCommand = async (input: {
	items: { name: string; price: number }[];
}) => {
	const ports = usePorts({ save: saveOrderPort });

	const totalPrice = input.items.reduce((sum, i) => sum + i.price, 0);

	const order = Order.create({
		id: crypto.randomUUID(),
		items: input.items,
		status: "new",
		totalPrice,
		createdAt: new Date(),
	});

	await ports.save(order.props as OrderDto);

	return {
		success: true,
		orderId: order.id,
		totalPrice: order.props.totalPrice,
		events: order.getPendingEvents(),
	};
};

/**
 * Команда: Отменить заказ
 */
export const cancelOrderCommand = async (id: string) => {
	const ports = usePorts({
		find: findOrderByIdPort,
		save: saveOrderPort,
	});

	const orderData = await ports.find(id);
	if (!orderData) return { success: false, error: "ORDER_NOT_FOUND" };

	const order = Order.create({
		...orderData,
		createdAt: new Date(orderData.createdAt),
	});

	try {
		order.actions.cancel();
		await ports.save(order.props as OrderDto);

		return {
			success: true,
			orderId: id,
			events: order.getPendingEvents(),
		};
	} catch (error: any) {
		return {
			success: false,
			error: "CANNOT_CANCEL",
			message: error.message,
		};
	}
};
