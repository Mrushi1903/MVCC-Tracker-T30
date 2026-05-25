'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'

type Point = { match_number: number; pts: number; label: string }

export default function PointsChart({
  data,
  color,
  borderColor,
  seasonAvg,
}: {
  data: Point[]
  color: string
  borderColor: string
  seasonAvg: number
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 16, bottom: 12, left: -10 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="match_number"
          tick={{ fill: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
          tickFormatter={(v) => `M${v}`}
        />
        <YAxis
          tick={{ fill: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
          width={36}
        />
        <ReferenceLine
          y={seasonAvg}
          stroke="rgba(255,255,255,0.2)"
          strokeDasharray="3 3"
          label={{
            value: `Avg ${seasonAvg.toFixed(0)}`,
            position: 'right',
            fill: '#64748B',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
          }}
        />
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
          contentStyle={{
            background: 'rgba(15,21,40,0.95)',
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            fontFamily: 'JetBrains Mono',
            fontSize: 12,
            color: '#E2E8F0',
          }}
          labelFormatter={(v, payload) => {
            const item = payload?.[0]?.payload as { label?: string } | undefined
            return item?.label ?? `M${v}`
          }}
          formatter={(v) => [`${v} pts`, ''] as [string, string]}
        />
        <Line
          type="monotone"
          dataKey="pts"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: color, stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
