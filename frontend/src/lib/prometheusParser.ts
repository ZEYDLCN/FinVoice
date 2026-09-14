/**
 * Minimal Prometheus text-exposition-format parser — just enough to pull
 * specific metric values (with label matching) out of a `/metrics` response
 * without pulling in a full client library for what's essentially a handful
 * of regex-friendly lines.
 *
 * Format reference: https://prometheus.io/docs/instrumenting/exposition_formats/
 *   metric_name{label="value",label2="value2"} 123.45
 */
export interface ParsedSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

const LINE_PATTERN = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+(\S+)/;

export function parsePrometheusText(text: string): ParsedSample[] {
  const samples: ParsedSample[] = [];
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const match = LINE_PATTERN.exec(line.trim());
    if (!match) continue;
    const [, name, , labelsRaw, valueRaw] = match;
    const value = Number(valueRaw);
    if (Number.isNaN(value)) continue;
    samples.push({ name, labels: parseLabels(labelsRaw), value });
  }
  return samples;
}

function parseLabels(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const labels: Record<string, string> = {};
  const re = /(\w+)="((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    labels[m[1]] = m[2].replace(/\\"/g, '"');
  }
  return labels;
}

/** Sum of all samples matching `name` (and, if given, a label subset). */
export function sumMetric(
  samples: ParsedSample[],
  name: string,
  labelFilter?: Record<string, string>
): number {
  return samples
    .filter((s) => s.name === name && matchesLabels(s.labels, labelFilter))
    .reduce((acc, s) => acc + s.value, 0);
}

/** Groups a counter/gauge's samples by one label, summing values per group. */
export function groupByLabel(
  samples: ParsedSample[],
  name: string,
  label: string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of samples) {
    if (s.name !== name) continue;
    const key = s.labels[label] ?? "unknown";
    out[key] = (out[key] ?? 0) + s.value;
  }
  return out;
}

/** Average of a Histogram's `_sum` / `_count` — i.e. mean observed value. */
export function histogramAverage(samples: ParsedSample[], baseName: string): number | null {
  const sum = sumMetric(samples, `${baseName}_sum`);
  const count = sumMetric(samples, `${baseName}_count`);
  if (count === 0) return null;
  return sum / count;
}

function matchesLabels(labels: Record<string, string>, filter?: Record<string, string>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => labels[k] === v);
}
