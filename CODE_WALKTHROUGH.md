# Code Walkthrough — Interview Prep

This document is a compact map of the code so every submitted layer has a reason and a clear explanation.

## 1. Start at the browser

`frontend/components/QuoteBuilder.tsx`

This component owns UI state only:

- customer name
- seat count
- line items
- discount
- annual commitment
- current API calculation
- loading/error/save state

When the state changes, a 350 ms debounce calls `calculateQuote()`.

Important interview point:

> React can show the draft state, but it cannot decide the authoritative total.

## 2. HTTP client

`frontend/lib/api.ts`

All HTTP calls are centralized here so UI components don't repeat fetch configuration.

`request<T>()`:

1. prefixes the backend URL.
2. sends JSON.
3. parses the JSON body.
4. turns non-2xx responses into readable errors.
5. returns typed response objects.

## 3. Express app

`backend/src/app.js`

Responsibilities:

- CORS
- JSON body parsing
- health check
- `/api` route mounting
- 404 handling
- one global error handler

## 4. Routes

`backend/src/routes.js`

Routes should remain boring. They map an HTTP method/path to a controller.

Example:

`POST /api/quotes/calculate` → `controller.calculate`

Business decisions do not belong here.

## 5. Validation

`backend/src/validators/quoteSchemas.js`

Zod validates the JSON contract before it reaches the service.

Examples:

- customer name must exist.
- seats must be a positive integer.
- at least one line is required.
- quantity must be a positive integer.
- discount must be between 0 and 100.
- annual commitment must be boolean.

Schema validity and business validity are intentionally separated.

## 6. Business logic

`backend/src/services/quoteService.js`

This is the most important backend file.

The calculation flow is:

1. Load catalog.
2. Find pricing tier from seat count.
3. Reject duplicate SKUs.
4. Reject unknown SKUs.
5. Reject a discount above tier maximum.
6. Snapshot product information into calculated lines.
7. Calculate subtotal.
8. Calculate discount amount.
9. Calculate final total.
10. Evaluate approval conditions.
11. Build explanation.
12. Return one authoritative result.

## 7. Why cents?

`backend/src/utils/money.js`

Floating-point numbers are not ideal for financial arithmetic. For example, decimal values such as 0.1 cannot always be represented exactly in binary floating point.

This app converts dollars to cents before arithmetic, rounds discount cents once, then converts back to dollars for the JSON API.

## 8. Save flow

`saveQuote()` deliberately calls `calculateQuote()` again.

That matters because the frontend can be modified or bypassed.

The server should never trust:

- browser totals
- browser tier
- browser approval flag

It recalculates from the submitted draft.

## 9. Product snapshot

Saved quote lines contain the product name and unit price used at the time of saving.

This means a retired/renamed/repriced product does not rewrite an existing quote.

## 10. Status workflow

`allowedTransitions` is a finite-state machine represented as a small map:

```js
{
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: [],
  rejected: []
}
```

This is easier to audit than scattering status checks across multiple routes.

## 11. Repository layer

`backend/src/repositories/`

The service does not know file-system details.

`quoteRepository.js` knows how to:

- create
- find by id
- list
- update by id

If PostgreSQL is introduced later, the repository implementation can change while the service and API contract remain stable.

## 12. Review page

`frontend/app/quotes/[id]/page.tsx`

The page fetches a saved quote by ID and presents:

- customer
- seat count
- products
- price math
- discount
- approval status
- approval reasons
- calculation explanation
- allowed next status
- audit history

## 13. Why the frontend does not duplicate every business rule

The frontend needs some UI validation for usability, but it deliberately does not become the source of truth.

The backend has the complete rule set.

This avoids the classic bug:

> Frontend says total = 9,999, backend says 10,000, reviewer sees a different number.

Instead, the browser displays the backend result.

## 14. What to say if asked to change a rule

Example: “Change approval from total > $25,000 to total > $20,000.”

Answer path:

1. Change the approval threshold in `calculateApproval()`.
2. Add/update a backend boundary test.
3. Update the human-readable reason if needed.
4. The UI automatically reflects the new API result because it renders backend data.
5. Update `DECISIONS.md` so the documented rule remains aligned.

## 15. What to say if asked to change annual pricing

Currently annual commitment only affects approval logic because the assignment does not provide annual pricing.

To add a 5% annual discount, pricing policy should be introduced in the backend service, tested there, and documented. The UI should not invent the formula.

## 16. What to say if asked to support duplicate product rows

The current policy rejects duplicates to prevent ambiguity.

A different policy could merge quantities by SKU before calculation. That would be a conscious business decision, not a UI patch.
