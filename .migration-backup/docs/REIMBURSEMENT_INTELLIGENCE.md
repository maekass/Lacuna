# CMS Reimbursement Intelligence Layer

## Overview

The Reimbursement Intelligence Layer integrates CMS HCPCS/CPT code data with
Lacuna's company database to assess whether acquired companies have insurance
reimbursement coverage—**a key driver of 5-10x valuation premiums** in
healthcare M&A.

## Why This Matters

**Reimbursement = Recurring Revenue + Predictability**

Companies with established CPT codes command significantly higher valuation
multiples:

| Business Model       | Median Multiple | Key Characteristics                       |
| -------------------- | --------------- | ----------------------------------------- |
| **Insurance-Driven** | 5.2x            | Multiple CPT codes, high RVU, multi-payer |
| **Hybrid**           | 2.8x            | Limited codes, medium RVU                 |
| **Consumer-Only**    | 1.5x            | No CPT codes, cash pay                    |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CMS Data Sources                          │
├─────────────────────────────────────────────────────────────┤
│  • CPT Codes (AMA) - Procedure descriptions & RVUs         │
│  • HCPCS Codes (CMS) - Supplies & equipment                │
│  • Medicare Fee Schedule - Reimbursement rates             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 Matching & Classification                    │
├─────────────────────────────────────────────────────────────┤
│  1. Fuzzy match company products → CPT codes               │
│  2. Classify reimbursement status                          │
│  3. Determine business model type                          │
│  4. Calculate valuation impact                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Valuation Analysis                        │
├─────────────────────────────────────────────────────────────┤
│  • Sector-specific benchmarks                              │
│  • Acquirer strategy fit                                   │
│  • Premium/discount calculations                           │
└─────────────────────────────────────────────────────────────┘
```

## Files

### Core Components

| File                                                 | Description                         |
| ---------------------------------------------------- | ----------------------------------- |
| `src/data/cms-reimbursement-connector.ts`            | CMS data connector & matching logic |
| `src/data/cpt-code-matcher.ts`                       | Fuzzy matching algorithms           |
| `src/data/valuation-premium-calculator.ts`           | Valuation impact calculations       |
| `src/data/reimbursement-intelligence-integration.ts` | Integration layer                   |
| `src/components/business-model-classifier.tsx`       | Interactive visualization component |

### Data Files

| File                               | Description                        |
| ---------------------------------- | ---------------------------------- |
| `src/data/cached-cpt-codes.json`   | Essential women's health CPT codes |
| `src/data/cached-hcpcs-codes.json` | HCPCS supply/equipment codes       |

## Usage

### Basic Company Analysis

```typescript
import { reimbursementIntelligence } from '@/data/reimbursement-intelligence-integration';

// Initialize
await reimbursementIntelligence.initialize();

// Analyze a company
const analysis = await reimbursementIntelligence.analyzeCompany({
  id: '123',
  name: 'Maven Clinic',
  productDescription: 'Virtual care platform for women's and family health',
  sector: 'maternal_health',
  revenue: 150000000
});

console.log(analysis.classification.businessModel);
// Output: 'insurance-driven'

console.log(analysis.valuation.adjustedMultiple);
// Output: 5.8x

console.log(analysis.insights);
// Output: [
//   "Established CPT codes provide predictable reimbursement revenue stream",
//   "Multi-payer coverage reduces revenue concentration risk",
//   "Strong reimbursement profile commands 80% valuation premium"
// ]
```

### Batch Analysis

```typescript
const companies = [
  { name: 'Modern Fertility', sector: 'fertility', ... },
  { name: 'Tia', sector: 'gynecology', ... },
  { name: 'Flo', sector: 'fertility', ... }
];

const results = await reimbursementIntelligence.analyzeCompanies(companies);

const stats = reimbursementIntelligence.getSummaryStatistics(results);
console.log(stats);
// Output:
// {
//   totalCompanies: 3,
//   insuranceDriven: 1,
//   hybrid: 1,
//   consumerOnly: 1,
//   avgValuationMultiple: 3.2
// }
```

### React Component

```tsx
import { BusinessModelClassifier } from "@/components/business-model-classifier";

