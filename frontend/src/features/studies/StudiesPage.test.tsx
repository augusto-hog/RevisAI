import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { Discipline, Material, Project } from '../../api'

const settings = { theme: 'dark' as const, data_directory: 'C:/temp/RevisAI', max_upload_bytes: 1024 * 1024 }

function projectRecord(id: number, name: string): Project {
  return { id, name, description: '', kind: 'livre', created_at: '2026-11-24T10:00:00', disciplines: [], materials: [] }
}

function apiMock(initialProjects: Project[] = [], options: { failUpload?: boolean } = {}) {
  let projects = initialProjects
  let materials: Material[] = []
  let nextId = 20
  const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const path = url.pathname
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
    const json = (data: unknown, status = 200) => Response.json(data, { status })
    const empty = () => new Response(null, { status: 204 })

    if (path.endsWith('/api/v1/health')) return json({ status: 'ok', database: 'ok', version: '0.1.0' })
    if (path.endsWith('/api/v1/settings') && method === 'PATCH') return json({ ...settings, theme: body.theme })
    if (path.endsWith('/api/v1/settings')) return json(settings)
    if (path === '/api/v1/projects' && method === 'GET') return json(projects)
    if (path === '/api/v1/projects' && method === 'POST') {
      const project = projectRecord(++nextId, String(body.name))
      project.description = String(body.description ?? '')
      projects = [...projects, project]
      return json(project, 201)
    }
    const projectPath = path.match(/^\/api\/v1\/projects\/(\d+)$/)
    if (projectPath && method === 'PATCH') {
      const id = Number(projectPath[1])
      projects = projects.map((project) => project.id === id ? { ...project, name: String(body.name ?? project.name), description: String(body.description ?? project.description) } : project)
      return json(projects.find((project) => project.id === id) ?? {}, 200)
    }
    if (projectPath && method === 'DELETE') {
      projects = projects.filter((project) => project.id !== Number(projectPath[1]))
      return empty()
    }
    const detailPath = path.match(/^\/api\/v1\/projects\/(\d+)$/)
    if (detailPath && method === 'GET') {
      const project = projects.find((entry) => entry.id === Number(detailPath[1]))
      return project ? json({ id: project.id, name: project.name, description: project.description, kind: project.kind, created_at: project.created_at, disciplines: project.disciplines }) : json({ detail: 'Projeto não encontrado.' }, 404)
    }
    const disciplineCreate = path.match(/^\/api\/v1\/projects\/(\d+)\/disciplines$/)
    if (disciplineCreate && method === 'POST') {
      const discipline: Discipline = { id: ++nextId, name: String(body.name), position: 0, subjects: [] }
      projects = projects.map((project) => project.id === Number(disciplineCreate[1]) ? { ...project, disciplines: [...project.disciplines, discipline] } : project)
      return json(discipline, 201)
    }
    const disciplineUpdate = path.match(/^\/api\/v1\/disciplines\/(\d+)$/)
    if (disciplineUpdate && method === 'PATCH') {
      const id = Number(disciplineUpdate[1])
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((item) => item.id === id ? { ...item, name: String(body.name ?? item.name), position: Number(body.position ?? item.position) } : item) }))
      return json(projects.flatMap((project) => project.disciplines).find((item) => item.id === id) ?? {}, 200)
    }
    const disciplineReorder = path.match(/^\/api\/v1\/projects\/(\d+)\/disciplines\/order$/)
    if (disciplineReorder && method === 'PUT') {
      const ids = body.ids as number[]
      projects = projects.map((project) => project.id === Number(disciplineReorder[1]) ? { ...project, disciplines: ids.map((id, position) => ({ ...project.disciplines.find((item) => item.id === id)!, position })) } : project)
      return json(ids.map((id, position) => ({ id, position })))
    }
    const subjectCreate = path.match(/^\/api\/v1\/disciplines\/(\d+)\/subjects$/)
    if (subjectCreate && method === 'POST') {
      const subject = { id: ++nextId, name: String(body.name), position: 0, topics: [] }
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => discipline.id === Number(subjectCreate[1]) ? { ...discipline, subjects: [...discipline.subjects, subject] } : discipline) }))
      return json(subject, 201)
    }
    const subjectUpdate = path.match(/^\/api\/v1\/subjects\/(\d+)$/)
    if (subjectUpdate && method === 'PATCH') {
      const id = Number(subjectUpdate[1])
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => ({ ...discipline, subjects: discipline.subjects.map((item) => item.id === id ? { ...item, name: String(body.name ?? item.name), position: Number(body.position ?? item.position) } : item) })) }))
      return json(projects.flatMap((project) => project.disciplines).flatMap((discipline) => discipline.subjects).find((item) => item.id === id) ?? {}, 200)
    }
    const subjectReorder = path.match(/^\/api\/v1\/disciplines\/(\d+)\/subjects\/order$/)
    if (subjectReorder && method === 'PUT') {
      const ids = body.ids as number[]
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => discipline.id === Number(subjectReorder[1]) ? { ...discipline, subjects: ids.map((id, position) => ({ ...discipline.subjects.find((item) => item.id === id)!, position })) } : discipline) }))
      return json(ids.map((id, position) => ({ id, position })))
    }
    const topicCreate = path.match(/^\/api\/v1\/subjects\/(\d+)\/topics$/)
    if (topicCreate && method === 'POST') {
      const topic = { id: ++nextId, name: String(body.name), position: 0 }
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => ({ ...discipline, subjects: discipline.subjects.map((subject) => subject.id === Number(topicCreate[1]) ? { ...subject, topics: [...subject.topics, topic] } : subject) })) }))
      return json(topic, 201)
    }
    const topicUpdate = path.match(/^\/api\/v1\/topics\/(\d+)$/)
    if (topicUpdate && method === 'PATCH') {
      const id = Number(topicUpdate[1])
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => ({ ...discipline, subjects: discipline.subjects.map((subject) => ({ ...subject, topics: subject.topics.map((item) => item.id === id ? { ...item, name: String(body.name ?? item.name), position: Number(body.position ?? item.position) } : item) })) })) }))
      return json(projects.flatMap((project) => project.disciplines).flatMap((discipline) => discipline.subjects).flatMap((subject) => subject.topics).find((item) => item.id === id) ?? {}, 200)
    }
    const disciplineDelete = path.match(/^\/api\/v1\/disciplines\/(\d+)$/)
    if (disciplineDelete && method === 'DELETE') {
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.filter((discipline) => discipline.id !== Number(disciplineDelete[1])) }))
      return empty()
    }
    const subjectDelete = path.match(/^\/api\/v1\/subjects\/(\d+)$/)
    if (subjectDelete && method === 'DELETE') {
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => ({ ...discipline, subjects: discipline.subjects.filter((subject) => subject.id !== Number(subjectDelete[1])) })) }))
      return empty()
    }
    const topicDelete = path.match(/^\/api\/v1\/topics\/(\d+)$/)
    if (topicDelete && method === 'DELETE') {
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => ({ ...discipline, subjects: discipline.subjects.map((subject) => ({ ...subject, topics: subject.topics.filter((topic) => topic.id !== Number(topicDelete[1])) })) })) }))
      return empty()
    }
    const topicReorder = path.match(/^\/api\/v1\/subjects\/(\d+)\/topics\/order$/)
    if (topicReorder && method === 'PUT') {
      const ids = body.ids as number[]
      projects = projects.map((project) => ({ ...project, disciplines: project.disciplines.map((discipline) => ({ ...discipline, subjects: discipline.subjects.map((subject) => subject.id === Number(topicReorder[1]) ? { ...subject, topics: ids.map((id, position) => ({ ...subject.topics.find((item) => item.id === id)!, position })) } : subject) })) }))
      return json(ids.map((id, position) => ({ id, position })))
    }
    if (path.endsWith('/materials') && method === 'GET') return json(materials)
    if (path.endsWith('/materials') && method === 'POST') return json({ detail: 'Formato inválido.' }, 415)
    const textPath = path.match(/^\/api\/v1\/projects\/(\d+)\/materials\/(\d+)\/text$/)
    if (textPath) return json({ material_id: Number(textPath[2]), text: 'Texto extraído para o teste.', status: 'texto_extraido' })
    const deleteMaterial = path.match(/^\/api\/v1\/projects\/(\d+)\/materials\/(\d+)$/)
    if (deleteMaterial && method === 'DELETE') {
      materials = materials.filter((material) => material.id !== Number(deleteMaterial[2]))
      return empty()
    }
    return json({ detail: 'Rota de teste não configurada.' }, 404)
  })
  return {
    request,
    getProjects: () => projects,
    getMaterials: () => materials,
    setMaterials: (value: Material[]) => { materials = value },
    nextId: () => ++nextId,
    failUpload: options.failUpload ?? false,
  }
}

