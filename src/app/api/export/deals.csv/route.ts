import { NextResponse } from 'next/server';
import { getVerifiedDataset } from '@/lib/data/datasetProvider';

function csvEscape(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET() {
  const dataset = await getVerifiedDataset();
  const { acquisitions } = dataset;

  const header = [
    'id',
    'announcedDate',
    'closedDate',
    'dealType',
    'targetName',
    'acquirerName',
    'dealValue_millions',
    'dealValueNote',
    'source',
    'strategicRationale',
  ];

  const rows = acquisitions.map((d) => [
    d.id,
    d.announcedDate,
    d.closedDate ?? '',
    d.dealType,
    d.targetName,
    d.acquirerName,
    typeof d.dealValue === 'number' ? String(d.dealValue) : '',
    d.dealValueNote ?? '',
    d.source ?? '',
    d.strategicRationale,
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map((v) => csvEscape(v)).join(','))
    .join('\n');

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="lacuna-deals.csv"',
    },
  });
}
