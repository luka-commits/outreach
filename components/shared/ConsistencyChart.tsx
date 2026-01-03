import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface ChartDataPoint {
  name: string;
  score: number;
  raw?: number;
}

interface ConsistencyChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  showTitle?: boolean;
}

/**
 * Reusable 7-day consistency chart component.
 * Shows daily goal achievement percentage as an area chart.
 */
const ConsistencyChart: React.FC<ConsistencyChartProps> = ({
  data,
  title = 'Daily Consistency (Last 7 Days)',
  height = 300,
  showTitle = true,
}) => {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 font-medium"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div className="w-full">
      {showTitle && (
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-6 px-4">
          {title}
        </h3>
      )}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              cursor={{ stroke: '#2563eb', strokeWidth: 2 }}
              formatter={(value) => [`${value}% Goal Achieved`, 'Performance']}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#2563eb"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorScore)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(ConsistencyChart);
