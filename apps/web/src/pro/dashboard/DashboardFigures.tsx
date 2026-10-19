// The headline numbers of a block, each over what it counts.
export default function DashboardFigures({
  figures,
}: {
  figures: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4">
      {figures.map((figure) => (
        <div key={figure.label} className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{figure.value}</p>
          <p className="text-xs text-muted-foreground">{figure.label}</p>
        </div>
      ))}
    </div>
  );
}
