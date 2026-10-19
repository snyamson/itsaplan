import Link from 'next/link';

export interface DashboardRow {
  key: string | number;
  title: string;
  detail?: string;
  value: string;
  href?: string;
}

// The rows of a block, each with what it is, a line about it, and its figure.
export default function DashboardList({ rows, empty }: { rows: DashboardRow[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <ul>
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            {row.href ? (
              <Link href={row.href} className="truncate text-sm hover:underline" dir="auto">
                {row.title}
              </Link>
            ) : (
              <span className="truncate text-sm" dir="auto">
                {row.title}
              </span>
            )}
            {row.detail && (
              <span className="truncate text-xs text-muted-foreground" dir="auto">
                {row.detail}
              </span>
            )}
          </div>
          <span className="shrink-0 text-sm tabular-nums">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}
