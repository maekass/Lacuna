import { getOpenAlexRateLimit, getOpenAlexWork, searchOpenAlexWorks, validateOpenAlexOql } from "../src/lib/ingestion/openAlexClient";

type WorkIntegrityRecord = {
  id?: unknown;
  display_name?: unknown;
  publication_year?: unknown;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error("OpenAlex integrity failure: " + message);
}

const apiKey = process.env.OPENALEX_API_KEY?.trim();
assert(apiKey, "OPENALEX_API_KEY is missing from the authenticated environment.");

const result = await searchOpenAlexWorks({
  search: "reproductive health",
  perPage: 1,
  select: "id,display_name,publication_year",
});

assert(result.meta && typeof result.meta.count === "number", "meta.count is missing or non-numeric.");
assert(result.meta.count > 0, "authenticated search returned zero matching scholarly works.");
assert(Array.isArray(result.results), "results is not an array.");
assert(result.results.length === 1, "per-page=1 did not return exactly one scholarly work.");

const first = result.results[0] as WorkIntegrityRecord | undefined;
assert(first, "the API reported results but returned no first record.");
assert(
  typeof first.id === "string" && /^https:\/\/openalex\.org\/W[A-Za-z0-9]+$/.test(first.id),
  "first result has an invalid canonical OpenAlex work ID.",
);
assert(
  typeof first.display_name === "string" && first.display_name.trim().length > 0,
  "first result has no non-empty display name.",
);
assert(
  first.publication_year === undefined ||
    (typeof first.publication_year === "number" && Number.isInteger(first.publication_year)),
  "first result has an invalid publication year.",
);

const singleton = await getOpenAlexWork(first.id);
assert(singleton && typeof singleton === "object", "singleton lookup did not return an object.");
const singletonRecord = singleton as WorkIntegrityRecord;
assert(singletonRecord.id === first.id, "singleton lookup returned a different OpenAlex ID.");
assert(
  typeof singletonRecord.display_name === "string" &&
    singletonRecord.display_name.trim().length > 0,
  "singleton lookup returned no display name.",
);

const validation = await validateOpenAlexOql("works where year is (2025)");
assert(validation && typeof validation === "object", "OQL validation returned no object.");
const validationRecord = validation as { valid?: unknown; validation?: { valid?: unknown } };
assert(
  validationRecord.valid === true || validationRecord.validation?.valid === true,
  "known-valid OQL was not accepted by the live validator.",
);

const rateLimit = await getOpenAlexRateLimit();
assert(rateLimit && typeof rateLimit === "object", "rate-limit endpoint did not return an object.");

console.log(
  JSON.stringify({
    ok: true,
    authenticated: true,
    resultCount: result.meta.count,
    sample: {
      id: first.id,
      title: first.display_name,
      publicationYear: first.publication_year,
    },
    singletonVerified: true,
    oqlValidationVerified: true,
    rateLimitEndpointVerified: true,
  }),
);
