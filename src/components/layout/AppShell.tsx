import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/voortgang', label: 'Reis' },
  { to: '/steen', label: 'Mijn Steen' },
  { to: '/reflectie', label: 'Reflectie' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const isHomeSection = pathname === '/' || pathname === '/vraag' || pathname === '/antwoord'
  const isStoneSection = pathname === '/steen' || pathname === '/transformatie'

  return (
    <div className="min-h-screen w-full bg-[rgba(5,9,13,0.32)] pb-24 pt-4 sm:pb-10 sm:pt-6 lg:pl-24 lg:pt-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-[var(--line)] bg-[rgba(6,11,15,0.94)] px-2 py-5 backdrop-blur-xl lg:flex xl:w-56 xl:px-4">
        <div className="flex flex-col items-center border-b border-[var(--line)] pb-5 xl:items-start xl:px-2">
          <div className="grid size-10 place-items-center rounded-full border border-[var(--gold-muted)] text-xl text-[var(--gold)]">⌁</div>
          <p className="mt-2 hidden text-center font-serif text-sm text-[var(--text-main)] xl:block">De Ruwe Steen</p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-2">
          {[
            { to: '/', label: 'Home', icon: '⌂' },
            { to: '/voortgang', label: 'Reis', icon: '✦' },
            { to: '/steen', label: 'Steen', icon: '◇' },
            { to: '/reflectie', label: 'Reflectie', icon: '▤' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-center gap-3 rounded-lg px-2 py-3 text-xs transition xl:justify-start xl:px-3 ${(item.to === '/' ? isHomeSection : item.to === '/steen' ? isStoneSection : isActive) ? 'bg-[rgba(200,169,122,0.16)] text-[var(--gold)]' : 'text-[var(--text-subtle)] hover:bg-white/[0.04] hover:text-[var(--text-main)]'}`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="hidden xl:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--line)] pt-4">
          <p className="mb-3 hidden truncate px-3 text-[10px] text-[var(--text-subtle)] xl:block">{user?.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-3 rounded-lg px-2 py-3 text-xs text-[var(--text-subtle)] transition hover:bg-white/[0.04] hover:text-[var(--text-main)] xl:justify-start xl:px-3"
          >
            <span>↪</span><span className="hidden xl:inline">Uitloggen</span>
          </button>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:max-w-none lg:px-10 lg:py-7 xl:px-14">
      <header className="mb-6 border-b border-[var(--line)] bg-[rgba(8,12,16,0.76)] px-1 pb-4 backdrop-blur-sm sm:mb-8 sm:rounded-2xl sm:border sm:p-5 lg:hidden">
        <div className="flex items-center justify-between gap-4 sm:items-end lg:flex-row">
          <div>
            <p className="hidden text-sm uppercase tracking-[0.18em] text-[var(--gold-muted)] sm:block">
              365 dagen. Een steen.
            </p>
            <h1 className="text-3xl text-[var(--text-main)] sm:text-5xl">De Ruwe Steen</h1>
            <p className="mt-1 hidden max-w-2xl text-[var(--text-subtle)] sm:block">
              Neem de tijd. Kijk wat er werkelijk achter je antwoord zit.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-[var(--text-subtle)]">{user?.email}</p>
            <nav className="hidden flex-wrap gap-2 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full border px-4 py-2 text-sm transition',
                      (item.to === '/' ? isHomeSection : item.to === '/steen' ? isStoneSection : isActive)
                        ? 'border-[var(--gold)] bg-[rgba(200,169,122,0.16)] text-[var(--text-main)]'
                        : 'border-[var(--line)] text-[var(--text-subtle)] hover:border-[var(--gold-muted)] hover:text-[var(--text-main)]',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-subtle)] transition hover:border-[var(--gold-muted)] hover:text-[var(--text-main)]"
              >
                Uitloggen
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        <Outlet />
      </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[rgba(7,11,15,0.95)] px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {[
            { to: '/', label: 'Home', icon: '⌂' },
            { to: '/voortgang', label: 'Reis', icon: '✦' },
            { to: '/steen', label: 'Steen', icon: '◇' },
            { to: '/reflectie', label: 'Reflectie', icon: '▤' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-14 flex-col items-center gap-0.5 text-[10px] ${(item.to === '/' ? isHomeSection : item.to === '/steen' ? isStoneSection : isActive) ? 'text-[var(--gold)]' : 'text-[var(--text-subtle)]'}`
              }
            >
              <span className="text-base leading-5">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
