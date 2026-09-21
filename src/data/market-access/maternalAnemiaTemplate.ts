export const maternalAnemiaTemplate = {
  id: "maternal-anemia-lmic-template",
  title: "Maternal anemia — LMIC market access case",
  indication: "Maternal anemia",
  commodity: "To be selected after evidence review",
  country: "Select one country before publication",
  status: "template",
  objective:
    "Trace disease burden to reachable demand, supplier economics, budget impact, and a testable market-shaping intervention.",
  requiredEvidence: [
    "Pregnancy or ANC-eligible population for the selected country and year",
    "Maternal anemia prevalence with population and measurement definition",
    "ANC/service reach and diagnosis pathway",
    "Treatment eligibility and current uptake",
    "Commodity-specific supplier, regulatory, price, and capacity evidence",
    "Country procurement, financing, workforce, diagnostics, and supply-chain context",
    "Delivery and implementation cost evidence",
  ],
  publicationRule:
    "Do not convert this template into a reviewed case until every modeled numeric input has provenance and the case passes the market-access schema.",
} as const;
