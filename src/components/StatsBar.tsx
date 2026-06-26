interface Stats {
  total: number
  newToday: number
  priceDrops: number
}

interface StatCardProps {
  value: number
  label: string
  colorClass: string
}

function StatCard({ value, label, colorClass }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
      <div className={`text-3xl font-bold tabular-nums ${colorClass}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )
}

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <StatCard value={stats.total} label="Active listings in stock" colorClass="text-white" />
      <StatCard value={stats.newToday} label="New today" colorClass="text-orange-400" />
      <StatCard value={stats.priceDrops} label="Price drops today" colorClass="text-green-400" />
    </div>
  )
}
