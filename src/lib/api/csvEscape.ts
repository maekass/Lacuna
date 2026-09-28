export function csvEscape(value: string): string {
  const raw = value ?? "";
  const needsNeutralize = /^[=+\-@\t\r]/.test(raw);
  const safe = needsNeutralize ? `'${raw}` : raw;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}
