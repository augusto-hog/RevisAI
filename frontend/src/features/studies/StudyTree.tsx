import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, CirclePlus, Pencil, Trash2 } from 'lucide-react'
import { api, type Discipline, type Subject, type Topic } from '../../api'
import { ConfirmDialog, NameDialog } from './StudyDialogs'

type NodeEditor = {
  kind: 'discipline' | 'subject' | 'topic'
  id?: number
  parentId?: number
  name?: string
  position?: number
}
type DeleteAction = { title: string; message: string; run: () => Promise<void> }

export function StudyTree({ projectId, disciplines, onChanged }: {
  projectId: number
  disciplines: Discipline[]
  onChanged: () => Promise<void>
}) {
  const [editor, setEditor] = useState<NodeEditor | null>(null)
  const [deleteAction, setDeleteAction] = useState<DeleteAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      await onChanged()
      setNotice(success)
      setEditor(null)
      setDeleteAction(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar a organização.')
    } finally {
      setBusy(false)
    }
  }

  async function saveNode(name: string) {
    if (!editor) return
    const { kind, id, parentId, position = 0 } = editor
    await perform(async () => {
      if (kind === 'discipline') return id ? api.updateDiscipline(id, name, position) : api.createDiscipline(projectId, name)
      if (kind === 'subject') return id ? api.updateSubject(id, name, position) : api.createSubject(parentId!, name)
      return id ? api.updateTopic(id, name, position) : api.createTopic(parentId!, name)
    }, id ? 'Item atualizado.' : 'Item adicionado.')
  }

  function askDelete(title: string, message: string, run: () => Promise<void>) {
    setDeleteAction({ title, message, run })
  }

  function move<T extends { id: number }>(siblings: T[], index: number, direction: -1 | 1, reorder: (ids: number[]) => Promise<unknown>) {
    const target = index + direction
    if (target < 0 || target >= siblings.length) return
    const ids = siblings.map((item) => item.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void perform(() => reorder(ids), 'Ordem atualizada.')
  }

  return (
    <section className="study-tree-section" aria-labelledby="organization-title">
      <div className="study-section-heading">
        <div><div className="eyebrow">ORGANIZAÇÃO DO ESTUDO</div><h2 id="organization-title">Disciplinas e tópicos</h2></div>
        <button className="button-secondary" onClick={() => setEditor({ kind: 'discipline' })}><CirclePlus size={15} /> Adicionar disciplina</button>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {notice && <p className="inline-notice" role="status">{notice}</p>}
      {disciplines.length === 0 ? (
        <div className="tree-empty">Nenhuma disciplina ainda. Adicione uma para começar a organizar este projeto.</div>
      ) : (
        <div className="discipline-list">
          {disciplines.map((discipline, disciplineIndex) => (
            <details className="discipline-node" key={discipline.id} open>
              <summary><ChevronDown className="tree-chevron" size={15} /><span className="tree-node-title">{discipline.name}</span><span className="tree-count">{discipline.subjects.length} assuntos</span></summary>
              <div className="tree-actions">
                <button className="icon-button" aria-label={`Mover ${discipline.name} para cima`} disabled={disciplineIndex === 0 || busy} onClick={() => move(disciplines, disciplineIndex, -1, (ids) => api.reorderDisciplines(projectId, ids))}><ArrowUp size={14} /></button>
                <button className="icon-button" aria-label={`Mover ${discipline.name} para baixo`} disabled={disciplineIndex === disciplines.length - 1 || busy} onClick={() => move(disciplines, disciplineIndex, 1, (ids) => api.reorderDisciplines(projectId, ids))}><ArrowDown size={14} /></button>
                <button className="icon-button" aria-label={`Renomear ${discipline.name}`} onClick={() => setEditor({ kind: 'discipline', id: discipline.id, name: discipline.name, position: discipline.position })}><Pencil size={14} /></button>
                <button className="icon-button danger-icon" aria-label={`Excluir ${discipline.name}`} onClick={() => askDelete('Excluir disciplina?', `A disciplina “${discipline.name}” e seus assuntos e tópicos serão excluídos.`, () => api.deleteDiscipline(discipline.id))}><Trash2 size={14} /></button>
                <button className="tree-add-button" onClick={() => setEditor({ kind: 'subject', parentId: discipline.id })}><CirclePlus size={14} /> Assunto</button>
              </div>
              {discipline.subjects.length === 0 ? <p className="tree-child-empty">Nenhum assunto cadastrado.</p> : (
                <div className="subject-list">
                  {discipline.subjects.map((subject, subjectIndex) => (
                    <SubjectNode key={subject.id} subject={subject} index={subjectIndex} siblings={discipline.subjects} busy={busy}
                      onEdit={(item) => setEditor({ kind: 'subject', id: item.id, name: item.name, position: item.position })}
                      onDelete={(item) => askDelete('Excluir assunto?', `O assunto “${item.name}” e seus tópicos serão excluídos.`, () => api.deleteSubject(item.id))}
                      onMove={(index, direction) => move(discipline.subjects, index, direction, (ids) => api.reorderSubjects(discipline.id, ids))}
                      onAddTopic={(item) => setEditor({ kind: 'topic', parentId: item.id })}
                      onEditTopic={(item) => setEditor({ kind: 'topic', id: item.id, name: item.name, position: item.position })}
                      onDeleteTopic={(item) => askDelete('Excluir tópico?', `O tópico “${item.name}” será excluído.`, () => api.deleteTopic(item.id))}
                      onMoveTopic={(topicSiblings, index, direction) => move(topicSiblings, index, direction, (ids) => api.reorderTopics(subject.id, ids))} />
                  ))}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
      {editor && <NameDialog title={`${editor.id ? 'Renomear' : 'Adicionar'} ${editor.kind === 'discipline' ? 'disciplina' : editor.kind === 'subject' ? 'assunto' : 'tópico'}`} label="Nome" initialValue={editor.name} busy={busy} onCancel={() => setEditor(null)} onSubmit={(name) => void saveNode(name)} />}
      {deleteAction && <ConfirmDialog title={deleteAction.title} message={deleteAction.message} busy={busy} onCancel={() => setDeleteAction(null)} onConfirm={() => void perform(deleteAction.run, 'Item excluído.')} />}
    </section>
  )
}

function SubjectNode({
  subject, index, siblings, busy, onEdit, onDelete, onMove, onAddTopic, onEditTopic, onDeleteTopic, onMoveTopic,
}: {
  subject: Subject
  index: number
  siblings: Subject[]
  busy: boolean
  onEdit: (subject: Subject) => void
  onDelete: (subject: Subject) => void
  onMove: (index: number, direction: -1 | 1) => void
  onAddTopic: (subject: Subject) => void
  onEditTopic: (topic: Topic) => void
  onDeleteTopic: (topic: Topic) => void
  onMoveTopic: (siblings: Topic[], index: number, direction: -1 | 1) => void
}) {
  return (
    <details className="subject-node" open>
      <summary><ChevronDown className="tree-chevron" size={14} /><span className="tree-node-title">{subject.name}</span><span className="tree-count">{subject.topics.length} tópicos</span></summary>
      <div className="tree-actions">
        <button className="icon-button" aria-label={`Mover ${subject.name} para cima`} disabled={index === 0 || busy} onClick={() => onMove(index, -1)}><ArrowUp size={13} /></button>
        <button className="icon-button" aria-label={`Mover ${subject.name} para baixo`} disabled={index === siblings.length - 1 || busy} onClick={() => onMove(index, 1)}><ArrowDown size={13} /></button>
        <button className="icon-button" aria-label={`Renomear ${subject.name}`} onClick={() => onEdit(subject)}><Pencil size={13} /></button>
        <button className="icon-button danger-icon" aria-label={`Excluir ${subject.name}`} onClick={() => onDelete(subject)}><Trash2 size={13} /></button>
        <button className="tree-add-button" onClick={() => onAddTopic(subject)}><CirclePlus size={13} /> Tópico</button>
      </div>
      {subject.topics.length === 0 ? <p className="tree-child-empty">Nenhum tópico cadastrado.</p> : (
        <ul className="topic-list">
          {subject.topics.map((topic, topicIndex) => (
            <li className="topic-node" key={topic.id}>
              <span className="topic-dot" /><span className="topic-name">{topic.name}</span>
              <div className="tree-actions topic-actions">
                <button className="icon-button" aria-label={`Mover ${topic.name} para cima`} disabled={topicIndex === 0 || busy} onClick={() => onMoveTopic(subject.topics, topicIndex, -1)}><ArrowUp size={12} /></button>
                <button className="icon-button" aria-label={`Mover ${topic.name} para baixo`} disabled={topicIndex === subject.topics.length - 1 || busy} onClick={() => onMoveTopic(subject.topics, topicIndex, 1)}><ArrowDown size={12} /></button>
                <button className="icon-button" aria-label={`Renomear ${topic.name}`} onClick={() => onEditTopic(topic)}><Pencil size={12} /></button>
                <button className="icon-button danger-icon" aria-label={`Excluir ${topic.name}`} onClick={() => onDeleteTopic(topic)}><Trash2 size={12} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
