'use client';

import { Bar, BarChart, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// One measure as bars: a day each over the window, or one per state. The bars take the
// primary colour; the tooltip names the bar and gives its value in the block's unit.
export default function DashboardBars({
  data,
  label,
  format,
}: {
  data: { label: string; value: number }[];
  label: string;
  format: (value: number) => string;
}) {
  return (
    // Recharts draws to absolute SVG coordinates and does not read the document direction.
    <ChartContainer
      dir="ltr"
      config={{ value: { label, color: 'var(--primary)' } }}
      className="h-28 w-full"
    >
      <BarChart data={data} barCategoryGap={2}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={11}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)' }}
          content={
            <ChartTooltipContent formatter={(value) => `${label}: ${format(Number(value))}`} />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} minPointSize={1} />
      </BarChart>
    </ChartContainer>
  );
}
