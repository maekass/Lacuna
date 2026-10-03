# OpenAlex integration

Lacuna treats OpenAlex as a first-class scholarly evidence provider.

## Configuration

Copy `.env.example` to `.env.local` and set `OPENALEX_API_KEY`.
The key is read only on the server/CLI side through `process.env`; never use a
`NEXT_PUBLIC_*` variable and never commit the key.

Lacuna sends the key as a bearer token rather than putting it in the query
string, keeping credentials out of request URLs and provenance logs.

## Provider surface

- `searchOpenAlexWorks` — keyword, exact, semantic, filter, sort, select,
  paging.
- `getOpenAlexWork` — singleton work lookup.
- `executeOpenAlexOql` — OQL execution at the API root.
- `validateOpenAlexOql` — OQL validation without executing a query.
- `getOpenAlexRateLimit` — usage/budget inspection.

The client preserves the OpenAlex response envelope and does not fabricate
records when fields or results are missing. Downstream ingestion owns the
schema/provenance contract.

## Integrity coverage

The unit contract tests cover authentication, exact request construction,
paging, response preservation, singleton lookup, OQL routing, HTTP failures,
malformed responses, secret non-disclosure, empty-input rejection, and abort
signals.

The authenticated workflow runs a live end-to-end integrity probe. It
requires the secret, verifies a non-empty scholarly result set and strict
response shape, performs a singleton lookup against the returned canonical ID,
validates known-good OQL, checks the rate-limit endpoint, and exits non-zero on
any mismatch. It never prints the API key.

## Checks

`OPENALEX_API_KEY=... npm test -- src/lib/ingestion/openAlexClient.test.ts`

`OPENALEX_API_KEY=... npx tsx scripts/openalex-smoke.ts`

The GitHub workflow is manual because it consumes the repository OpenAlex
secret.
