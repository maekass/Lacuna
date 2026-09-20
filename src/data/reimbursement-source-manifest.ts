import {
  REIMBURSEMENT_SOURCE_MANIFEST_VERSION,
  type ReimbursementSourceManifest,
} from "@/lib/reimbursement/sourceManifest";

/**
 * Product-development fixture only.
 *
 * Public CMS catalog URLs for the SA051 investigation target. No rates,
 * utilization, or economic conclusions are asserted. CPT descriptors are
 * not stored — code numbers and Lacuna-authored labels only.
 */
export const reimbursementSourceManifestSa051: ReimbursementSourceManifest = {
  schemaVersion: REIMBURSEMENT_SOURCE_MANIFEST_VERSION,
  generatedAt: "2026-09-18T00:00:00.000Z",
  generatedBy: "lacuna-reimbursement-phase1",
  artifacts: [
    {
      id: "artifact:cms:hcpcs-public",
      title: "HCPCS Level II public files",
      publisher: "Centers for Medicare & Medicaid Services",
      artifactType: "cms_hcpcs",
      sourceUrl:
        "https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      format: "html",
      storagePolicy: "link_only",
      redistribution: "public",
      notes: [
        "Investigation catalog for SA051 supply-pack lineage. No rate row is attached until a vintage-specific public file is source-verified.",
      ],
    },
    {
      id: "artifact:cms:pfs-overview",
      title: "Medicare Physician Fee Schedule overview",
      publisher: "Centers for Medicare & Medicaid Services",
      artifactType: "cms_pfs_rvu",
      sourceUrl: "https://www.cms.gov/medicare/payment/fee-schedules/physician",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      format: "html",
      storagePolicy: "link_only",
      redistribution: "public",
      notes: [
        "Payment-mechanics source catalog only. Conversion factors and RVUs must be copied from a dated public file before any claim can leave machine_proposed.",
      ],
    },
    {
      id: "artifact:cms:pfs-rule-materials",
      title: "CMS PFS proposed and final rule materials (catalog)",
      publisher: "Centers for Medicare & Medicaid Services",
      artifactType: "cms_pfs_rule",
      sourceUrl: "https://www.cms.gov/medicare/payment/fee-schedules/physician",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      format: "html",
      storagePolicy: "link_only",
      redistribution: "public",
      notes: [
        "Rule-cycle locator only. Do not treat this catalog page as a PE input file.",
      ],
    },
  ],
};
