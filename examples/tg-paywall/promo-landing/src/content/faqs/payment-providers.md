---
question: "What payment providers are supported?"
answer: |
  The system is **payment-agnostic** thanks to Hexagonal Architecture. Out of the box, we support:
  
  - **Stripe** - International payments, cards, Apple/Google Pay
  - **YooKassa** - Russia and CIS region
  - **Robokassa** - Alternative Russian payment processor
  - **Prodamus** - Popular for digital products and bloggers
  - **CryptoPay** - Cryptocurrency payments (TON, USDT, BTC)
  - **Mock Provider** - For testing and demos
  
  Adding a new provider typically takes **2-4 hours** of development time and requires only implementing a single interface. Your business logic remains untouched.
category: "integration"
order: 2
featured: true
---
