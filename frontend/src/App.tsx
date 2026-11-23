import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  FolderOpen,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import { api, type AppSettings, type Health, type Theme } from './api'

type Page = 'home' | 'settings'
type Connection = 'checking' | 'online' | 'offline'

const futureNavigation = [
  { label: 'Meus Estudos', icon: FolderOpen, note: 'Etapa 2' },
  { label: 'Revisões', icon: BookOpenCheck, note: 'Etapa 5' },
  { label: 'Metas', icon: Target, note: 'Etapa 5' },
]

function App() {
  const [page, setPage] = useState<Page>('home')
  const [connection, setConnection] = useState<Connection>('checking')
  const [health, setHealth] = useState<Health | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [settingsError, setSettingsError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const refreshStatus = useCallback(async () => {
    setConnection('checking')
    try {
      const [healthResult, settingsResult] = await Promise.all([api.health(), api.settings()])
      setHealth(healthResult)
      setSettings(settingsResult)
      setConnection('online')
      setSettingsError('')
    } catch {
      setHealth(null)
      setConnection('offline')
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme ?? 'dark'
  }, [settings?.theme])

  async function changeTheme(theme: Theme) {
    setIsSaving(true)
    setSettingsError('')
    try {
      const savedSettings = await api.updateTheme(theme)
      setSettings(savedSettings)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Não foi possível salvar a preferência.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><GraduationCap size={21} strokeWidth={2.2} /></div>
          <span className="brand-name">Revis<span>AI</span></span>
        </div>

        <div className="sidebar-label">ESPAÇO DE ESTUDO</div>
        <nav className="primary-nav" aria-label="Seções do aplicativo">
          <button className={`nav-item ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}>
            <LayoutDashboard size={18} />
            <span>Início</span>
          </button>
          {futureNavigation.map(({ label, icon: Icon, note }) => (
            <button className="nav-item future" key={label} disabled title={`Planejado para a ${note}`}>
              <Icon size={18} />
              <span>{label}</span>
              <span className="nav-note">{note}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
            <Settings2 size={18} />
            <span>Configurações</span>
          </button>
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span>Seus dados ficam<br />no seu computador.</span>
          </div>
          <div className="version-label">VERSÃO 0.1.0 · ETAPA 1</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>RevisAI</span><ChevronRight size={14} /><strong>{page === 'home' ? 'Início' : 'Configurações'}</strong></div>
          <div className={`connection-pill ${connection}`} role="status" aria-live="polite">
            <span className="connection-dot" />
            {connection === 'checking' ? 'Verificando API' : connection === 'online' ? 'Sistema conectado' : 'API indisponível'}
          </div>
        </header>

        {page === 'home' ? (
          <HomePage connection={connection} health={health} onRefresh={() => void refreshStatus()} />
        ) : (
          <SettingsPage
            connection={connection}
            health={health}
            settings={settings}
            isSaving={isSaving}
            error={settingsError}
            onRefresh={() => void refreshStatus()}
            onThemeChange={(theme) => void changeTheme(theme)}
          />
        )}
      </main>
    </div>
  )
}

function HomePage({ connection, health, onRefresh }: { connection: Connection; health: Health | null; onRefresh: () => void }) {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEU CANTINHO DE ESTUDOS</div>
          <h1>Bom ter você por aqui.</h1>
          <p>Um passo de cada vez. Seu próximo ciclo de estudos começa quando você quiser.</p>
        </div>
        <div className="heading-art" aria-hidden="true"><Sparkles size={20} /><span>Foco no que importa</span></div>
      </div>

      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-illustration" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="book-stack"><BookOpen size={46} strokeWidth={1.35} /></div>
          <span className="sparkle sparkle-a">✦</span><span className="sparkle sparkle-b">✧</span>
        </div>
        <div className="welcome-copy">
          <div className="welcome-tag"><span /> COMEÇO DE UMA NOVA JORNADA</div>
          <h2 id="welcome-title">Seu espaço está pronto.</h2>
          <p>Aqui você vai organizar seus estudos, reunir materiais e acompanhar o que precisa revisar — tudo no seu ritmo.</p>
          <div className="welcome-footnote"><Clock3 size={15} /> Sem pressa. O importante é continuar.</div>
        </div>
      </section>

      <div className="section-title-row">
        <div><div className="eyebrow">VISÃO GERAL</div><h2>Seu progresso</h2></div>
        <span className="coming-tag">EM CONSTRUÇÃO</span>
      </div>

      <div className="overview-grid" aria-label="Resumo das áreas de estudo">
        <OverviewCard icon={FolderOpen} label="Projetos de estudo" stage="ETAPA 2" text="Seus estudos organizados por projeto." />
        <OverviewCard icon={BookOpenCheck} label="Revisões" stage="ETAPA 5" text="Pontos importantes para rever." />
        <OverviewCard icon={Target} label="Meta semanal" stage="ETAPA 5" text="Um plano que cabe na sua rotina." />
      </div>

      <section className={`backend-card ${connection}`} aria-labelledby="backend-title">
        <div className="backend-icon"><Activity size={18} /></div>
        <div className="backend-copy">
          <h3 id="backend-title">Serviço local</h3>
          <p>{connection === 'online' ? `API e banco SQLite respondendo · versão ${health?.version}` : connection === 'checking' ? 'Conferindo a conexão com o backend local…' : 'Não foi possível conectar à API local. Confira se o backend está em execução.'}</p>
        </div>
        <button className="quiet-button" onClick={onRefresh} disabled={connection === 'checking'}>
          <RefreshCw size={15} className={connection === 'checking' ? 'spin' : ''} />
          Verificar
        </button>
      </section>

      <div className="page-footer"><span>REVISAI · SEU ESTUDO, NO SEU TEMPO</span><span>Feito para manter o foco no que importa.</span></div>
    </div>
  )
}

function OverviewCard({ icon: Icon, label, stage, text }: { icon: typeof FolderOpen; label: string; stage: string; text: string }) {
  return (
    <article className="overview-card">
      <div className="overview-card-top"><div className="overview-icon"><Icon size={17} /></div><span>{stage}</span></div>
      <h3>{label}</h3><p>{text}</p>
      <div className="overview-card-bottom"><span>Disponível em breve</span><ArrowUpRight size={15} /></div>
    </article>
  )
}

function SettingsPage({
  connection, health, settings, isSaving, error, onRefresh, onThemeChange,
}: {
  connection: Connection
  health: Health | null
  settings: AppSettings | null
  isSaving: boolean
  error: string
  onRefresh: () => void
  onThemeChange: (theme: Theme) => void
}) {
  return (
    <div className="page-content settings-page">
      <div className="page-heading compact-heading">
        <div><div className="eyebrow">PREFERÊNCIAS DO APLICATIVO</div><h1>Configurações</h1><p>O essencial para deixar seu espaço do seu jeito.</p></div>
      </div>

      <section className="settings-section" aria-labelledby="appearance-title">
        <div className="settings-section-icon"><Sparkles size={18} /></div>
        <div className="settings-section-content">
          <div className="eyebrow">APARÊNCIA</div>
          <h2 id="appearance-title">Tema do aplicativo</h2>
          <p>Escolha como prefere visualizar o RevisAI. Sua preferência fica salva neste computador.</p>
          <label className="select-label" htmlFor="theme-select">Tema</label>
          <select id="theme-select" value={settings?.theme ?? 'dark'} onChange={(event) => onThemeChange(event.target.value as Theme)} disabled={!settings || isSaving}>
            <option value="dark">Escuro</option><option value="light">Claro</option>
          </select>
          {isSaving && <span className="save-state" role="status"><Check size={14} /> Salvando preferência…</span>}
          {error && <p className="error-message" role="alert">{error}</p>}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="local-data-title">
        <div className="settings-section-icon"><ShieldCheck size={18} /></div>
        <div className="settings-section-content">
          <div className="eyebrow">PRIVACIDADE E DADOS</div>
          <h2 id="local-data-title">Armazenamento local</h2>
          <p>As configurações e os dados do RevisAI ficam no diretório local do seu usuário.</p>
          <div className="path-value"><FileText size={15} /><code>{settings?.data_directory ?? 'Aguardando conexão com o backend'}</code></div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="system-title">
        <div className="settings-section-icon"><Gauge size={18} /></div>
        <div className="settings-section-content">
          <div className="eyebrow">SISTEMA</div>
          <h2 id="system-title">Conexão com o backend</h2>
          <p>O frontend conversa apenas com a API local do RevisAI.</p>
          <div className="system-status-row">
            <span className={`status-indicator ${connection}`} />
            <span>{connection === 'online' ? `Conectado · API ${health?.version}` : connection === 'checking' ? 'Verificando conexão…' : 'API indisponível'}</span>
            <button className="quiet-button" onClick={onRefresh} disabled={connection === 'checking'}><RefreshCw size={15} /> Verificar</button>
          </div>
        </div>
      </section>

      <div className="settings-note"><CircleHelp size={16} /><span>Mais opções de configuração serão adicionadas conforme o aplicativo evoluir.</span></div>
      <div className="page-footer"><span>REVISAI · SEU ESTUDO, NO SEU TEMPO</span><span>Configurações salvas localmente.</span></div>
    </div>
  )
}

export default App
