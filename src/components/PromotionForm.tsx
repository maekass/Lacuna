"use client";

import { VERIFIED_COMPANY_SECTORS } from "@/lib/data/companySectors";
import type { ReviewerPromotionFields } from "@/lib/ingestion/buildPromotionDraft";

interface PromotionFormProps {
  needsNewCompany: boolean;
  needsNewAcquirer: boolean;
  hasFilingExcerpt: boolean;
  value: ReviewerPromotionFields;
  onChange: (fields: ReviewerPromotionFields) => void;
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

/** Reviewer-attested fields required for verified JSON promotion (Phase E2). */
export default function PromotionForm({
  needsNewCompany,
  needsNewAcquirer,
  hasFilingExcerpt,
  value,
  onChange,
}: PromotionFormProps) {
  const update = (patch: Partial<ReviewerPromotionFields>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-4 rounded-lg border border-lacuna-lavender/50 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-lacuna-plum">
          Promotion fields
        </h3>
        <p className="mt-1 text-xs text-lacuna-blue/80">
          Attest every value that will land in verified JSON — nothing is
          inferred from keywords.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="secondarySourceUrl">
          Secondary source URL
        </FieldLabel>
        <input
          id="secondarySourceUrl"
          type="url"
          value={value.secondarySourceUrl ?? ""}
          onChange={(e) => update({ secondarySourceUrl: e.target.value })}
          placeholder="https://… press or trade corroboration"
          className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <FieldLabel htmlFor="strategicRationale">
          Strategic rationale
        </FieldLabel>
        <textarea
          id="strategicRationale"
          value={value.strategicRationale ?? ""}
          onChange={(e) => update({ strategicRationale: e.target.value })}
          placeholder="One sentence from primary source language"
          className="mt-1 min-h-[4.5rem] w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-lacuna-blue/70">
          Curated copy that lands in verified JSON. Do not replace with an LLM
          summary of the 8-K.
        </p>
      </div>

      {needsNewCompany
        ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="companySector">Target sector</FieldLabel>
              <select
                id="companySector"
                value={value.companySector ?? ""}
                onChange={(e) => update({ companySector: e.target.value })}
                className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
              >
                <option value="">Select sector…</option>
                {VERIFIED_COMPANY_SECTORS.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="companyHq">Target HQ</FieldLabel>
              <input
                id="companyHq"
                type="text"
                value={value.companyHq ?? ""}
                onChange={(e) => update({ companyHq: e.target.value })}
                placeholder="City, region/country"
                className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel htmlFor="companyFounded">Founded year</FieldLabel>
              <input
                id="companyFounded"
                type="number"
                min={1900}
                max={2100}
                value={value.companyFounded ?? ""}
                onChange={(e) =>
                  update({
                    companyFounded: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })}
                className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel htmlFor="companyStage">Stage (optional)</FieldLabel>
              <input
                id="companyStage"
                type="text"
                value={value.companyStage ?? ""}
                onChange={(e) => update({ companyStage: e.target.value })}
                placeholder="Acquired"
                className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
              />
            </div>
            {!hasFilingExcerpt
              ? (
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="companyDescription">
                    Target description
                  </FieldLabel>
                  <textarea
                    id="companyDescription"
                    rows={3}
                    value={value.companyDescription ?? ""}
                    onChange={(e) =>
                      update({ companyDescription: e.target.value })}
                    className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
                  />
                </div>
              )
              : null}
          </div>
        )
        : (
          <p className="text-xs text-emerald-800">
            Target company already exists in verified dataset — no new company
            row.
          </p>
        )}

      {needsNewAcquirer
        ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="acquirerSector">Acquirer sector</FieldLabel>
              <input
                id="acquirerSector"
                type="text"
                value={value.acquirerSector ?? ""}
                onChange={(e) => update({ acquirerSector: e.target.value })}
                placeholder="Healthcare"
                className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel htmlFor="acquirerHq">Acquirer HQ</FieldLabel>
              <input
                id="acquirerHq"
                type="text"
                value={value.acquirerHq ?? ""}
                onChange={(e) => update({ acquirerHq: e.target.value })}
                placeholder="City, region/country"
                className="mt-1 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )
        : (
          <p className="text-xs text-emerald-800">
            Acquirer already exists in verified dataset — no new acquirer row.
          </p>
        )}
    </div>
  );
}