function CompanyAnalysis() {
  return (
    <BusinessModelClassifier
      sector="maternal_health"
      annualRevenue={10000000}
    />
  );
}
```

## Business Model Classification

### Insurance-Driven (B2B)

**Criteria:**

- 3+ CPT codes
- High RVU procedures (> $500)
- Multi-payer coverage

**Examples:**

- Maven Clinic
- Teladoc Health
- Livongo (acquired for 13.8x)

**Valuation Impact:** 4.5-6.5x revenue

### Hybrid Model

**Criteria:**

- 1-2 CPT codes
- Medium RVU ($200-1000)
- Limited payer coverage

**Examples:**

- Tia
- Parsley Health
- Modern Fertility (acquired for 2.5x)

**Valuation Impact:** 2.5-3.5x revenue

### Consumer-Only (B2C)

**Criteria:**

- No CPT codes
- Cash pay only
- Subscription/app revenue

**Examples:**

- Flo
- Clue
- Natural Cycles

**Valuation Impact:** 1.2-1.8x revenue

## Sector Patterns

| Sector                   | Avg Coverage | Reimbursement Level | Key Codes           |
| ------------------------ | ------------ | ------------------- | ------------------- |
| **Fertility**            | 15%          | Low                 | 58321, 58322, 58970 |
| **Maternal Health**      | 65%          | High                | 59400, 59510, 76801 |
| **Mental Health**        | 80%          | High                | 90791, 90834, 90837 |
| **Gynecology**           | 90%          | High                | 57420, 58100, 58300 |
| **Pelvic Health**        | 55%          | Medium              | 51741, 51798        |
| **Menopause**            | 45%          | Medium              | 99213, 84443        |
| **Contraception**        | 85%          | High                | 58300, J7300, J7302 |
| **Breast Health**        | 95%          | High                | 77067, 77063        |
| **Wearables**            | 25%          | Low                 | 99453, 99454, 99457 |
| **Digital Therapeutics** | 35%          | Medium              | 98960, 99421        |

## Acquirer Strategy Analysis

### Healthcare Buyers (CVS, UnitedHealth, Walgreens)

**Fit Score:** 80-95\
**Premium:** 35-50%\
**Rationale:** Can leverage existing reimbursement infrastructure

### Pharma Buyers (J&J, Roche, Novartis)

**Fit Score:** 65-80\
**Premium:** 20-35%\
**Rationale:** Understand regulatory pathway, reimbursement processes

### Tech Buyers (Apple, Google, Amazon)

**Fit Score:** 30-50\
**Premium:** -10 to +15%\
**Rationale:** Struggle to monetize reimbursement; focus on consumer adoption

## Valuation Methodology

### Base Multiple Calculation

```
Base Multiple = Sector Median × Growth Adjustment × Profitability Adjustment
```

### Reimbursement Premium

```
If established CPT codes + high RVU:
  Premium = 1.8x

If moderate reimbursement:
  Premium = 1.4x

If consumer-only:
  Premium = 0.7x
```

### Final Multiple

```
Adjusted Multiple = Base × Reimbursement Premium × Acquirer Premium
```

## API Reference

### `CMSReimbursementConnector`

| Method                                    | Description                    |
| ----------------------------------------- | ------------------------------ |
| `matchProductToCodes(name, desc, sector)` | Match product to CPT codes     |
| `calculateReimbursementStatus(codes)`     | Determine reimbursement status |
| `calculateValuationImpact(status)`        | Calculate valuation multiple   |
| `getSectorBenchmark(sector)`              | Get sector reimbursement data  |

### `CPTCodeMatcher`

| Method                                    | Description                        |
| ----------------------------------------- | ---------------------------------- |
| `fuzzyMatch(name, desc, sector, options)` | Fuzzy match with confidence scores |
| `findCodesByProductType(type)`            | Find codes by product category     |

### `ValuationPremiumCalculator`

| Method                                   | Description                          |
| ---------------------------------------- | ------------------------------------ |
| `calculateValuation(input)`              | Full valuation calculation           |
| `compareBusinessModels(revenue, sector)` | Compare insurance vs consumer models |
| `getComparableTransactions(sector)`      | Get M&A comparables                  |
| `analyzeAcquirerFit(profile, acquirer)`  | Strategic fit analysis               |

## Data Sources

### Primary Sources

1. **CMS Physician Fee Schedule**
   - URL:
     https://www.cms.gov/medicare/medicare-fee-for-service-payment/physician-fee-schedule/overview
   - Updates: Quarterly
   - Format: CSV/Excel

2. **HCPCS Level II Codes**
   - URL: https://www.cms.gov/medicare/coding/medhcpcsgeninfo
   - Updates: Quarterly
   - Coverage indicators included

3. **CPT Codes**
   - Source: American Medical Association
   - Cached subset in repository
   - Focus: Women's health procedures

### Update Schedule

| Data           | Frequency | Source |
| -------------- | --------- | ------ |
| Medicare rates | Quarterly | CMS    |
| CPT codes      | Annual    | AMA    |
| HCPCS codes    | Quarterly | CMS    |

## Success Metrics

- ✅ Classify 70%+ of companies by reimbursement status
- ✅ Show: Reimbursement-rich commands 3-5x premium over consumer-only
- ✅ Enable: "Acquiring company can expand insurance footprint with this
  acquisition"

## Future Enhancements

- [ ] Real-time CMS API integration
- [ ] Commercial payer coverage data (Optum, Anthem)
- [ ] State-specific reimbursement variability
- [ ] Prior authorization requirements tracking
- [ ] Telehealth reimbursement updates (post-COVID)
- [ ] Digital therapeutic category 3 CPT codes

## References

1. CMS Medicare Fee Schedule:
   https://www.cms.gov/medicare/medicare-fee-for-service-payment/physician-fee-schedule/overview
2. HCPCS Codes: https://www.cms.gov/medicare/coding/medhcpcsgeninfo
3. Women's Health CPT Code Reference:
   https://www.acog.org/practice-management/coding/cpt-codes
