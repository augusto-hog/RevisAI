import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, Pencil, Trash2 } from 'lucide-react'
import { api, type ProjectDetail as ProjectDetailType } from '../../api'
import { MaterialsLibrary } from './MaterialsLibrary'
import { ConfirmDialog, ProjectDialog } from './StudyDialogs'
import { StudyTree } from './StudyTree'

export function ProjectDetail({ projectId, maxUploadBytes, onBack }: {
  projectId: number
  maxUploadBytes: number
  onBack: () => void
}) {
  const [project, setProject] = useState<ProjectDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [revision, setRevision] = useState(0)

  const loadProject = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      setProject(await api.project(projectId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível abrir este projeto.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void loadProject() }, [loadProject, revision])

  async function saveProject(name: string, description: string) {
    if (!project) return
    setBusy(true)
    setError('')
    try {
      await api.updateProject(project.id, name, description)
      setEditing(false)
      setRevision((current) => current + 1)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o projeto.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteProject() {
    setBusy(true)
    setError('')
    try {
      await api.deleteProject(projectId)
      onBack()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível excluir o projeto.')
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page-content"><div className="loading-panel" role="status">Carregando projeto…</div></div>
  if (error && !project) return <div className="page-content"><button className="back-button" onClick={onBack}><ArrowLeft size={15} /> Meus Estudos</button><p className="inline-error" role="alert">{error}</p></div>
  if (!project) return null

  return (
    <div className="page-content project-detail-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={15} /> Meus Estudos</button>
      <div className="project-detail-heading">
        <div className="project-detail-icon"><BookOpen size={20} /></div>
        <div className="project-detail-title"><div className="eyebrow">PROJETO DE ESTUDO</div><h1>{project.name}</h1><p>{project.description || 'Sem descrição.'}</p></div>
        <div className="project-detail-actions">
          <button className="button-secondary" onClick={() => setEditing(true)}><Pencil size={14} /> Editar</button>
          <button className="button-danger-outline" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Excluir</button>
        </div>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <StudyTree projectId={project.id} disciplines={project.disciplines} onChanged={() => loadProject(false)} />
      <MaterialsLibrary projectId={project.id} maxUploadBytes={maxUploadBytes} />
      <div className="page-footer"><span>REVISAI · SEU ESTUDO, NO SEU TEMPO</span><span>Seus materiais permanecem neste computador.</span></div>
      {editing && <ProjectDialog initial={{ name: project.name, description: project.description }} busy={busy} onCancel={() => setEditing(false)} onSubmit={(name, description) => void saveProject(name, description)} />}
      {confirmDelete && <ConfirmDialog title="Excluir projeto?" message={`“${project.name}” e sua hierarquia de estudos serão excluídos. Os materiais vinculados também serão removidos deste projeto.`} busy={busy} onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteProject()} />}
    </div>
  )
}
