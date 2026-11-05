import type { CheckInScoreField } from './check-in.types'

interface ScoreSliderProps {
  label: string
  description: string
  field: CheckInScoreField
  value: number
  onChange: (field: CheckInScoreField, value: number) => void
}

export function ScoreSlider({ label, description, field, value, onChange }: ScoreSliderProps) {
  return (
    <div className="score-control">
      <div className="score-control-heading">
        <div>
          <label htmlFor={`score-${field}`} className="score-label">{label}</label>
          <p className="score-description">{description}</p>
        </div>
        <output className="score-value" htmlFor={`score-${field}`} aria-live="polite">{value}</output>
      </div>
      <input
        id={`score-${field}`}
        type="range"
        min="1"
        max="10"
        step="1"
        value={value}
        aria-valuetext={`${value} van 10`}
        onChange={(event) => onChange(field, Number(event.currentTarget.value))}
      />
      <div className="score-scale" aria-hidden="true">
        <span>Laag</span>
        <span>Hoog</span>
      </div>
    </div>
  )
}

export function ScoreSummary({
  values,
}: {
  values: Pick<Record<CheckInScoreField, number>, CheckInScoreField>
}) {
  const items: { field: CheckInScoreField; label: string }[] = [
    { field: 'mood', label: 'Stemming' },
    { field: 'energy', label: 'Energie' },
    { field: 'mentalCalm', label: 'Mentale rust' },
    { field: 'satisfaction', label: 'Tevredenheid' },
  ]

  return (
    <div className="score-summary">
      {items.map(({ field, label }) => (
        <div className="score-summary-item" key={field}>
          <span>{label}</span>
          <strong>{values[field]}<small>/10</small></strong>
        </div>
      ))}
    </div>
  )
}
