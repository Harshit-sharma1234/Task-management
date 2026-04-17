import { getCachedWorkspaceBySlug } from '@/lib/cache'
import { redirect } from 'next/navigation'
import { TeamClientWrapper } from './TeamClientWrapper'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team Directory',
  description: 'View and manage your team members and roles.',
}

export default async function TeamPage({ params }: { params: Promise<{ workspace: string }> }) {
    const { workspace: workspaceSlug } = await params;
    const workspace = await getCachedWorkspaceBySlug(workspaceSlug)
    if (!workspace) redirect('/dashboard')

    return <TeamClientWrapper workspaceId={workspace.id} />
}
