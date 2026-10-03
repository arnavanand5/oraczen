# Engineering Decisions — Oraczen Deal Desk Quote Simulator

## 1. Backend technology choice

> **Important note:**
   Before you getting surprised and getting into code I want to tell you that I have used express for backend. 
   Yes I did read the instructions not once not twice 3 times. Since this thing was mentioned 

  `  We are not scoring visual polish. ` 

   ` We care about:`
 ` - TypeScript quality ` 
 ` - Python quality ` 
 ` - correctness of business logic ` 
 ` - API design ` 
 ` - frontend/backend integration ` 
 ` - validation and error handling ` 
 ` - tests ` 
 ` - product usability ` 
 ` - engineering judgment ` 

 ` A smaller, reliable implementation beats a large, fragile one. ` 

 I was more productive with express js and the main point was to test the business logics, Although FastAPI was the suggested option, the core requirement was to build a working quote simulator. I chose Express.js as an alternative backend framework while keeping the API-based architecture and the required functionality intact.

## 2. Architecture

The project is split into two independently running applications:

- `frontend/`: Next.js App Router + React + TypeScript.
- `backend/`: Express REST API + JSON-file persistence.

The browser never embeds quote calculations in a Next.js API route. It calls the Express API over HTTP.

Backend layers:

- `routes.js` — maps HTTP methods/paths to controllers.
- `controllers/quoteController.js` — translates HTTP requests into service calls and responses.
- `validators/quoteSchemas.js` — request validation with Zod.
- `services/quoteService.js` — the single source of truth for pricing, discount limits, approval rules, persistence shape, and status transitions.
- `repositories/catalogRepository.js` — reads the supplied immutable catalog.
- `repositories/quoteRepository.js` — reads/writes saved quotes.
- `utils/money.js` — deterministic cents-based money arithmetic.
- `utils/explanation.js` — deterministic human-readable calculation explanation.

This separation makes a future business-rule change localized to the service layer rather than duplicated in React and the API.

## 3. Duplicate product lines

**Decision: reject duplicate SKUs.**

A product can only appear once in a quote. If a rep needs more units, they change that line's quantity.

Why:

- Prevents ambiguous presentation and accidental double counting.
- Keeps the review page easier to scan.
- Makes comparison and auditing simpler.
- Avoids having to define whether duplicate rows should merge automatically.

The API rejects duplicate SKUs with `DUPLICATE_SKU`.

## 4. Zero discount

**Decision: always represent the value explicitly as `0`.**

The frontend initializes `discountPct` to `0` and sends `0` to the API rather than omitting it.

Why:

- The field is numeric and has a meaningful business value.
- Explicit `0` removes ambiguity between “no discount” and “unknown/not provided”.
- The persisted quote is self-contained and easy to audit.

## 5. Money and rounding

**Decision: calculate internally using integer cents.**

Catalog prices are supplied in dollars, but the calculation converts them to cents before multiplication and discount arithmetic:

1. `unit_price` dollars → cents.
2. `quantity × unit_price_cents` for each line.
3. Sum line cents for subtotal.
4. `Math.round(subtotal_cents × discount_pct / 100)` for discount cents.
5. Subtract discount cents from subtotal cents.
6. Convert back to dollars with exactly two decimal places for API output.

Why:

- Avoids common binary floating-point surprises with decimal money.
- Gives deterministic results at cents precision.
- Makes threshold checks such as `$25,000` unambiguous.

The current catalog contains whole-dollar prices, but cents-based arithmetic protects the model if catalog prices later include cents.

## 6. Annual commitment pricing

**Decision: annual commitment does not change product pricing.**

The assignment defines annual commitment as an input to approval logic. There is no annual-pricing multiplier or discount supplied in the catalog.

Therefore:

- Subtotal is unchanged.
- Discount amount is unchanged.
- Final total is unchanged.
- The approval rule `annual commitment selected AND discount > 10%` is applied.

This avoids inventing a pricing policy that was not specified.

## 7. Product disappearance after quote creation

**Decision: store a product snapshot on the saved quote.**

When a quote is saved, its line stores:

- SKU
- product name at save time
- unit price at save time
- quantity
- calculated line total

A later catalog change therefore does not rewrite history for an already-created quote.

Why:

- A reviewer should see what was actually quoted.
- Historical quotes remain understandable even if an SKU is retired or its price changes.
- The quote review page is independent from the current catalog.

New calculations always validate against the current catalog.

## 8. Business rules and source of truth

**Decision: the backend owns all business calculations.**

The React UI sends the draft to `POST /api/quotes/calculate` and displays the API response. The browser does not become authoritative by calculating a final total locally.

The backend is responsible for:

- tier selection
- discount maximum validation
- SKU validation
- duplicate-SKU validation
- line totals
- subtotal
- discount amount
- final total
- approval requirement
- approval reasons
- deterministic pricing explanation

The save endpoint runs the same calculation again before persistence. This protects the saved quote from manipulated or stale client values.

## 9. Status transitions

Allowed transitions are deliberately finite:

```text
draft → submitted → approved
                    ↘ rejected
```

