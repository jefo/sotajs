---
question: "What happens when a subscription expires?"
answer: |
  The system includes an **Expiration Worker** that runs automatically:
  
  1. **Scheduled check** - runs every hour (configurable)
  2. **Finds expired subscriptions** - queries for subscriptions where `expiresAt < now`
  3. **Revokes access** - removes user from ALL connected channels/chats
  4. **Updates status** - marks subscription as "expired" in database
  5. **Logs the action** - audit trail for support inquiries
  
  The process is:
  - **100% automated** - no manual intervention needed
  - **Comprehensive** - revokes from all resources, not just one channel
  - **Reversible** - if user renews, access is immediately restored
category: "general"
order: 4
featured: false
---
