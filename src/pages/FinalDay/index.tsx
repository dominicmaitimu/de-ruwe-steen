import { Link } from 'react-router-dom'
import { StoneCanvas } from '@/components/stone/StoneCanvas'
import { Panel } from '@/components/ui/Panel'

export function FinalDayPage() {
  return (
    <Panel title="Dag 365 van 365" subtitle="Een terugblik op de reis.">
      <StoneCanvas stage={52} />
      <p className="mx-auto mt-6 max-w-md text-center font-serif text-lg italic leading-relaxed text-[var(--text-main)]">
        Je bent niet een andere steen. Je ziet nu gewoon beter wat er al die tijd in zat.
      </p>
      <div className="mt-6 flex justify-center">
        <Link to="/voortgang" className="rounded-xl border border-[var(--gold)] bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-[var(--ink)]">Terugblik op je reis</Link>
      </div>
    </Panel>
  )
}