import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, FileText, Image, Upload, Trash2, Eye, EyeOff } from 'lucide-react'
import { api, type Material, type UploadProgress } from '../../api'
import { ConfirmDialog } from './StudyDialogs'

const acceptedExtensions = '.pdf,.docx,.txt,.png,.jpg,.jpeg'

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`
  return `${(size / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

function formatDate(value: string | null) {
  if (!value) return 'Data indisponível'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function processingLabel(status: string) {
  if (status === 'texto_extraido') return 'Texto extraído'
  if (status === 'sem_texto_precisa_ocr') return 'Sem texto · OCR futuro'
  if (status === 'imagem_ocr_pendente') return 'Imagem armazenada · sem OCR'
  return status.replaceAll('_', ' ')
}

export function MaterialsLibrary({ projectId, maxUploadBytes }: { projectId: number; maxUploadBytes: number }) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [deleting, setDeleting] = useState<Material | null>(null)
  const [expandedText, setExpandedText] = useState<number | null>(null)
  const [textById, setTextById] = useState<Record<number, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const loadMaterials = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setMaterials(await api.materials(projectId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os materiais.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void loadMaterials() }, [loadMaterials])

  async function upload(file: File) {
    setError('')
    setNotice('')
    if (file.size > maxUploadBytes) {
      setError(`O arquivo excede o limite de ${formatSize(maxUploadBytes)} configurado pela API.`)
      return
    }
    setBusy(true)
    setProgress({ loaded: 0, total: file.size, percent: 0 })
    try {
      await api.uploadMaterial(projectId, file, setProgress)
      setNotice(`${file.name} importado com sucesso.`)
      await loadMaterials()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível importar o arquivo.')
    } finally {
      setBusy(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function toggleText(material: Material) {
    if (expandedText === material.id) {
      setExpandedText(null)
      return
    }
    setError('')
    if (!(material.format === 'pdf' || material.format === 'docx' || material.format === 'txt')) return
    try {
      const result = await api.materialText(projectId, material.id)
      setTextById((current) => ({ ...current, [material.id]: result.text }))
      setExpandedText(material.id)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível consultar o texto extraído.')
    }
  }

  async function deleteMaterial() {
    if (!deleting) return
    setBusy(true)
    setError('')
    try {
      await api.deleteMaterial(projectId, deleting.id)
      setNotice('Material excluído.')
      setDeleting(null)
      if (expandedText === deleting.id) setExpandedText(null)
      await loadMaterials()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível excluir o material.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="materials-section" aria-labelledby="materials-title">
      <div className="study-section-heading">
        <div><div className="eyebrow">ARQUIVOS DO PROJETO</div><h2 id="materials-title">Biblioteca de materiais</h2><p>PDF, DOCX, TXT, PNG ou JPG · limite de {formatSize(maxUploadBytes)} por arquivo</p></div>
        <label className={`button-primary upload-button ${busy ? 'disabled' : ''}`}>
          <Upload size={15} /> Importar arquivo
          <input ref={inputRef} type="file" accept={acceptedExtensions} disabled={busy} aria-label="Selecionar material para importar" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} />
        </label>
      </div>
      {notice && <p className="inline-notice" role="status"><Check size={14} /> {notice}</p>}
      {error && <p className="inline-error" role="alert"><AlertCircle size={15} /> {error}</p>}
      {progress && (
        <div className="upload-progress" role="status" aria-live="polite">
          <div className="upload-progress-label"><span>{progress.percent === null ? 'Enviando arquivo…' : `Enviando arquivo · ${progress.percent}%`}</span><span>{formatSize(progress.loaded)}{progress.total ? ` / ${formatSize(progress.total)}` : ''}</span></div>
          <progress aria-label="Progresso do envio" max={100} value={progress.percent ?? undefined} />
        </div>
      )}
      {loading ? <div className="loading-panel">Carregando materiais…</div> : error && materials.length === 0 ? null : materials.length === 0 ? (
        <div className="materials-empty"><FileText size={19} /><span>Nenhum material neste projeto. Importe um arquivo para consultar seus dados e o texto extraído.</span></div>
      ) : (
        <div className="material-list">
          {materials.map((material) => (
            <article className="material-card" key={material.id}>
              <div className="material-icon">{['png', 'jpg', 'jpeg'].includes(material.format) ? <Image size={17} /> : <FileText size={17} />}</div>
              <div className="material-main">
                <div className="material-name-row"><h3>{material.name}</h3><span className="format-tag">{material.format.toUpperCase()}</span></div>
                <div className="material-metadata"><span>{formatSize(material.size)}</span><span>{formatDate(material.imported_at)}</span></div>
                <span className={`processing-status ${material.status}`}><span />{processingLabel(material.status)}</span>
                {material.status === 'sem_texto_precisa_ocr' && <p className="material-hint">Este PDF não contém texto extraível. OCR será disponibilizado futuramente.</p>}
                {material.status === 'imagem_ocr_pendente' && <p className="material-hint">A imagem foi armazenada, mas ainda não possui extração de texto.</p>}
                {expandedText === material.id && <pre className="extracted-text">{textById[material.id]}</pre>}
              </div>
              <div className="material-actions">
                {material.status === 'texto_extraido' && ['pdf', 'docx', 'txt'].includes(material.format) && (
                  <button className="icon-button" onClick={() => void toggleText(material)} aria-label={`${expandedText === material.id ? 'Ocultar' : 'Ver'} texto de ${material.name}`} title={expandedText === material.id ? 'Ocultar texto' : 'Ver texto extraído'}>
                    {expandedText === material.id ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
                <button className="icon-button danger-icon" onClick={() => setDeleting(material)} aria-label={`Excluir ${material.name}`} title="Excluir material"><Trash2 size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      {deleting && <ConfirmDialog title="Excluir material?" message={`O vínculo de “${deleting.name}” com este projeto será removido. Outros projetos que usem o mesmo arquivo não serão afetados.`} busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void deleteMaterial()} />}
    </section>
  )
}
