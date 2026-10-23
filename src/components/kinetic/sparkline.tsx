import { cn } from '@/lib/utils'

export function Sparkline({
  data,
  id,
  color = 'var(--volt)',
  className,
}: {
  data: number[]
  id: string
  color?: string
  className?: string
}) {
  const width = 100
  const height = 40
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - 3 - ((value - min) / range) * (height - 8)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const line = `M${points.join(' L')}`
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('animate-draw overflow-visible', className)}
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="[filter:drop-shadow(0_0_6px_color-mix(in_oklab,var(--volt)_55%,transparent))]"
      />
    </svg>
  )
}
