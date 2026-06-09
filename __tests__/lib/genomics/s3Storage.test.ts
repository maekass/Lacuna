import { describe, expect, it } from 'vitest';
import { parseS3Uri } from '@/lib/genomics/s3Storage';

describe('parseS3Uri', () => {
  it('parses bucket and key (success)', () => {
    expect(parseS3Uri('s3://lacuna-variants/cohort/a.vcf.gz')).toEqual({
      bucket: 'lacuna-variants',
      key: 'cohort/a.vcf.gz',
    });
  });

  it('returns null for non-s3 URIs (edge)', () => {
    expect(parseS3Uri('file:///tmp/a.vcf')).toBeNull();
  });
});
