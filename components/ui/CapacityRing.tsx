'use client'

interface CapacityRingProps {
  seated: number
  capacity: number
  size?: number
}

export function CapacityRing({ seated, capacity, size = 120 }: CapacityRingProps) {
  const pct = capacity > 0 ? Math.min(seated / capacity, 1) : 0
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const color = pct >= 1 ? '#dc3545' : pct >= 0.8 ? '#fd7e14' : '#0d6efd'

  return (
    <div className="d-flex flex-column align-items-center">
      <svg width={size} height={size} className="position-relative">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#dee2e6" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.18} fontWeight="bold" fill={color}>
          {seated}
        </text>
        <text x={size / 2} y={size / 2 + size * 0.14} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.11} fill="#6c757d">
          / {capacity}
        </text>
      </svg>
      <span className="badge mt-1" style={{ backgroundColor: color }}>
        {pct >= 1 ? 'FULL' : `${capacity - seated} left`}
      </span>
    </div>
  )
}
