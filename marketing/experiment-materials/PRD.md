# PRD: Skin Shop Backend (CS2 Items)

## Target
A secure backend for a digital items shop with real-money transactions.

## Requirements
1. **Endpoint POST /purchase**:
   - Inputs: user_id, item_id, price, request_id.
   - Must decrease user balance and add item to inventory.
2. **Concurrency Protection**:
   - Prevent "Double Spending" at all costs.
   - Handle rapid-fire duplicate requests (network retries).
3. **Auditability**:
   - Every balance change must be linked to a unique external operation ID.
4. **Resilience**:
   - Business rules must be enforced even if infrastructure (DB) is temporarily unavailable or slow.
