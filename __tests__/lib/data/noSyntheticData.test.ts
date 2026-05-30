import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(__dirname, '../../../src');

/** Patterns that indicate fabricated M&A or outcome panels in app code. */
const FORBIDDEN_IN_SRC = [
  /\bmaDeals\b/,
  /\bVALIDATION_DATA\b/,
  /\bpreAcquisitionOAIS\b/,
  /\bAlpha Health\b/,
  /\bBig Pharma Co\b/,
  /expectedScaling:\s*[\d.]+/,
  /actualScaling:\s*[\d.]+/,
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('no synthetic M&A demo data in src/', () => {
  it('does not contain known synthetic deal panels or maDeals stubs', () => {
    const files = walk(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_IN_SRC) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(SRC_ROOT, file)} matched ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('test fixtures use verified JSON slice', () => {
  it('minimalVerifiedDataset references real verified company names', async () => {
    const { minimalVerifiedDataset } = await import('../../helpers/fixtures');
    expect(minimalVerifiedDataset.companies.some((c) => c.name === 'Modern Fertility')).toBe(true);
    expect(minimalVerifiedDataset.acquisitions[0].targetName).toBe('Modern Fertility');
    expect(minimalVerifiedDataset.provenance.sources.length).toBeGreaterThan(0);
  });
});
