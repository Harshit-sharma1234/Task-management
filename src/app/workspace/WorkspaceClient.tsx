'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Users, ArrowRight, Building2, Loader2, AlertCircle, Link2 } from 'lucide-react';
import { createWorkspace, joinViaInvite, selectWorkspace } from './actions';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

function getRolePath(roleName: string): string {
  switch (roleName) {
    case 'Admin': return 'admin'
    case 'Project Manager': return 'project-manager'
    case 'Senior Developer': return 'senior-developer'
    case 'Junior Developer': return 'junior-developer'
    default: return 'junior-developer'
  }
}

export function WorkspaceClient({ workspaces }: { workspaces: Workspace[] }) {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>(
    workspaces.length > 0 ? 'list' : 'create'
  );
  const [createState, createAction, isCreating] = useActionState(createWorkspace, null);
  const [joinState, joinAction, isJoining] = useActionState(joinViaInvite, null);
  const [slugValue, setSlugValue] = useState('');
  const router = useRouter();

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)] p-4">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="mb-10 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--color-linear-accent)] text-white shadow-xl shadow-[var(--color-linear-accent)]/20">
              <span className="text-xl font-extrabold">T</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {workspaces.length > 0 ? 'Your Workspaces' : 'Welcome to Tectome'}
          </h1>
          <p className="text-[var(--color-linear-muted)] text-sm">
            {workspaces.length > 0
              ? 'Select a workspace or create a new one.'
              : 'Create a workspace to get started, or join one with an invite link.'}
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-[var(--color-linear-surface)] rounded-xl mb-6 border border-[var(--color-linear-border)]">
          {workspaces.length > 0 && (
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'list'
                  ? 'bg-white text-[var(--color-linear-text)] shadow-sm'
                  : 'text-[var(--color-linear-muted)] hover:text-[var(--color-linear-text)]'
              }`}
            >
              My Workspaces
            </button>
          )}
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'create'
                ? 'bg-white text-[var(--color-linear-text)] shadow-sm'
                : 'text-[var(--color-linear-muted)] hover:text-[var(--color-linear-text)]'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'join'
                ? 'bg-white text-[var(--color-linear-text)] shadow-sm'
                : 'text-[var(--color-linear-muted)] hover:text-[var(--color-linear-text)]'
            }`}
          >
            Join via Invite
          </button>
        </div>

        {/* Workspace List */}
        {activeTab === 'list' && workspaces.length > 0 && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  selectWorkspace(ws.id, ws.slug, ws.role);
                }}
                className="w-full group premium-card p-5 rounded-xl flex items-center justify-between hover:border-[var(--color-linear-accent)]/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:bg-[var(--color-linear-accent)] group-hover:text-white transition-all duration-300">
                    <Building2 size={20} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold block">{ws.name}</span>
                    <span className="text-xs text-[var(--color-linear-muted)]">{ws.role} · /{ws.slug}</span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--color-linear-muted)] group-hover:text-[var(--color-linear-accent)] transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Create Workspace Form */}
        {activeTab === 'create' && (
          <form action={createAction} className="premium-card p-8 rounded-2xl space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <PlusCircle size={20} />
              </div>
              <h2 className="text-lg font-semibold">Create a workspace</h2>
            </div>

            {createState?.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{createState.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-linear-muted)]">Workspace Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="My Team"
                onChange={(e) => setSlugValue(generateSlug(e.target.value))}
                className="w-full px-3 py-2.5 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-linear-muted)]">Workspace URL</label>
              <div className="flex items-center gap-0">
                <span className="px-3 py-2.5 bg-[var(--color-linear-surface)] border border-r-0 border-[var(--color-linear-border)] rounded-l-lg text-xs text-[var(--color-linear-muted)]">
                  tectome.app/
                </span>
                <input
                  type="text"
                  name="slug"
                  required
                  value={slugValue}
                  onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="my-team"
                  className="flex-1 px-3 py-2.5 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-r-lg text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2.5 px-4 bg-[var(--color-linear-accent)] hover:bg-[var(--color-linear-accent-hover)] text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isCreating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span>Creating...</span></>
              ) : (
                'Create Workspace'
              )}
            </button>
          </form>
        )}

        {/* Join via Invite Form */}
        {activeTab === 'join' && (
          <form action={joinAction} className="premium-card p-8 rounded-2xl space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Link2 size={20} />
              </div>
              <h2 className="text-lg font-semibold">Join via invite</h2>
            </div>

            {joinState?.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{joinState.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-linear-muted)]">Invite Token or Link</label>
              <input
                type="text"
                name="token"
                required
                placeholder="Paste your invite link or token..."
                className="w-full px-3 py-2.5 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isJoining ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span>Joining...</span></>
              ) : (
                'Join Workspace'
              )}
            </button>
          </form>
        )}

        <footer className="mt-12 text-center border-t border-[var(--color-linear-border)] pt-6">
          <p className="text-xs text-[var(--color-linear-muted)]">
            Log out of your account?{' '}
            <form action="/auth/signout" method="post" className="inline">
              <button type="submit" className="text-[var(--color-linear-accent)] hover:underline font-medium">
                Sign out
              </button>
            </form>
          </p>
        </footer>
      </div>
    </main>
  );
}
