export function Donut({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((acc, segment) => acc + segment.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
          {total > 0 &&
            segments.map((segment) => {
              const length = (segment.value / total) * circumference;
              const dash = `${Math.max(length - 2, 0)} ${circumference - Math.max(length - 2, 0)}`;
              const element = (
                <circle
                  key={segment.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold text-slate-900">{centerValue}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {centerLabel}
          </p>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate text-slate-600">{segment.label}</span>
            </span>
            <span className="font-medium text-slate-900">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({
  items,
  emptyLabel = "Belum ada data",
}: {
  items: { label: string; value: number }[];
  emptyLabel?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  if (items.length === 0) return <p className="px-5 py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;

  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-slate-700">{item.label}</span>
            <span className="shrink-0 text-slate-500">{item.value} orang</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
