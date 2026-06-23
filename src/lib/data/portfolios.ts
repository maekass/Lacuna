import {
  amboyPortfolio,
  foregroundPortfolio,
  fundPortfolio,
} from "@/data/verifiedData";

export type PortfolioKey = "foreground" | "amboy" | "fund";

export interface InvestorPortfolio {
  readonly key: PortfolioKey;
  readonly investorName: string;
  readonly shortName: string;
  readonly companies: readonly string[];
}

export type PortfolioFitTone = "portfolio" | "sector" | "none";

export interface PortfolioFit {
  readonly investorName: string;
  readonly label: string;
  readonly tone: PortfolioFitTone;
}

/** Investor portfolios tracked against the verified dataset, in display order. */
export const INVESTOR_PORTFOLIOS: readonly InvestorPortfolio[] = [
  {
    key: "foreground",
    investorName: "Foreground Capital",
    shortName: "Foreground",
    companies: foregroundPortfolio,
  },
  {
    key: "amboy",
    investorName: "Amboy Street Ventures",
    shortName: "Amboy Street",
    companies: amboyPortfolio,
  },
  {
    key: "fund",
    investorName: "Fund Portfolio",
    shortName: "Fund",
    companies: fundPortfolio,
  },
];
