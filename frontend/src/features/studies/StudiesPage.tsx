import { useState } from 'react'
import type { Project } from '../../api'
import { ProjectDetail } from './ProjectDetail'
import { ProjectList } from './ProjectList'

export function StudiesPage({ maxUploadBytes }: { maxUploadBytes: number }) {
  const [selected, setSelected] = useState<Project | null>(null)

  if (selected) {
    return <ProjectDetail projectId={selected.id} maxUploadBytes={maxUploadBytes} onBack={() => setSelected(null)} />
  }
  return <ProjectList onOpen={setSelected} />
}
