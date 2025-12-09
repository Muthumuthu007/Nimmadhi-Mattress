import { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const gradientClasses = [
  'from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 border-l-4 border-indigo-500 dark:border-indigo-400',
  'from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/30 dark:via-orange-900/30 dark:to-red-900/30 border-l-4 border-orange-500 dark:border-orange-400',
  'from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/30 dark:via-green-900/30 dark:to-teal-900/30 border-l-4 border-green-500 dark:border-green-400',
];

const iconBgClasses = [
  'bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-800/50 dark:to-indigo-900/50',
  'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800/50 dark:to-orange-900/50',
  'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800/50 dark:to-green-900/50',
];

const iconColorClasses = [
  'text-indigo-600 dark:text-indigo-300',
  'text-orange-600 dark:text-orange-300',
  'text-green-600 dark:text-green-300',
];

// Animated counter hook
const useAnimatedCounter = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(startValue + (end - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
};

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend }) => {
  const colorIndex = title.length % 3;
  const numericValue = typeof value === 'number' ? value : parseInt(String(value)) || 0;
  const animatedValue = useAnimatedCounter(numericValue, 1200);
  const displayValue = typeof value === 'number' ? animatedValue : value;

  return (
    <div className={`bg-gradient-to-br ${gradientClasses[colorIndex]} rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">{title}</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1 transition-all duration-300">
            {displayValue}
          </p>
          {trend && (
            <div className={`flex items-center mt-3 text-sm font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
              <span className="flex items-center bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-4 ${iconBgClasses[colorIndex]} rounded-2xl shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
          <Icon className={`w-8 h-8 ${iconColorClasses[colorIndex]}`} />
        </div>
      </div>
    </div>
  );
};