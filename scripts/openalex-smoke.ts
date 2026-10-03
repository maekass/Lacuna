import { searchOpenAlexWorks } from "../src/lib/ingestion/openAlexClient";

const result = await searchOpenAlexWorks({
  search: "reproductive health",
  perPage: 1,
  select: "id,display_name,publication_year",
});

if (!result.meta || typeof result.meta.count !== "number") {
  throw new Error(
    "OpenAlex integrity failure: meta.count is missing or non-numeric.",
  );
}
if (!Array.isArray(result.results) || result.results.length > 1) {
  throw new Error(
    "OpenAlex integrity failure: results is not an array or exceeded per-page=1.",
  );
}

const first = result.results[0] as
  | { id?: unknown; display_name?: unknown; publication_year?: unknown }
  | undefined;

if (first) {
  if (
    typeof first.id !== "string" ||
    !first.id.startsWith("https://openalex.org/")
  ) {
    throw new Error("OpenAlex integrity failure: invalid canonical work ID.");
  }
  if (typeof first.display_name !== "string" || !first.display_name) {
    throw new Error("OpenAlex integrity failure: missing display name.");
  }
  if (
    first.publication_year !== undefined &&
    (typeof first.publication_year !== "number" ||
      !Number.isInteger(first.publication_year))
  ) {
    throw new Error(
      "OpenAlex integrity failure: invalid publication year.",
    );
  }
}

console.log(
  JSON.stringify({
    ok: true,
    resultCount: result.meta.count,
    sample: first
      ? {
        id: first.id,
        title: first.display_name,
        publicationYear: first.publication_year,
      }
      : null,
  }),
);
