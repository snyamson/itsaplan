import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// One widget of the dashboard: a quiet title over its body, with no card around it.
export default function DashboardBlock({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('flex min-w-0 flex-col', className)}>
      <h3 className="mb-4 truncate border-b border-border/60 pb-2 text-sm font-semibold tracking-tight">
        {title}
      </h3>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
