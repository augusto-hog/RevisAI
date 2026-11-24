import { useEffect, useState, type FormEvent } from 'react'

export function NameDialog({
  title, label = 'Nome', initialValue = '', busy = false, onCancel, onSubmit,
}: {
  title: string
  label?: string
  initialValue?: string
  busy?: boolean
  onCancel: () => void
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => setValue(initialValue), [initialValue])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="name-dialog-title" onSubmit={submit}>
        <h2 id="name-dialog-title">{title}</h2>
        <label htmlFor="node-name">{label}</label>
        <input id="node-name" autoFocus maxLength={160} value={value} onChange={(event) => setValue(event.target.value)} />
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="submit" className="button-primary" disabled={busy || !value.trim()}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  )
}

export function ProjectDialog({
  initial, busy = false, onCancel, onSubmit,
}: {
  initial?: { name: string; description: string }
  busy?: boolean
  onCancel: () => void
  onSubmit: (name: string, description: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) onSubmit(name.trim(), description.trim())
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog-card project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" onSubmit={submit}>
        <h2 id="project-dialog-title">{initial ? 'Editar projeto' : 'Novo projeto'}</h2>
        <label htmlFor="project-name">Nome do projeto</label>
        <input id="project-name" autoFocus maxLength={120} value={name} onChange={(event) => setName(event.target.value)} required />
        <label htmlFor="project-description">Descrição <span className="optional-label">opcional</span></label>
        <textarea id="project-description" rows={3} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} />
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="submit" className="button-primary" disabled={busy || !name.trim()}>{busy ? 'Salvando…' : 'Salvar projeto'}</button>
        </div>
      </form>
    </div>
  )
}

export function ConfirmDialog({
  title, message, confirmLabel = 'Excluir', busy = false, onCancel, onConfirm,
}: {
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="button-secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button className="button-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Excluindo…' : confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}
