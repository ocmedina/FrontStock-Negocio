export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Quick Actions skeleton */}
      <div className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl" />

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Balance section */}
      <div className="h-48 bg-gray-100 dark:bg-slate-800/50 rounded-xl" />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 p-4">
            <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-32" />
                  <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
