# Data & LLM Usage Documentation

## Overview

This document describes how Lacuna uses data sources and LLM (Large Language Model) integrations for its analytics systems.

---

## Data Sources

### 1. Verified Dataset (`dataset.verified.json`)
- **Source**: Manually curated from SEC EDGAR, press releases, and public filings
- **Size**: ~100KB, 70+ companies, 30+ verified acquisitions
- **Contains**: Company names, sectors, funding, acquisition details, acquirer types
- **Usage**: Primary dataset for all analyses
- **Update**: Manual verification process

### 2. CMS Reimbursement Data
**Files:**
- `cached-cpt-codes.json` (8.5KB) - 27 CPT codes for women's health
- `cached-hcpcs-codes.json` (5.1KB) - 24 HCPCS supply codes

**Sources:**
- CMS Physician Fee Schedule (PFS)
- HCPCS Level II codes
- Medicare RVU data

**APIs Used:**
- ClinicalTrials.gov API (REST)
- openFDA API (REST)

**Data Usage:**
- Stored locally for performance
- No PII or patient data
- Public domain government data

### 3. External APIs

| API | Purpose | Rate Limits | Data Cached |
|-----|---------|-------------|-------------|
| ClinicalTrials.gov | Trial phases, status, results | 5 req/sec | Yes (24h) |
| openFDA | FDA clearances, approvals | No limit | Yes (24h) |
| SEC EDGAR | Acquisition filings | 10 req/sec | Yes (manual) |

---

## LLM Integration

### Current LLM Usage: None

**Lacuna does NOT currently use LLMs for:**
- Data generation
- Predictive modeling
- Synthetic data creation
- Automated classification

### Deterministic Systems Only

All analyses use deterministic algorithms:

```
Reimbursement Score: Fuzzy matching + CPT code lookup
Evidence Maturity: Rule-based scoring (0-100)
Valuation Multiples: Mathematical formulas
Founder Patterns: Statistical correlation
```

### Why No LLMs?

1. **Transparency**: Deterministic systems are auditable
2. **Reproducibility**: Same inputs = same outputs
3. **Verification**: Results can be manually checked
4. **Regulatory**: Financial analysis requires explainability

---

## Data Privacy & Compliance

### What We Store
- Company names (public)
- Funding amounts (public)
- Acquisition values (public filings)
- Clinical trial metadata (public)
- FDA clearance data (public)

### What We DON'T Store
- Personal information
- Patient health data
- Proprietary financial data
- Private communications

### Compliance
- **GDPR**: No EU personal data collected
- **HIPAA**: No PHI accessed
- **SEC**: Only public filings used
- **BUSL 1.1**: Open source license

---

## MCP (Model Context Protocol) Architecture

### What is MCP?
MCP provides structured data access for AI systems without direct LLM integration.

### Our MCP Connectors

#### 1. ClinicalTrials MCP
```typescript
// Data: Trial phases, enrollment, results
// Output: Structured trial profiles
// No LLM processing - direct API → JSON
```

#### 2. openFDA MCP
```typescript
// Data: FDA clearances, device classes
// Output: Regulatory status
// No LLM processing - direct API → JSON
```

#### 3. Reimbursement MCP
```typescript
// Data: CPT codes, RVU values
// Output: Insurance coverage scores
// No LLM processing - cached JSON → scoring algorithm
```

### MCP Benefits
- **Standardized outputs** for any downstream system
- **Deterministic transformations**
- **Cacheable results**
- **Version controlled**

---

## Data Flow Architecture

```
┌─────────────────┐
│  External APIs  │
│  (CT.gov, FDA)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Connectors │
│  (TypeScript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Processed JSON │
│  (Deterministic)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Analysis       │
│  (Statistical)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Visualization  │
│  (React/D3)     │
└─────────────────┘
```

---

## If Adding LLM in Future

### Recommended Approach

```typescript
// LLM for natural language queries only
// NOT for data generation or prediction

interface LLMUsage {
  allowed: [
    'user_question_answering',
    'text_summarization',
    'documentation_generation'
  ];
  
  prohibited: [
    'data_synthesis',
    'predictive_modeling',
    'synthetic_data_generation',
    'automated_classification'
  ];
}
```

### LLM Data Guardrails

1. **Input validation**: Sanitize all inputs
2. **Output verification**: Human review of critical outputs
3. **Audit logging**: Track all LLM interactions
4. **Rate limiting**: Prevent abuse
5. **No PII**: Strip personal identifiers

---

## Usage Statistics (Estimates)

### API Calls
- ClinicalTrials.gov: ~100 calls/day (development)
- openFDA: ~50 calls/day (development)
- SEC EDGAR: ~20 calls/month (manual)

### Data Storage
- Cached CPT/HCPCS: ~14KB
- Verified dataset: ~100KB
- Analysis outputs: ~50KB

### Compute
- Deterministic calculations: <1s per company
- Full dataset analysis: <5s

---

## Cost Analysis

### Current (No LLM)
- External APIs: Free (government/public data)
- Compute: Minimal (client-side calculations)
- Storage: <1MB
- **Total: $0/month**

### With LLM (Hypothetical)
If adding GPT-4 for Q&A:
- Input tokens: ~1K per query
- Output tokens: ~500 per query
- 100 queries/day
- **Estimated: $50-100/month**

---

## Security Considerations

### Data Access
- All data is public domain
- No authentication required for APIs
- Client-side only (no server storing data)

### API Keys
- None required (public APIs)
- Rate limiting handled via client-side caching

### CORS
- Browser-based API calls
- Some APIs require CORS proxy (handled by Next.js)

---

## Future LLM Integration Plan

### Phase 1: Documentation (Current)
- AI-generated method docs
- Code explanations
- User-facing explanations

### Phase 2: Q&A Assistant (Future)
- Natural language interface
- Query understanding
- Answer generation from structured data

### Phase 3: Analysis Summaries (Future)
- Automated insight generation
- Report writing
- Trend descriptions

**Note**: All future LLM uses would be for presentation/summarization only, never for core analytical calculations.

---

## Questions?

For data usage questions:
- GitHub Issues: github.com/maekass/Lacuna
- Email: maekass@example.com

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-02 | Initial documentation | Cascade |
| 2026-06-02 | Added MCP architecture | Cascade |

---

## License

BUSL 1.1 - See LICENSE file
