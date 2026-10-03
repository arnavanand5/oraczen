# Oraczen Deal Desk Quote Simulator

A small internal sales tool for creating customer quotes, calculating pricing, understanding approval requirements, and reviewing saved quotes.

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

## Features

- Customer, seats, product lines, discount, annual commitment.
- Backend-authoritative pricing calculation.
- STARTER / GROWTH / ENTERPRISE tier validation.
- Approval detection with human-readable reasons.
- Saved quotes using JSON-file persistence.
- Quote review with controlled status transitions.
- Deterministic pricing explanation.
- Draft recovery through `localStorage`.
- Saved-quote scenario comparison.
- Backend tests + a frontend render test.
- Responsive UI with lightweight CSS animations.

## Project structure

```text
.
├── backend/
│   ├── data/
│   │   ├── catalog.json
│   │   └── quotes.json
│   ├── src/
│   │   ├── controllers/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── routes.js
│   │   └── server.js
│   └── tests/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   └── quotes/
│   ├── components/
│   ├── lib/
│   ├── styles/
│   ├── types/
│   └── __tests__/
├── DECISIONS.md
├── .env.example
└── package.json
```

## Requirements

- Node.js 20+
- npm 10+

## Run locally

From the project root:

```bash
npm install
npm run install:all
npm run dev
```

Then open:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`



## Run separately

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Tests

All tests:

```bash
npm test
```

Backend only:

```bash
npm test --prefix backend
```

Frontend only:

```bash
npm test --prefix frontend
```

Frontend production build:

```bash
npm run build
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/catalog` | Catalog + discount rules |
| POST | `/api/quotes/calculate` | Authoritative quote calculation |
| POST | `/api/quotes` | Validate + calculate + save quote |
| GET | `/api/quotes` | List saved quote summaries |
| GET | `/api/quotes/:id` | Get full saved quote |
| PATCH | `/api/quotes/:id/status` | Move through allowed workflow states |

Full request/response details and business decisions are in [`DECISIONS.md`](./DECISIONS.md).

## Business rules implemented

Line total:

`quantity × unit_price`

Subtotal:

`sum(line_total)`

Discount amount:

`subtotal × discount_pct / 100`

Final total:

`subtotal - discount_amount`

Tier maximums:

- 1–9 seats → STARTER → 10%
- 10–49 seats → GROWTH → 20%
- 50+ seats → ENTERPRISE → 30%

Approval is required when:

- discount > 15%, or
- total > $25,000, or
- annual commitment is selected and discount > 10%.

## Interview / code walkthrough

A reviewer can trace a calculation through this path:

```text
QuoteBuilder.tsx
   ↓ HTTP POST
lib/api.ts
   ↓
POST /api/quotes/calculate
   ↓
quoteController.js
   ↓
quoteSchemas.js → validates shape
   ↓
quoteService.js → validates catalog/business rules + calculates
   ↓
money.js → cents-based arithmetic
   ↓
response
   ↓
QuoteBuilder.tsx → preview
```

For a saved quote:

```text
POST /api/quotes
   ↓
validate + calculate again on backend
   ↓
snapshot product details
   ↓
quoteRepository.js
   ↓
backend/data/quotes.json
```

See `DECISIONS.md` for the reasoning behind each major choice.