class TestUploadRequest {
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
  status = 0
  responseText = ''
  timeout = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null
  private url = ''

  constructor(private readonly state: ReturnType<typeof apiMock>) {}
  open(_method: string, url: string) { this.url = url }
  send(body: FormData) {
    const file = body.get('file') as File
    this.upload.onprogress?.({ lengthComputable: true, loaded: file.size, total: file.size } as ProgressEvent)
    if (this.state.failUpload) {
      this.status = 415
      this.responseText = JSON.stringify({ detail: 'Formato inválido.' })
    } else {
      const projectId = Number(this.url.match(/projects\/(\d+)/)?.[1])
      const material: Material = { id: this.state.nextId(), project_id: projectId, name: file.name, format: file.name.split('.').pop() ?? 'txt', size: file.size, imported_at: '2026-11-24T10:00:00', status: 'texto_extraido', sha256: 'hash', storage_id: 'storage', extracted_text: 'Texto extraído para o teste.' }
      this.state.setMaterials([...this.state.getMaterials(), material])
      this.status = 201
      this.responseText = JSON.stringify(material)
    }
    setTimeout(() => this.onload?.(), 80)
  }
}

function setup(initialProjects: Project[] = [], options: { failUpload?: boolean } = {}) {
  const state = apiMock(initialProjects, options)
  vi.stubGlobal('fetch', state.request)
  vi.stubGlobal('XMLHttpRequest', class extends TestUploadRequest { constructor() { super(state) } })
  render(<App />)
  return state
}

