interface Stats {
  total: number
  newToday: number
  deals: number
}

interface StatCardProps {
  value: number
  label: string
  colorClass: string
  active?: boolean
  onClick?: () => void
}

function StatCard({ value, label, colorClass, active, onClick }: StatCardProps) {
  const interactive = Boolean(onClick)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`text-left bg-gray-900 border rounded-xl p-4 sm:p-5 transition-colors ${
        interactive ? 'cursor-pointer' : 'cursor-default'
      } ${
        active
          ? 'border-orange-500'
          : interactive
            ? 'border-gray-800 hover:border-gray-600'
            : 'border-gray-800'
      }`}
    >
      <div className={`text-3xl font-bold tabular-nums ${colorClass}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </button>
  )
}

export default function StatsBar({
  stats,
  activeFilters,
  onToggle,
}: {
  stats: Stats
  activeFilters?: { inStockOnly: boolean; newOnly: boolean; dealsOnly: boolean }
  onToggle?: { inStockOnly: () => void; newOnly: () => void; dealsOnly: () => void }
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <StatCard
        value={stats.total}
        label="Active listings in stock"
        colorClass="text-white"
        active={activeFilters?.inStockOnly}
        onClick={onToggle?.inStockOnly}
      />
      <StatCard
        value={stats.newToday}
        label="New today"
        colorClass="text-orange-400"
        active={activeFilters?.newOnly}
        onClick={onToggle?.newOnly}
      />
      <StatCard
        value={stats.deals}
        label="Deals (under market)"
        colorClass="text-emerald-400"
        active={activeFilters?.dealsOnly}
        onClick={onToggle?.dealsOnly}
      />
    </div>
  )
}