No transition is allowed from `approved` or `rejected`.

Why:

- Matches the workflow specified in the assignment.
- Prevents an approved quote from silently becoming editable again.
- Keeps the workflow auditable.

The API exposes `PATCH /api/quotes/:id/status` and returns `409 INVALID_STATUS_TRANSITION` for an invalid move.

## 10. Persistence

**Decision: JSON-file persistence, not a database.**

The assignment explicitly allows a simple JSON file and says no database is required.

Saved quotes live in `backend/data/quotes.json`.

A small write queue serializes file writes so two concurrent save/update operations do not blindly overwrite each other in the same Node process.

For a production deployment, I would replace this repository with a transactional database repository while preserving the service/API contract.

## 11. Draft recovery

**Decision: keep the unsaved draft in browser `localStorage`.**

The builder saves the latest draft locally whenever fields change. On refresh, it restores that draft.

The saved quote is still persisted only through the backend.

This gives recovery without creating a second backend persistence model for incomplete quotes.

## 12. Live calculation UX

**Decision: debounce calculation requests by 350 ms.**

Every meaningful form change updates React state immediately. A short debounce avoids sending a request for every keystroke while keeping the preview feeling live.

The preview displays the last successful backend calculation, and API validation errors are surfaced to the rep in plain language.

## 13. Error handling

API errors use a stable structure:

```json
{
  "error": {
    "code": "UNKNOWN_SKU",
    "message": "One or more product SKUs do not exist in the catalog.",
    "details": {}
  }
}
```

HTTP statuses are used semantically:

- `200` — successful read/calculation/update.
- `201` — quote created.
- `400` — malformed request/schema validation.
- `404` — quote or endpoint not found.
- `409` — invalid workflow transition.
- `422` — valid JSON shape, but business rules reject the value.
- `500` — unexpected server failure.

## 14. API contract

### GET `/api/catalog`
Returns the supplied catalog unchanged.

### POST `/api/quotes/calculate`
Request:

```json
{
  "customerName": "Acme Corp",
  "seats": 50,
  "lines": [
    { "sku": "AGENT-CORE", "quantity": 50 }
  ],
  "discountPct": 20,
  "annualCommitment": false
}
```

Response:

```json
{
  "tier": "ENTERPRISE",
  "max_discount_pct": 30,
  "currency": "USD",
  "lines": [
    {
      "sku": "AGENT-CORE",
      "name": "Agent Core",
      "quantity": 50,
      "unit_price": 120,
      "line_total": 6000
    }
  ],
  "subtotal": 6000,
  "discount_pct": 20,
  "discount_amount": 1200,
  "total": 4800,
  "annual_commitment": false,
  "approval_required": true,
  "approval_reasons": ["discount_above_15_percent"],
  "explanation": "..."
}
```

### POST `/api/quotes`
Validates, calculates, snapshots product details, and persists a new quote with status `draft`.

### GET `/api/quotes`
Returns lightweight quote summaries for the saved quote library/comparison selector.

### GET `/api/quotes/:id`
Returns the complete saved quote, calculation, and status history.

### PATCH `/api/quotes/:id/status`
Request:

```json
{ "status": "submitted" }
```

Only the documented status transitions are accepted.

## 15. Frontend implementation choices

The UI is intentionally compact around the core workflow instead of looking like an analytics dashboard.

Key choices:

- A split builder layout keeps input and calculation visible at the same time.
- Approval status is visually prominent.
- Reasons are shown next to the financial totals.
- Review pages use a second information hierarchy so a reviewer can understand a saved quote quickly.
- CSS-only animations provide motion without introducing another dependency.

## 16. Testing strategy

Backend tests cover:

- 9-seat STARTER boundary.
- 10-seat GROWTH boundary.
- 49/50-seat GROWTH → ENTERPRISE boundary.
- Discount-above-15 approval.
- Annual-commitment approval rule.
- API validation for empty line items.
- API validation for unknown SKUs.

The frontend test verifies the builder mounts and exposes the key input/preview surfaces while the API module is mocked.

A next testing layer would add interaction tests for adding/removing lines, local draft recovery, API error presentation, and review-page status transitions.

## 17. What I would do with another day

- Add Playwright end-to-end coverage for the full create → submit → approve/reject flow.
- Add optimistic status updates only where the rollback behavior is clearly safe.
- Add a migration-ready repository interface and PostgreSQL implementation.
- Add stronger concurrency protection for multi-process deployments.
- Add an API OpenAPI document generated from the validation schemas.
- Add role-based reviewer permissions if this became a real internal tool.

## 18. Implementation checklist

1. Preserve the supplied catalog exactly.
2. Define request validation.
3. Centralize all pricing and approval calculations in the backend service.
4. Add deterministic money handling.
5. Add REST endpoints and stable errors.
6. Persist saved quotes to JSON.
7. Build the live quote builder in Next.js.
8. Add local draft recovery.
9. Add saved-quote review and status workflow.
10. Add scenario comparison.
11. Add tests around boundaries and invalid input.
12. Document the API and all business decisions.
