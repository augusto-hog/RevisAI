import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const health = { status: 'ok', database: 'ok', version: '0.1.0' }
const settings = { theme: 'dark', data_directory: 'C:/Users/test/AppData/Local/RevisAI' }

function mockApi() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/v1/health')) return Response.json(health)
    if (url.endsWith('/api/v1/settings') && init?.method === 'PATCH') {
      return Response.json({ ...settings, theme: JSON.parse(String(init.body)).theme })
    }
    if (url.endsWith('/api/v1/settings')) return Response.json(settings)
    return new Response('Not found', { status: 404 })
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RevisAI foundation', () => {
  it('shows the real empty state and backend connection status', async () => {
    vi.stubGlobal('fetch', mockApi())
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Seu espaço está pronto.' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sistema conectado')
    expect(screen.getByText(/API e banco SQLite respondendo/)).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: /Meus Estudos/ })).toBeDisabled()
  })

  it('persists the selected theme through the settings screen', async () => {
    const fetchMock = mockApi()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }))
    expect(await screen.findByRole('heading', { name: 'Armazenamento local' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Início' }))
    expect(await screen.findByRole('heading', { name: 'Seu espaço está pronto.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }))
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'light' } })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/settings'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ theme: 'light' }) }),
    ))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'))
  })

  it('explains when the local backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connection refused') }))
    render(<App />)

    expect(await screen.findByText(/Não foi possível conectar à API local/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('API indisponível')
  })
})
