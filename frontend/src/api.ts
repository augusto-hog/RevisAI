export type Health = {
  status: 'ok'
  database: 'ok'
  version: string
}

export type Theme = 'dark' | 'light'

export type AppSettings = {
  theme: Theme
  data_directory: string
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(3500),
  })

  if (!response.ok) {
    throw new Error(`A API respondeu com o status ${response.status}.`)
  }

  return (await response.json()) as T
}

export const api = {
  health: () => request<Health>('/api/v1/health'),
  settings: () => request<AppSettings>('/api/v1/settings'),
  updateTheme: (theme: Theme) =>
    request<AppSettings>('/api/v1/settings', {
      method: 'PATCH',
      body: JSON.stringify({ theme }),
    }),
}
