"use client";

import { motion } from "framer-motion";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";

interface AcquirerProfileProps {
  acquirerId: string | null;
  onClose: () => void;
}

export default function AcquirerProfile(
  { acquirerId, onClose }: AcquirerProfileProps,
) {
  const {
    verifiedAcquirers,
    verifiedAcquisitions,
    verifiedCompanies,
  } = useVerifiedDataset();

  if (!acquirerId) {
    return null;
  }

  const acquirer = verifiedAcquirers.find((item) => item.id === acquirerId) ??
    verifiedCompanies.find((item) => item.id === acquirerId);
  const companyById = new Map(
    verifiedCompanies.map((company) => [company.id, company]),
  );
  const deals = verifiedAcquisitions
    .filter((deal) => deal.acquirerId === acquirerId)
    .map((deal) => ({
      ...deal,
      targetCompany: companyById.get(deal.targetId),
    }));
  const sectors = [
    ...new Set(
      deals.flatMap((deal) =>
        deal.targetCompany ? [deal.targetCompany.sector] : []
      ),
    ),
  ];
  const disclosedValues = deals
    .map((deal) => deal.dealValue)
    .filter((dealValue): dealValue is number => typeof dealValue === "number");
  const averageDealValue = disclosedValues.length > 0
    ? disclosedValues.reduce((sum, value) => sum + value, 0) /
      disclosedValues.length
    : null;
  const mostRecentDealDate = deals.length > 0
    ? [...deals].sort((a, b) =>
      new Date(b.announcedDate).getTime() - new Date(a.announcedDate).getTime()
    )[0].announcedDate
    : null;
  const rationaleSnippets = deals.map((deal) => deal.strategicRationale);

  return (
    <motion.div
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      className="fixed right-0 top-0 z-[100] h-screen w-[380px] border-l border-lacuna-lavender/40 bg-white shadow-2xl"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-lacuna-lavender/40 px-6 py-5">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lacuna-blue/70">
                Acquirer Profile
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-lacuna-plum">
                {acquirer?.name ?? acquirerId}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-2xl leading-none text-lacuna-blue/70 transition-colors hover:text-lacuna-plum"
              aria-label="Close acquirer profile"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-lacuna-pink/10 p-3">
              <p className="text-xs uppercase tracking-wide text-lacuna-blue/70">
                Deals
              </p>
              <p className="mt-1 font-semibold text-lacuna-plum">
                {deals.length}
              </p>
            </div>
            <div className="rounded-xl bg-lacuna-pink/10 p-3">
              <p className="text-xs uppercase tracking-wide text-lacuna-blue/70">
                Avg. Deal Value
              </p>
              <p className="mt-1 font-semibold text-lacuna-plum">
                {averageDealValue === null
                  ? "Undisclosed"
                  : `$${averageDealValue.toFixed(1)}M`}
              </p>
            </div>
            <div className="rounded-xl bg-lacuna-pink/10 p-3 col-span-2">
              <p className="text-xs uppercase tracking-wide text-lacuna-blue/70">
                Most Recent Deal
              </p>
              <p className="mt-1 font-semibold text-lacuna-plum">
                {mostRecentDealDate ?? "No deals found"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
              Sectors Acquired
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {sectors.length > 0
                ? sectors.map((sector) => (
                  <span
                    key={sector}
                    className="rounded-full bg-lacuna-pink/10 px-3 py-1 text-xs font-medium text-lacuna-plum"
                  >
                    {sector}
                  </span>
                ))
                : (
                  <p className="text-sm text-lacuna-blue/70">
                    No sector data available.
                  </p>
                )}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
              Deal History
            </h4>
            <div className="mt-3 space-y-3">
              {deals.length > 0
                ? deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-xl border border-lacuna-lavender/30 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-lacuna-plum">
                          {deal.targetCompany?.name ?? deal.targetName}
                        </p>
                        <p className="mt-1 text-xs text-lacuna-blue/70">
                          {deal.dealType} · {deal.announcedDate}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-lacuna-blue">
                        {typeof deal.dealValue === "number"
                          ? `$${deal.dealValue}M`
                          : "Undisclosed"}
                      </p>
                    </div>
                  </div>
                ))
                : (
                  <p className="text-sm text-lacuna-blue/70">
                    No verified acquisitions found for this acquirer.
                  </p>
                )}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
              Strategic Rationale
            </h4>
            <div className="mt-3 space-y-3">
              {rationaleSnippets.length > 0
                ? rationaleSnippets.map((snippet, index) => (
                  <div
                    key={`${acquirerId}-${index}`}
                    className="rounded-xl bg-lacuna-pink/10 p-4 text-sm leading-relaxed text-lacuna-blue"
                  >
                    {snippet}
                  </div>
                ))
                : (
                  <p className="text-sm text-lacuna-blue/70">
                    No strategic rationale available.
                  </p>
                )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
