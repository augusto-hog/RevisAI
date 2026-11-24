import { useCallback, useEffect, useState } from 'react'
import { BookOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { api, type Project } from '../../api'
import { ConfirmDialog, ProjectDialog } from './StudyDialogs'

export function ProjectList({ onOpen }: { onOpen: (project: Project) => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formProject, setFormProject] = useState<Project | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Project | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProjects(await api.projects())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os projetos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadProjects() }, [loadProjects])

  async function saveProject(name: string, description: string) {
    setBusy(true)
    setError('')
    try {
      if (formProject) {
        await api.updateProject(formProject.id, name, description)
        setNotice('Projeto atualizado.')
      } else {
        await api.createProject(name, description)
        setNotice('Projeto criado.')
      }
      setFormProject(undefined)
      await loadProjects()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o projeto.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteProject() {
    if (!deleting) return
    setBusy(true)
    setError('')
    try {
      await api.deleteProject(deleting.id)
      setDeleting(null)
      setNotice('Projeto excluído.')
      await loadProjects()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível excluir o projeto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-content studies-page">
      <div className="page-heading">
        <div><div className="eyebrow">SUA BIBLIOTECA DE ESTUDOS</div><h1>Meus Estudos</h1><p>Organize seus projetos, conteúdos e materiais em um só lugar.</p></div>
        <button className="button-primary" onClick={() => { setNotice(''); setFormProject(null) }}><FolderPlus size={16} /> Novo projeto</button>
      </div>
      {notice && <p className="inline-notice" role="status">{notice}</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      {loading ? (
        <div className="loading-panel" role="status">Carregando seus projetos…</div>
      ) : error && projects.length === 0 ? null : projects.length === 0 ? (
        <section className="empty-panel">
          <div className="empty-icon"><BookOpen size={22} /></div>
          <h2>Seu primeiro projeto começa aqui</h2>
          <p>Crie um projeto para organizar disciplinas, assuntos, tópicos e materiais de estudo.</p>
          <button className="button-primary" onClick={() => setFormProject(null)}><FolderPlus size={16} /> Criar primeiro projeto</button>
        </section>
      ) : (
        <section aria-labelledby="projects-list-title">
          <div className="section-title-row project-list-heading"><div><div className="eyebrow">SEUS PROJETOS</div><h2 id="projects-list-title">{projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}</h2></div></div>
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card-top"><span className="project-symbol"><BookOpen size={18} /></span><span className="project-kind">{project.kind === 'concurso' ? 'CONCURSO' : 'ESTUDOS'}</span></div>
                <h3>{project.name}</h3>
                <p className="project-description">{project.description || 'Sem descrição.'}</p>
                <div className="project-card-meta">{project.disciplines?.length ?? 0} {(project.disciplines?.length ?? 0) === 1 ? 'disciplina' : 'disciplinas'} <span>·</span> {project.materials?.length ?? 0} {(project.materials?.length ?? 0) === 1 ? 'material' : 'materiais'}</div>
                <div className="project-card-actions">
                  <button className="button-primary project-open" onClick={() => onOpen(project)}>Abrir projeto</button>
                  <button className="icon-button" aria-label={`Editar ${project.name}`} title="Editar projeto" onClick={() => setFormProject(project)}><Pencil size={15} /></button>
                  <button className="icon-button danger-icon" aria-label={`Excluir ${project.name}`} title="Excluir projeto" onClick={() => setDeleting(project)}><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {formProject !== undefined && <ProjectDialog initial={formProject ?? undefined} busy={busy} onCancel={() => setFormProject(undefined)} onSubmit={(name, description) => void saveProject(name, description)} />}
      {deleting && <ConfirmDialog title="Excluir projeto?" message={`“${deleting.name}” e todos os conteúdos vinculados serão excluídos. Essa ação não pode ser desfeita.`} busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void deleteProject()} />}
    </div>
  )
}
