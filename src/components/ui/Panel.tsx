import type { PropsWithChildren } from 'react'

type PanelProps = PropsWithChildren<{
  title: string
  subtitle?: string
}>

export function Panel({ title, subtitle, children }: PanelProps) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[rgba(7,12,18,0.75)] p-6 shadow-panel">
      <header className="mb-4">
        <h2 className="text-3xl text-[var(--text-main)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[var(--text-subtle)]">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  )
}
