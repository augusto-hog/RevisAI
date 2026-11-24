export type Health = {
  status: 'ok'
  database: 'ok'
  version: string
}

export type Theme = 'dark' | 'light'

export type AppSettings = {
  theme: Theme
  data_directory: string
  max_upload_bytes: number
}

export type Topic = { id: number; name: string; position: number }
export type Subject = { id: number; name: string; position: number; topics: Topic[] }
export type Discipline = { id: number; name: string; position: number; subjects: Subject[] }
export type Material = {
  id: number
  project_id: number
  name: string
  format: string
  size: number
  imported_at: string | null
  status: string
  sha256: string
  storage_id: string
  extracted_text: string
}
export type ProjectSummary = {
  id: number
  name: string
  description: string
  kind: 'livre' | 'concurso'
  created_at: string | null
}
export type Project = ProjectSummary & {
  disciplines: Discipline[]
  materials: Material[]
}
export type ProjectDetail = ProjectSummary & { disciplines: Discipline[] }
export type UploadProgress = { loaded: number; total: number; percent: number | null }

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8765').replace(/\/$/, '')

async function responseError(response: Response): Promise<ApiError> {
  let message = `A API respondeu com o status ${response.status}.`
  try {
    const payload: unknown = await response.json()
    if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
      const detail = payload.detail
      if (typeof detail === 'string') message = detail
      else if (Array.isArray(detail)) message = detail.map((item) => typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)).join(' ')
    }
  } catch {
    // Keep the HTTP status message when the backend did not return JSON.
  }
  return new ApiError(message, response.status)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      signal: init?.signal ?? AbortSignal.timeout(10000),
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new Error('Não foi possível conectar à API local. Confira se o backend está em execução na porta 8765.')
  }
  if (!response.ok) throw await responseError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function uploadFile(projectId: number, file: File, onProgress: (progress: UploadProgress) => void): Promise<Material> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const body = new FormData()
    body.append('file', file)
    xhr.open('POST', `${apiBaseUrl}/api/v1/projects/${projectId}/materials`)
    xhr.timeout = 120000
    xhr.upload.onprogress = (event) => onProgress({
      loaded: event.loaded,
      total: event.total,
      percent: event.lengthComputable && event.total > 0 ? Math.round((event.loaded / event.total) * 100) : null,
    })
    xhr.onload = () => {
      let payload: unknown
      try { payload = JSON.parse(xhr.responseText) as unknown } catch { payload = null }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload as Material)
      else {
        const detail = typeof payload === 'object' && payload !== null && 'detail' in payload ? payload.detail : null
        reject(new ApiError(typeof detail === 'string' ? detail : `Falha no envio (${xhr.status}).`, xhr.status))
      }
    }
    xhr.onerror = () => reject(new Error('Não foi possível conectar à API local durante o envio.'))
    xhr.ontimeout = () => reject(new Error('O envio excedeu o tempo limite.'))
    xhr.onabort = () => reject(new Error('O envio foi cancelado.'))
    xhr.send(body)
  })
}

export const api = {
  health: () => request<Health>('/api/v1/health'),
  settings: () => request<AppSettings>('/api/v1/settings'),
  updateTheme: (theme: Theme) => request<AppSettings>('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ theme }) }),
  projects: () => request<Project[]>('/api/v1/projects'),
  project: (id: number) => request<ProjectDetail>(`/api/v1/projects/${id}`),
  createProject: (name: string, description: string) => request<ProjectSummary>('/api/v1/projects', { method: 'POST', body: JSON.stringify({ name, description }) }),
  updateProject: (id: number, name: string, description: string) => request<Project>(`/api/v1/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) }),
  deleteProject: (id: number) => request<void>(`/api/v1/projects/${id}`, { method: 'DELETE' }),
  createDiscipline: (projectId: number, name: string) => request<Discipline>(`/api/v1/projects/${projectId}/disciplines`, { method: 'POST', body: JSON.stringify({ name }) }),
  updateDiscipline: (id: number, name: string, position: number) => request<Discipline>(`/api/v1/disciplines/${id}`, { method: 'PATCH', body: JSON.stringify({ name, position }) }),
  deleteDiscipline: (id: number) => request<void>(`/api/v1/disciplines/${id}`, { method: 'DELETE' }),
  reorderDisciplines: (projectId: number, ids: number[]) => request<void>(`/api/v1/projects/${projectId}/disciplines/order`, { method: 'PUT', body: JSON.stringify({ ids }) }),
  createSubject: (disciplineId: number, name: string) => request<Subject>(`/api/v1/disciplines/${disciplineId}/subjects`, { method: 'POST', body: JSON.stringify({ name }) }),
  updateSubject: (id: number, name: string, position: number) => request<Subject>(`/api/v1/subjects/${id}`, { method: 'PATCH', body: JSON.stringify({ name, position }) }),
  deleteSubject: (id: number) => request<void>(`/api/v1/subjects/${id}`, { method: 'DELETE' }),
  reorderSubjects: (disciplineId: number, ids: number[]) => request<void>(`/api/v1/disciplines/${disciplineId}/subjects/order`, { method: 'PUT', body: JSON.stringify({ ids }) }),
  createTopic: (subjectId: number, name: string) => request<Topic>(`/api/v1/subjects/${subjectId}/topics`, { method: 'POST', body: JSON.stringify({ name }) }),
  updateTopic: (id: number, name: string, position: number) => request<Topic>(`/api/v1/topics/${id}`, { method: 'PATCH', body: JSON.stringify({ name, position }) }),
  deleteTopic: (id: number) => request<void>(`/api/v1/topics/${id}`, { method: 'DELETE' }),
  reorderTopics: (subjectId: number, ids: number[]) => request<void>(`/api/v1/subjects/${subjectId}/topics/order`, { method: 'PUT', body: JSON.stringify({ ids }) }),
  materials: (projectId: number) => request<Material[]>(`/api/v1/projects/${projectId}/materials`),
  material: (projectId: number, materialId: number) => request<Material & { text: string }>(`/api/v1/projects/${projectId}/materials/${materialId}`),
  materialText: (projectId: number, materialId: number) => request<{ material_id: number; text: string; status: string }>(`/api/v1/projects/${projectId}/materials/${materialId}/text`),
  uploadMaterial: (projectId: number, file: File, onProgress: (progress: UploadProgress) => void) => uploadFile(projectId, file, onProgress),
  deleteMaterial: (projectId: number, materialId: number) => request<void>(`/api/v1/projects/${projectId}/materials/${materialId}`, { method: 'DELETE' }),
}