async function openStudies() {
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Seções do aplicativo' })).getByRole('button', { name: 'Meus Estudos' }))
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Meus Estudos e biblioteca', () => {
  it('lista, cria, edita projeto e exige confirmação antes de excluir', async () => {
    const state = setup()
    await openStudies()
    expect(await screen.findByText('Seu primeiro projeto começa aqui')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Novo projeto' }))
    fireEvent.change(screen.getByLabelText('Nome do projeto'), { target: { value: 'Estoicismo' } })
    fireEvent.change(screen.getByLabelText(/Descrição/), { target: { value: 'Filosofia antiga' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar projeto' }))
    expect(await screen.findByRole('heading', { name: 'Estoicismo' })).toBeInTheDocument()
    expect(screen.getByText('Filosofia antiga')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Editar Estoicismo' }))
    fireEvent.change(screen.getByLabelText('Nome do projeto'), { target: { value: 'Estoicismo clássico' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar projeto' }))
    expect(await screen.findByRole('heading', { name: 'Estoicismo clássico' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Estoicismo clássico' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(state.request).not.toHaveBeenCalledWith(expect.stringMatching(/projects\/21$/), expect.objectContaining({ method: 'DELETE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Estoicismo clássico' }))
    fireEvent.click(screen.getByRole('alertdialog').querySelector('.button-danger')!)
    expect(await screen.findByText('Seu primeiro projeto começa aqui')).toBeInTheDocument()
  })

  it('abre a hierarquia, cria disciplina, assunto e tópico e reordena tópicos', async () => {
    const project = projectRecord(1, 'Estoicismo')
    setup([project])
    await openStudies()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir projeto' }))
    expect(await screen.findByRole('heading', { name: 'Disciplinas e tópicos' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar disciplina' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Filosofia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Filosofia')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Assunto' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Estoicismo antigo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Estoicismo antigo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tópico' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Virtude' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Virtude')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tópico' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Autodomínio' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Autodomínio')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mover Autodomínio para cima' }))
    await waitFor(() => expect(screen.getByRole('list').textContent).toMatch(/Autodomínio.*Virtude/))
  })

  it('renomeia e reordena disciplinas, assuntos e tópicos pela API', async () => {
    const project = projectRecord(1, 'Estoicismo')
    project.disciplines = [
      { id: 2, name: 'Filosofia', position: 0, subjects: [
        { id: 3, name: 'Ética', position: 0, topics: [{ id: 4, name: 'Virtude', position: 0 }, { id: 5, name: 'Coragem', position: 1 }] },
        { id: 6, name: 'Lógica', position: 1, topics: [] },
      ] },
      { id: 9, name: 'História', position: 1, subjects: [] },
    ]
    const state = setup([project])
    await openStudies()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir projeto' }))
    expect(await screen.findByRole('heading', { name: 'Disciplinas e tópicos' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mover História para cima' }))
    await waitFor(() => expect(state.getProjects()[0].disciplines.map((item) => item.name)).toEqual(['História', 'Filosofia']))
    expect(state.request).toHaveBeenCalledWith(expect.stringContaining('/projects/1/disciplines/order'), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ ids: [9, 2] }) }))

    fireEvent.click(screen.getByRole('button', { name: 'Renomear Filosofia' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Filosofia antiga' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(state.getProjects()[0].disciplines.find((item) => item.id === 2)?.name).toBe('Filosofia antiga'))

    fireEvent.click(screen.getByRole('button', { name: 'Mover Lógica para cima' }))
    await waitFor(() => expect(state.getProjects()[0].disciplines.find((item) => item.id === 2)?.subjects.map((item) => item.name)).toEqual(['Lógica', 'Ética']))
    expect(state.request).toHaveBeenCalledWith(expect.stringContaining('/disciplines/2/subjects/order'), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ ids: [6, 3] }) }))

    fireEvent.click(screen.getByRole('button', { name: 'Renomear Ética' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ética estoica' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(state.getProjects()[0].disciplines.find((item) => item.id === 2)?.subjects.find((item) => item.id === 3)?.name).toBe('Ética estoica'))

    fireEvent.click(screen.getByRole('button', { name: 'Mover Coragem para cima' }))
    await waitFor(() => expect(state.getProjects()[0].disciplines.find((item) => item.id === 2)?.subjects.find((item) => item.id === 3)?.topics.map((item) => item.name)).toEqual(['Coragem', 'Virtude']))
    expect(state.request).toHaveBeenCalledWith(expect.stringContaining('/subjects/3/topics/order'), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ ids: [5, 4] }) }))

    fireEvent.click(screen.getByRole('button', { name: 'Renomear Virtude' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Virtude moral' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(state.getProjects()[0].disciplines.find((item) => item.id === 2)?.subjects.find((item) => item.id === 3)?.topics.find((item) => item.id === 4)?.name).toBe('Virtude moral'))
  })

  it('importa material, mostra metadados e texto e confirma sua exclusão', async () => {
    const state = setup([projectRecord(1, 'Estoicismo')])
    await openStudies()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir projeto' }))
    const file = new File(['texto do arquivo'], 'anotacoes.txt', { type: 'text/plain' })
    fireEvent.change(await screen.findByLabelText('Selecionar material para importar'), { target: { files: [file] } })
    expect(await screen.findByRole('heading', { name: 'anotacoes.txt' })).toBeInTheDocument()
    expect(screen.getByText('TXT')).toBeInTheDocument()
    expect(screen.getByText('Texto extraído')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver texto de anotacoes.txt' }))
    expect(await screen.findByText('Texto extraído para o teste.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir anotacoes.txt' }))
    fireEvent.click(screen.getByRole('alertdialog').querySelector('.button-danger')!)
    await waitFor(() => expect(state.getMaterials()).toHaveLength(0))
    expect(await screen.findByText(/Nenhum material neste projeto/)).toBeInTheDocument()
  })

  it('exibe erros do backend e impede envio acima do limite publicado pela API', async () => {
    setup([projectRecord(1, 'Estoicismo')], { failUpload: true })
    await openStudies()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir projeto' }))
    const file = new File(['conteudo'], 'invalido.txt', { type: 'text/plain' })
    fireEvent.change(await screen.findByLabelText('Selecionar material para importar'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Formato inválido.')
    const large = new File(['x'.repeat(1024 * 1024 + 1)], 'grande.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByLabelText('Selecionar material para importar'), { target: { files: [large] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('excede o limite')
  })

  it('expõe uma progress bar acessível enquanto o arquivo é enviado', async () => {
    const project = projectRecord(1, 'Estoicismo')
    setup([project])
    await openStudies()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir projeto' }))
    const input = await screen.findByLabelText('Selecionar material para importar')
    fireEvent.change(input, { target: { files: [new File(['x'], 'arquivo.txt')] } })
    expect(await screen.findByRole('progressbar', { name: 'Progresso do envio' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('arquivo.txt')).toBeInTheDocument())
  })

  it('avisa sobre exclusões em cascata na hierarquia e só exclui após confirmação', async () => {
    const project = projectRecord(1, 'Estoicismo')
    project.disciplines = [{ id: 2, name: 'Filosofia', position: 0, subjects: [{ id: 3, name: 'Ética', position: 0, topics: [{ id: 4, name: 'Virtude', position: 0 }] }] }]
    const state = setup([project])
    await openStudies()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir projeto' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Filosofia' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('assuntos e tópicos serão excluídos')
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    expect(state.request).not.toHaveBeenCalledWith(expect.stringMatching(/disciplines\/2$/), expect.objectContaining({ method: 'DELETE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Virtude' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(state.getProjects()[0].disciplines[0].subjects[0].topics).toHaveLength(0))
  })

  it('explica os estados de PDF digitalizado e imagem sem OCR', async () => {
    const project = projectRecord(1, 'Estoicismo')
    const scan: Material = { id: 1, project_id: 1, name: 'scan.pdf', format: 'pdf', size: 2048, imported_at: '2026-11-24T10:00:00', status: 'sem_texto_precisa_ocr', sha256: 'a', storage_id: 'a', extracted_text: '' }
    const image: Material = { ...scan, id: 2, name: 'foto.png', format: 'png', status: 'imagem_ocr_pendente' }
    const state = setup([project])
    state.setMaterials([scan, image])
    await openStudies()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir projeto' }))
    expect(await screen.findByText(/OCR será disponibilizado futuramente/)).toBeInTheDocument()
    expect(screen.getByText(/imagem foi armazenada, mas ainda não possui extração de texto/)).toBeInTheDocument()
  })
})
