/**
 * Pick one annual CMS vintage so reimbursement is not the sum of multiple years.
 */

export interface VintageKeyedObservation {
  cptCode: string;
  dataYear: number;
}

export interface LatestVintageSelection<T extends VintageKeyedObservation> {
  vintage: number | null;
  rows: T[];
  droppedOlderYearCount: number;
  droppedDuplicateCodeCount: number;
}

/**
 * Keep the latest `dataYear` only, then the first row per CPT code.
 */
export function selectLatestVintageObservations<
  T extends VintageKeyedObservation,
>(rows: T[]): LatestVintageSelection<T> {
  if (rows.length === 0) {
    return {
      vintage: null,
      rows: [],
      droppedOlderYearCount: 0,
      droppedDuplicateCodeCount: 0,
    };
  }

  const vintage = Math.max(...rows.map((row) => row.dataYear));
  const latest = rows.filter((row) => row.dataYear === vintage);
  const byCode = new Map<string, T>();
  let droppedDuplicateCodeCount = 0;
  for (const row of latest) {
    if (byCode.has(row.cptCode)) {
      droppedDuplicateCodeCount += 1;
      continue;
    }
    byCode.set(row.cptCode, row);
  }

  return {
    vintage,
    rows: [...byCode.values()],
    droppedOlderYearCount: rows.length - latest.length,
    droppedDuplicateCodeCount,
  };
}
