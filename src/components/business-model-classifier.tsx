"use client";

/**
 * Business Model Classifier Component
 *
 * Visualizes reimbursement status and valuation impact for Lacuna companies.
 * Provides interactive classification and comparison tools.
 */

import React, { useMemo, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  BusinessModel,
  CompanyReimbursementProfile,
  ReimbursementStatus,
} from "@/data/cms-reimbursement-connector";
import {
  ValuationOutput,
  ValuationPremiumCalculator,
} from "@/data/valuation-premium-calculator";

interface BusinessModelClassifierProps {
  companyProfile?: CompanyReimbursementProfile;
  sector?: string;
  annualRevenue?: number;
  className?: string;
}

interface ClassificationResult {
  reimbursementStatus: ReimbursementStatus;
  businessModel: BusinessModel;
  estimatedReimbursementPct: number;
  valuationImpact: ValuationOutput;
}

export const BusinessModelClassifier: React.FC<BusinessModelClassifierProps> = (
  {
    companyProfile,
    sector = "digital_therapeutics",
    annualRevenue = 0,
    className = "",
  },
) => {
  const [selectedSector, setSelectedSector] = useState(sector);
  const [hasCPTCode, setHasCPTCode] = useState(
    companyProfile?.reimbursementStatus.hasCPTCode ?? false,
  );
  const [codeCount, setCodeCount] = useState(
    companyProfile?.reimbursementStatus.codeCount ?? 0,
  );
  const [rateCategory, setRateCategory] = useState<
    ReimbursementStatus["rateCategory"]
  >(
    companyProfile?.reimbursementStatus.rateCategory ?? "none",
  );
  const [revenue, setRevenue] = useState(annualRevenue);
  const [acquirerType, setAcquirerType] = useState<
    "healthcare" | "tech" | "pharma" | "retail"
  >("healthcare");

  const calculator = useMemo(() => new ValuationPremiumCalculator(), []);

  const classification = useMemo<ClassificationResult>(() => {
    const reimbursementStatus: ReimbursementStatus = {
      hasCPTCode,
      codeType: hasCPTCode ? (codeCount > 2 ? "established" : "new") : "none",
      codeCount,
      reimbursementBreadth: codeCount > 1
        ? "multi-payer"
        : hasCPTCode
        ? "medicare-only"
        : "none",
      rateCategory,
      estimatedAnnualReimbursement: hasCPTCode ? revenue * 0.6 : 0,
    };

    let businessModel: BusinessModel = "b2c-consumer";
    let estimatedReimbursementPct = 0;

    if (hasCPTCode) {
      if (rateCategory === "high" && codeCount > 2) {
        businessModel = "insurance-driven";
        estimatedReimbursementPct = 75;
      } else if (codeCount > 0) {
        businessModel = "hybrid";
        estimatedReimbursementPct = 45;
      }
    } else {
      businessModel = "b2c-consumer";
      estimatedReimbursementPct = 5;
    }

    const valuationImpact = calculator.calculateValuation({
      annualRevenue: revenue,
      reimbursementStatus,
      sector: selectedSector,
      growthRate: 35, // 🔴 ILLUSTRATIVE default — replace with company-specific CAGR when available
      profitability: "break-even",
      acquirerType,
    });

    return {
      reimbursementStatus,
      businessModel,
      estimatedReimbursementPct,
      valuationImpact,
    };
  }, [
    hasCPTCode,
    codeCount,
    rateCategory,
    revenue,
    selectedSector,
    acquirerType,
    calculator,
  ]);

  const modelComparison = useMemo(() => {
    return calculator.compareBusinessModels(revenue, selectedSector);
  }, [revenue, selectedSector, calculator]);

  const getBusinessModelLabel = (model: BusinessModel): string => {
    switch (model) {
      case "insurance-driven":
        return "Insurance-Driven (B2B)";
      case "hybrid":
        return "Hybrid Model";
      case "b2c-consumer":
        return "Consumer-Only (B2C)";
      default:
        return "Unclear";
    }
  };

  const getBusinessModelColor = (model: BusinessModel): string => {
    switch (model) {
      case "insurance-driven":
        return "bg-green-100 text-green-800 border-green-300";
      case "hybrid":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "b2c-consumer":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-lacuna-surface-subtle text-lacuna-text-primary border-lacuna-border-strong";
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else {
      return `$${(value / 1000).toFixed(0)}K`;
    }
  };

  const formatMultiple = (value: number): string => {
    return `${value.toFixed(1)}x`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <CuratedDatasetBanner className="mb-4" />
      <h2 className="text-xl font-bold mb-4 text-purple-900">
        Business Model & Reimbursement Classifier
      </h2>

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-lacuna-text-primary mb-1">
            Sector
          </label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full border border-lacuna-border-strong rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="fertility">Fertility</option>
            <option value="maternal_health">Maternal Health</option>
            <option value="mental_health">Mental Health</option>
            <option value="gynecology">Gynecology</option>
            <option value="pelvic_health">Pelvic Health</option>
            <option value="menopause">Menopause</option>
            <option value="contraception">Contraception</option>
            <option value="breast_health">Breast Health</option>
            <option value="wearable_monitoring">Wearable Monitoring</option>
            <option value="digital_therapeutics">Digital Therapeutics</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-lacuna-text-primary mb-1">
            Annual Revenue
          </label>
          <input
            type="range"
            min="1000000"
            max="100000000"
            step="1000000"
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-lacuna-text-secondary text-center">
            {formatCurrency(revenue)}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-lacuna-text-primary mb-1">
            Has CPT Code
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={hasCPTCode}
                onChange={() => setHasCPTCode(true)}
                className="mr-2"
              />
              Yes
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={!hasCPTCode}
                onChange={() => setHasCPTCode(false)}
                className="mr-2"
              />
              No
            </label>
          </div>
        </div>

        {hasCPTCode && (
          <>
            <div>
              <label className="block text-sm font-medium text-lacuna-text-primary mb-1">
                Number of Codes
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={codeCount}
                onChange={(e) => setCodeCount(Number(e.target.value))}
                className="w-full border border-lacuna-border-strong rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-lacuna-text-primary mb-1">
                Reimbursement Rate
              </label>
              <select
                value={rateCategory}
                onChange={(e) =>
                  setRateCategory(
                    e.target.value as ReimbursementStatus["rateCategory"],
                  )}
                className="w-full border border-lacuna-border-strong rounded-md px-3 py-2"
              >
                <option value="low">Low ($50-200)</option>
                <option value="medium">Medium ($200-1000)</option>
                <option value="high">High (&gt;$1000)</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-lacuna-text-primary mb-1">
            Likely Acquirer
          </label>
          <select
            value={acquirerType}
            onChange={(e) =>
              setAcquirerType(e.target.value as typeof acquirerType)}
            className="w-full border border-lacuna-border-strong rounded-md px-3 py-2"
          >
            <option value="healthcare">Healthcare (CVS, UnitedHealth)</option>
            <option value="pharma">Pharma (J&J, Roche)</option>
            <option value="tech">Tech (Apple, Google)</option>
            <option value="retail">Retail (Walgreens, Walmart)</option>
          </select>
        </div>
      </div>

      {/* Classification Result */}
      <div className="bg-lacuna-surface-muted rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-lacuna-text-primary mb-3">
          Classification Result
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-lacuna-text-primary">
            Business Model:
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold border ${
              getBusinessModelColor(classification.businessModel)
            }`}
          >
            {getBusinessModelLabel(classification.businessModel)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {classification.estimatedReimbursementPct}%
            </div>
            <div className="text-xs text-lacuna-text-secondary">
              Est. Insurance Revenue
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {classification.reimbursementStatus.codeCount}
            </div>
            <div className="text-xs text-lacuna-text-secondary">CPT Codes</div>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {formatMultiple(classification.valuationImpact.adjustedMultiple)}
            </div>
            <div className="text-xs text-lacuna-text-secondary">
              Valuation Multiple
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(classification.valuationImpact.impliedValuation)}
            </div>
            <div className="text-xs text-lacuna-text-secondary">
              Implied Valuation
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison */}
      <div className="mb-6">
        <h3 className="font-semibold text-lacuna-text-primary mb-3">
          Insurance-Driven vs Consumer-Only Comparison
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">
              Insurance-Driven Model
            </h4>
            <div className="text-3xl font-bold text-green-700 mb-1">
              {formatMultiple(modelComparison.insuranceDriven.adjustedMultiple)}
            </div>
            <div className="text-sm text-green-700">
              {formatCurrency(modelComparison.insuranceDriven.impliedValuation)}
            </div>
            <div className="mt-2 text-xs text-green-600">
              Multiple CPT codes, high RVU, multi-payer coverage
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h4 className="font-semibold text-orange-900 mb-2">
              Consumer-Only Model
            </h4>
            <div className="text-3xl font-bold text-orange-700 mb-1">
              {formatMultiple(modelComparison.consumerOnly.adjustedMultiple)}
            </div>
            <div className="text-sm text-orange-700">
              {formatCurrency(modelComparison.consumerOnly.impliedValuation)}
            </div>
            <div className="mt-2 text-xs text-orange-600">
              No CPT codes, cash pay, limited reimbursement
            </div>
          </div>
        </div>

        <div className="mt-4 bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-purple-900">
                Reimbursement Premium
              </div>
              <div className="text-2xl font-bold text-purple-700">
                +{modelComparison.premiumPercent.toFixed(0)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-900">
                Additional Value
              </div>
              <div className="text-xl font-bold text-purple-700">
                {formatCurrency(modelComparison.premium)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-purple-600">
            Companies with strong reimbursement profiles command 3-5x premiums
            over consumer-only models
          </div>
        </div>
      </div>

      {/* Key Factors */}
      <div>
        <h3 className="font-semibold text-lacuna-text-primary mb-3">
          Valuation Factors
        </h3>
        <ul className="space-y-2">
          {classification.valuationImpact.keyFactors.map((factor, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm text-lacuna-text-primary"
            >
              <span className="text-purple-500 mt-0.5">•</span>
              {factor}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BusinessModelClassifier;
