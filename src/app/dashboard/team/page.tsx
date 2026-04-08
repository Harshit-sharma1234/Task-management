import { Metadata } from 'next'
import { TeamClientWrapper } from './TeamClientWrapper'

export const metadata: Metadata = {
  title: 'Team Directory',
  description: 'View and manage your team members and roles.',
}

export default function TeamPage() {
    return <TeamClientWrapper />
}
