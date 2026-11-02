import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

export const CircularScore = ({ score }: { score: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'text-red-500';
  if (score >= 80) color = 'text-emerald-500';
  else if (score >= 60) color = 'text-blue-500';
  else if (score >= 40) color = 'text-amber-500';

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle cx="48" cy="48" r={radius} className="stroke-current text-neutral-100 dark:text-neutral-800" strokeWidth="8" fill="transparent" />
        <circle
          cx="48" cy="48" r={radius}
          className={`stroke-current ${color} transition-all duration-1000 ease-out`}
          strokeWidth="8" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-neutral-900 dark:text-white leading-none">{score}</span>
        <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5">Score</span>
      </div>
    </div>
  );
};

export const KPICard = ({ label, value, trend, icon: Icon }: { label: string; value: string | number; trend?: number; icon: LucideIcon }) => (
  <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 flex items-start gap-3 shadow-sm">
    <div className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-md shrink-0 text-neutral-600 dark:text-neutral-400">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="flex items-end gap-2 mt-0.5">
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
        {trend ? (
          <span className={`text-[10px] font-medium flex items-center ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
    </div>
  </div>
);

export const formatCOP = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 0 });

export const inputClass = 'w-full px-3 py-1.5 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 rounded-md text-sm outline-none focus:border-indigo-500';
export const labelClass = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1';
