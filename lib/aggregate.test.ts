import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { createAggregate } from './aggregate';

// --- Test Setup ---

// 1. Define a sample event
class OrderPaidEvent {
  constructor(public readonly aggregateId: string, public readonly timestamp = new Date()) {}
}

// 2. Define the schema for our test aggregate
const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'shipped']),
  amount: z.number(),
});
type OrderState = z.infer<typeof OrderSchema>;

// 3. Define the aggregate using our factory with the new Immer-based actions
const Order = createAggregate({
  name: 'Order',
  schema: OrderSchema,
  invariants: [
    (state) => {
      if (state.amount <= 0) {
        throw new Error('Order amount must be positive.');
      }
    },
  ],
  actions: {
    pay: (state: OrderState, paymentMethod: string) => {
      if (state.status !== 'pending') {
        throw new Error('Only pending orders can be paid.');
      }
      console.log(`Paid with ${paymentMethod}`);
      // Direct mutation of draft state
      state.status = 'paid';
      return {
        event: new OrderPaidEvent(state.id),
      };
    },
    ship: (state: OrderState) => {
      if (state.status !== 'paid') {
        throw new Error('Only paid orders can be shipped.');
      }
      // Direct mutation, no event returned
      state.status = 'shipped';
    },
  },
});

// --- Tests ---

describe('createAggregate with Immer', () => {
  const validOrderData = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    status: 'pending' as const,
    amount: 100,
  };

  it('should create an aggregate instance with valid data', () => {
    const order = Order.create(validOrderData);
    expect(order).toBeInstanceOf(Order);
    expect(order.state.status).toBe('pending');
  });

  it('should throw an error if initial data violates the schema', () => {
    const invalidData = { ...validOrderData, amount: 'not-a-number' };
    expect(() => Order.create(invalidData)).toThrow();
  });

  it('should successfully execute an action and change state', () => {
    const order = Order.create(validOrderData);
    const originalState = order.state;

    order.actions.pay('credit-card');
    
    const newState = order.state;
    expect(newState.status).toBe('paid');
    // Verify immutability
    expect(newState).not.toBe(originalState);
    expect(originalState.status).toBe('pending');
  });

  it('should collect domain events when an action is executed', () => {
    const order = Order.create(validOrderData);
    order.actions.pay('credit-card');
    const events = order.getPendingEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderPaidEvent);
    expect(events[0].aggregateId).toBe(validOrderData.id);
  });

  it('getPendingEvents should clear the event queue', () => {
    const order = Order.create(validOrderData);
    order.actions.pay('credit-card');
    
    // First call gets the event
    expect(order.getPendingEvents()).toHaveLength(1);
    // Second call gets nothing because the queue was cleared
    expect(order.getPendingEvents()).toHaveLength(0);
  });

  it('clearEvents should clear the event queue', () => {
    const order = Order.create(validOrderData);
    order.actions.pay('credit-card');
    order.clearEvents(); // Explicitly clear the queue
    const subsequentEvents = order.getPendingEvents();
    expect(subsequentEvents).toHaveLength(0);
  });

  it("should throw an error if an action's precondition is not met", () => {
    const paidOrderData = { ...validOrderData, status: 'paid' as const };
    const order = Order.create(paidOrderData);
    expect(() => order.actions.pay('credit-card')).toThrow('Only pending orders can be paid.');
  });

  it('should not change state if an invariant fails', () => {
    const FaultyOrder = createAggregate({
        name: 'FaultyOrder',
        schema: OrderSchema,
        invariants: [(state) => { if (state.amount < 0) throw new Error('Amount cannot be negative.'); }],
        actions: {
            setBadAmount: (state: OrderState) => {
                state.amount = -10;
            }
        }
    });

    const faultyOrder = FaultyOrder.create(validOrderData);
    const originalState = faultyOrder.state;

    expect(() => faultyOrder.actions.setBadAmount()).toThrow('Amount cannot be negative.');
    expect(faultyOrder.state).toEqual(originalState); // State should NOT have changed.
  });
});