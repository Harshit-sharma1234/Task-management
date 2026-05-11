import { Metadata } from 'next'
import { SettingsClientWrapper } from './SettingsClientWrapper'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your personal profile and preferences.',
}

export default function SettingsPage() {
    return (
        <div className="p-4 sm:p-8 xl:p-10 w-full max-w-7xl mx-auto flex flex-col min-h-screen">
            <SettingsClientWrapper />
        </div>
    )
}
