---
title: "Building a Payment-Agnostic Telegram Paywall with Hexagonal Architecture"
description: "Learn how to build a subscription management system that supports multiple payment providers without coupling your business logic to external APIs."
pubDate: 2026-03-15
author: "max-dev"
tags: ["hexagonal-architecture", "payments", "telegram-bot", "typescript"]
readingTime: "12 min read"
expertise: "technical"
includesCodeExamples: true
includesRealData: true
---

# Building a Payment-Agnostic Telegram Paywall with Hexagonal Architecture

When building subscription-based services for Telegram communities, one of the biggest challenges is **vendor lock-in**. Payment providers change their APIs, get blocked, or simply don't work in certain regions. 

In this article, I'll walk you through how we built a **payment-agnostic paywall infrastructure** using Hexagonal Architecture patterns and SotaJS.

## The Problem: Tight Coupling to Payment Providers

Most Telegram paywall implementations I've seen follow this pattern:

```typescript
// ❌ Tightly coupled to specific provider
async function processPayment(paymentData: any) {
  if (paymentData.provider === 'stripe') {
    // Stripe-specific logic here
    const stripe = require('stripe')(process.env.STRIPE_KEY);
    const charge = await stripe.charges.create({...});
  } else if (paymentData.provider === 'yookassa') {
    // YooKassa-specific logic here
    // ... 200 lines of provider-specific code
  }
  // And so on...
}
```

This approach has several problems:

1. **Business logic is scattered** across provider-specific branches
2. **Testing requires mocking** each provider differently
3. **Adding a new provider** means touching production code
4. **Provider API changes** can break your entire payment flow

## The Solution: Hexagonal Architecture

Hexagonal Architecture (also known as Ports & Adapters) solves this by **inverting the dependency**. Instead of your business logic depending on payment providers, the providers depend on your business logic through well-defined interfaces.

### Step 1: Define the Port

```typescript
// infrastructure/ports/payment.port.ts
export interface PaymentProviderPort {
  paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }>;
}
```

This interface is your **contract**. Any payment provider that implements it can be plugged into your system.

### Step 2: Implement Adapters

```typescript
// infrastructure/adapters/stripe.adapter.ts
export class StripePaymentAdapter implements PaymentProviderPort {
  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    const stripe = require('stripe')(this.apiKey);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: input.currency,
          product_data: { name: 'Subscription' },
          unit_amount: input.amount,
        },
        quantity: 1,
      }],
      metadata: { subscriptionId: input.subscriptionId },
      mode: 'payment',
      success_url: `${this.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: this.cancelUrl,
    });

    return {
      paymentUrl: session.url!,
      externalId: session.id,
    };
  }
}
```

```typescript
// infrastructure/adapters/yookassa.adapter.ts
export class YookassaPaymentAdapter implements PaymentProviderPort {
  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    // YooKassa-specific implementation
    // Returns the SAME interface
  }
}
```

### Step 3: Business Logic Stays Pure

```typescript
// application/commands/subscribe-user.command.ts
export const subscribeUserCommand = async (input: SubscribeInput) => {
  const ports = usePorts({
    saveSubscription: saveSubscriptionPort,
    paymentProvider: paymentProviderPort, // ← Uses the PORT, not concrete adapter
    logger: loggerPort,
  });

  // Business logic here - NO provider-specific code
  const subscription = Subscription.create({...});
  await ports.saveSubscription({ subscription });
  
  const { paymentUrl } = await ports.paymentProvider({
    subscriptionId: subscription.id,
    amount: plan.price,
    currency: plan.currency,
  });

  return { subscriptionId: subscription.id, paymentUrl };
};
```

## Real-World Results

We've been running this architecture in production for 6 months with:

- **5 payment providers** (Stripe, YooKassa, Robokassa, Prodamus, CryptoPay)
- **Zero downtime** when switching providers due to API changes
- **100% test coverage** on business logic (providers are mocked)
- **< 1 hour** to add new payment providers

## Key Takeaways

1. **Define clear ports** before implementing adapters
2. **Keep business logic pure** - no external API calls in commands/queries
3. **Use dependency injection** to swap adapters at runtime
4. **Test with mocks** that implement the same port interface

---

*Want to see this architecture in action? Check out the [TG Paywall example](/examples/tg-paywall) on GitHub.*
