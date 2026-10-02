import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StoneCanvas } from '@/components/stone/StoneCanvas'
import { Panel } from '@/components/ui/Panel'

export function TransformationPage() {
  const [activeTab, setActiveTab] = useState<'animation' | 'timeline'>('animation')
  const [split, setSplit] = useState(50)

  return (
    <Panel title="Transformatie">
      <div className="mb-5 flex gap-1 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-1">
        <button
          type="button"
          onClick={() => setActiveTab('animation')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm transition ${activeTab === 'animation' ? 'bg-[rgba(200,169,122,0.16)] text-[var(--text-main)] shadow-[inset_0_-2px_var(--gold)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'}`}
        >
          Animatie
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm transition ${activeTab === 'timeline' ? 'bg-[rgba(200,169,122,0.16)] text-[var(--text-main)] shadow-[inset_0_-2px_var(--gold)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'}`}
        >
          Tijdlijn
        </button>
      </div>

      {activeTab === 'animation' ? (
        <>
          <div className="relative h-[26rem] overflow-hidden rounded-2xl border border-[var(--line)] bg-[radial-gradient(circle_at_50%_42%,rgba(181,146,94,0.22),rgba(5,9,13,0.98)_68%)] sm:h-[34rem]">
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
              <StoneCanvas stage={52} progress={100} className="h-full rounded-none border-0" />
            </div>
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
              <StoneCanvas stage={0} progress={0} className="h-full rounded-none border-0" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-[var(--text-main)]/80" style={{ left: `${split}%` }}>
              <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--text-main)] bg-[rgba(5,9,13,0.92)] text-2xl text-[var(--text-main)]">
                ‹›
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={split}
              onChange={(event) => setSplit(Number(event.target.value))}
              aria-label="Vergelijk ruwe en gevormde steen"
              className="absolute inset-x-0 bottom-0 z-20 h-full w-full cursor-ew-resize opacity-0"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-4 bg-gradient-to-t from-[rgba(5,9,13,0.9)] to-transparent px-5 pb-5 pt-16 sm:px-8">
              <div>
                <p className="font-serif text-lg text-[var(--text-main)]">Waar je begint</p>
                <p className="text-sm text-[var(--text-subtle)]">is niet waar je eindigt.</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-lg text-[var(--text-main)]">Dezelfde steen.</p>
                <p className="text-sm text-[var(--text-subtle)]">Een helderder vorm.</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-[var(--text-subtle)]">Sleep de scheidslijn om je transformatie te bekijken.</p>
        </>
      ) : (
        <div className="space-y-3">
          {[
            ['Dag 1', 'De ruwe steen', 'Je begint met aandacht voor wat er al is.'],
            ['Dag 91', 'De eerste vorm', 'Je leert patronen herkennen zonder ze direct te veranderen.'],
            ['Dag 182', 'Het midden van de reis', 'Onderzoek wordt een gewoonte en aandacht krijgt richting.'],
            ['Dag 273', 'Heldere kanten', 'Wat eerst vanzelfsprekend leek, krijgt nieuwe betekenis.'],
            ['Dag 365', 'Een gevormde steen', 'De reis eindigt niet; je neemt het werk mee.'],
          ].map(([day, title, description]) => (
            <div key={day} className="grid grid-cols-[5rem_1fr] gap-4 rounded-xl border border-[var(--line)] bg-[rgba(10,15,22,0.7)] p-4">
              <span className="text-sm text-[var(--gold-muted)]">{day}</span>
              <div>
                <h3 className="font-serif text-lg text-[var(--text-main)]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-subtle)]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/steen" className="mt-6 inline-flex rounded-full border border-[var(--gold)] px-5 py-2.5 text-sm text-[var(--text-main)] transition hover:bg-[rgba(200,169,122,0.12)]">
        Terug naar mijn steen
      </Link>
    </Panel>
  )
}