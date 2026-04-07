import { Metadata } from 'next'
import { SettingsClientWrapper } from './SettingsClientWrapper'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your personal profile and preferences.',
}

export default function SettingsPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] w-full">
            <SettingsClientWrapper />
        </div>
    )
}
