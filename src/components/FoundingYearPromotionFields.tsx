import {
  FOUNDING_YEAR_SOURCE_LABELS,
  FOUNDING_YEAR_SOURCE_TYPES,
  type FoundingYearSourceType,
} from "@/lib/data/foundingYearPolicy";
import type { ReviewerPromotionFields } from "@/lib/ingestion/buildPromotionDraft";

interface FoundingYearPromotionFieldsProps {
  value: ReviewerPromotionFields;
  onChange: (patch: Partial<ReviewerPromotionFields>) => void;
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-wide text-lacuna-plum/80"
    >
      {children}
    </label>
  );
}

/** Citation fields required before a new company can receive a founded year. */
export default function FoundingYearPromotionFields({
  value,
  onChange,
}: FoundingYearPromotionFieldsProps) {
  const sourceType = value.foundingSourceType ?? "";

  return (
    <div className="space-y-4 sm:col-span-2">
      <p className="text-[11px] leading-relaxed text-lacuna-blue/70">
        Leave the year blank unless a source states it. Do not infer it from
        company age, funding date, product launch, domain registration, or model
        output.
      </p>
      <div>
        <FieldLabel htmlFor="foundingSourceUrl">
          Founding-year source URL
        </FieldLabel>
        <input
          id="foundingSourceUrl"
          type="url"
          value={value.foundingSourceUrl ?? ""}
          onChange={(event) =>
            onChange({ foundingSourceUrl: event.target.value })}
          placeholder="https://… page that states the year"
          className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="foundingSourceName">Source name</FieldLabel>
          <input
            id="foundingSourceName"
            type="text"
            value={value.foundingSourceName ?? ""}
            onChange={(event) =>
              onChange({ foundingSourceName: event.target.value })}
            placeholder="Company about page"
            className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <FieldLabel htmlFor="foundingSourceType">Source type</FieldLabel>
          <select
            id="foundingSourceType"
            value={sourceType}
            onChange={(event) => {
              const next = event.target.value;
              const foundingSourceType = next === ""
                ? null
                : next as FoundingYearSourceType;
              onChange({
                foundingSourceType,
                ...(foundingSourceType === "corroborated_database"
                  ? {}
                  : { foundingCorroboratingSourceUrl: null }),
              });
            }}
            className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
          >
            <option value="">Select source type…</option>
            {FOUNDING_YEAR_SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {FOUNDING_YEAR_SOURCE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="foundingSourceAccessDate">
            Access date
          </FieldLabel>
          <input
            id="foundingSourceAccessDate"
            type="date"
            value={value.foundingSourceAccessDate ?? ""}
            onChange={(event) =>
              onChange({ foundingSourceAccessDate: event.target.value })}
            className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <FieldLabel htmlFor="foundingReviewer">Reviewer</FieldLabel>
          <input
            id="foundingReviewer"
            type="text"
            value={value.foundingReviewer ?? ""}
            onChange={(event) =>
              onChange({ foundingReviewer: event.target.value })}
            className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="foundingEvidenceLocator">
          Evidence quote or locator
        </FieldLabel>
        <textarea
          id="foundingEvidenceLocator"
          value={value.foundingEvidenceLocator ?? ""}
          onChange={(event) =>
            onChange({ foundingEvidenceLocator: event.target.value })}
          placeholder="Quote or heading that states the founding year"
          className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
        />
      </div>
      {sourceType === "corroborated_database"
        ? (
          <div>
            <FieldLabel htmlFor="foundingCorroboratingSourceUrl">
              Corroborating source URL
            </FieldLabel>
            <input
              id="foundingCorroboratingSourceUrl"
              type="url"
              value={value.foundingCorroboratingSourceUrl ?? ""}
              onChange={(event) =>
                onChange({
                  foundingCorroboratingSourceUrl: event.target.value,
                })}
              placeholder="Independent page that states the same year"
              className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
            />
          </div>
        )
        : null}
      <label className="flex items-start gap-2 text-xs text-lacuna-blue/80">
        <input
          id="foundingNotInferred"
          type="checkbox"
          checked={value.foundingNotInferred === true}
          onChange={(event) =>
            onChange({ foundingNotInferred: event.target.checked })}
          className="mt-0.5"
        />
        <span>
          I did not infer this year from company age, a funding date, a product
          launch, a domain-registration date, or model output.
        </span>
      </label>
    </div>
  );
}
