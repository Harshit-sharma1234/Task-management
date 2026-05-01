'use client'

import { useMemo, useState, useRef, useEffect, useTransition } from 'react'
import { Plus, ChevronDown, Check, X, Users, Calendar, CircleDot, MoreHorizontal, User, Paperclip, FileIcon, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createProject, fetchUsersForProject } from '@/app/dashboard/actions'
import { useGlobalStore } from '@/lib/store/global'
import { useTeamStore } from '@/lib/store/team'

interface User {
  id: string
  name: string
}

interface CreateProjectButtonProps {
  variant?: 'header' | 'empty-state';
  workspaceId?: string;
}

export function CreateProjectButton({ variant = 'header', workspaceId }: CreateProjectButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false)
  const assigneeDropdownRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState<
    'backlog' | 'to_do' | 'in_progress' | 'review' | 'in_review' | 'done' | 'cancelled'
  >('backlog')
  const [priority, setPriority] = useState<'no_priority' | 'urgent' | 'high' | 'medium' | 'low'>('no_priority')
  const [leadId, setLeadId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')

  const [openPill, setOpenPill] = useState<null | 'status' | 'priority' | 'lead' | 'members' | 'start'>(null)
  const pillsRef = useRef<HTMLDivElement>(null)

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [users, setUsers] = useState<User[]>([])
  const activeWorkspaceId = useGlobalStore((state) => state.activeWorkspaceId)
  const teamWorkspaceId = useTeamStore((state) => state.workspaceId)
  const resolvedWorkspaceId = workspaceId || activeWorkspaceId || teamWorkspaceId || ''

  // Fetch users when modal is opened
  useEffect(() => {
    if (isOpen && users.length === 0 && resolvedWorkspaceId) {
      setIsLoading(true);
      fetchUsersForProject(resolvedWorkspaceId)
        .then(data => {
          setUsers(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('[CreateProject] Failed to fetch users:', err);
          setError('Failed to load workspace members');
          setIsLoading(false);
        });
    }
  }, [isOpen, users.length, resolvedWorkspaceId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setIsAssigneeDropdownOpen(false)
      }
      if (pillsRef.current && !pillsRef.current.contains(event.target as Node)) {
        setOpenPill(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openModal = () => setIsOpen(true)
  const closeModal = () => {
    setIsOpen(false)
    setError('')
    setSelectedAssignees([])
    setIsAssigneeDropdownOpen(false)
    setOpenPill(null)
    setStatus('backlog')
    setPriority('no_priority')
    setLeadId('')
    setStartDate('')
    setSelectedFiles([])
  }

  const toggleAssignee = (id: string) => {
    setSelectedAssignees(prev =>
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const raw = new FormData(e.currentTarget)
    const data = new FormData()
    Array.from(raw.entries()).forEach(([k, v]) => {
      if (k === 'attachments') return
      data.append(k, v)
    })
    selectedFiles.forEach((f) => data.append('attachments', f))

    // Instant Close & Background Process
    closeModal()

    startTransition(async () => {
      const promise = createProject(data)

      toast.promise(promise, {
        loading: 'Creating your project...',
        success: (result: any) => {
          if (result.error) throw new Error(result.error)
          // Add to global store instantly
          if (result.project) {
            useGlobalStore.getState().addProject(result.project)
          }
          // Force the router to refresh and sync with the new server state
          router.refresh()
          return 'Project created successfully!'
        },
        error: (err: any) => {
          return `Failed to create project: ${err.message}`
        }
      })
    })
  }

  const statusOptions = useMemo(
    () =>
      [
        { value: 'backlog', label: 'Backlog' },
        { value: 'to_do', label: 'To do' },
        { value: 'in_progress', label: 'In progress' },
        { value: 'review', label: 'Review' },
        { value: 'in_review', label: 'In review' },
        { value: 'done', label: 'Done' },
        { value: 'cancelled', label: 'Cancelled' },
      ] as const,
    []
  )

  const priorityOptions = useMemo(
    () =>
      [
        { value: 'no_priority', label: 'No priority', icon: MoreHorizontal },
        { value: 'urgent', label: 'Urgent', icon: CircleDot },
        { value: 'high', label: 'High', icon: CircleDot },
        { value: 'medium', label: 'Medium', icon: CircleDot },
        { value: 'low', label: 'Low', icon: CircleDot },
      ] as const,
    []
  )

  const leadName = useMemo(() => users.find(u => u.id === leadId)?.name || '', [leadId, users])

  return (
    <>
      {variant === 'header' ? (
        <button
          onClick={openModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          New Project
        </button>
      ) : (
        <button
          onClick={openModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Create your First Project
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-4 py-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative border border-gray-100">
            <div className="px-8 pt-7 pb-5 border-b border-gray-100 flex justify-between items-start bg-white">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New project</div>
              </div>
              <button
                onClick={closeModal}
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none -mt-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                  {error}
                </div>
              )}

              {/* Hidden fields to preserve server action contract */}
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="priority" value={priority} />
              <input type="hidden" name="lead_id" value={leadId} />
              <input type="hidden" name="start_date" value={startDate} />
              <input type="hidden" name="workspace_id" value={resolvedWorkspaceId} />

              <div className="space-y-3">
                <input
                  type="text"
                  id="project_name"
                  name="project_name"
                  required
                  className="w-full text-[34px] leading-tight font-bold text-gray-900 placeholder:text-gray-300 outline-none bg-transparent"
                  placeholder="Project name"
                />

                <input
                  type="text"
                  className="w-full text-sm text-gray-600 placeholder:text-gray-400 outline-none bg-transparent"
                  placeholder="Add a short summary..."
                  aria-label="Short summary"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2" ref={pillsRef}>
                {/* Status pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPill(p => (p === 'status' ? null : 'status'))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <CircleDot size={14} className="text-gray-400" />
                    {statusOptions.find(o => o.value === status)?.label || 'Backlog'}
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {openPill === 'status' && (
                    <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {statusOptions.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            setStatus(o.value)
                            setOpenPill(null)
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${o.value === status ? 'bg-gray-50' : ''
                            }`}
                        >
                          <span className="text-gray-800">{o.label}</span>
                          {o.value === status && <Check size={16} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPill(p => (p === 'priority' ? null : 'priority'))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MoreHorizontal size={14} className="text-gray-400" />
                    {priorityOptions.find(o => o.value === priority)?.label || 'No priority'}
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {openPill === 'priority' && (
                    <div className="absolute z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {priorityOptions.map(o => {
                        const Icon = o.icon
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                              setPriority(o.value)
                              setOpenPill(null)
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${o.value === priority ? 'bg-gray-50' : ''
                              }`}
                          >
                            <span className="flex items-center gap-2 text-gray-800">
                              <Icon size={14} className="text-gray-400" />
                              {o.label}
                            </span>
                            {o.value === priority && <Check size={16} className="text-indigo-600" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Lead pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPill(p => (p === 'lead' ? null : 'lead'))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <User size={14} className="text-gray-400" />
                    {leadName ? `Lead: ${leadName}` : 'Lead'}
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {openPill === 'lead' && (
                    <div className="absolute z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setLeadId('')
                          setOpenPill(null)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${!leadId ? 'bg-gray-50' : ''
                          }`}
                      >
                        <span className="text-gray-800">No lead</span>
                        {!leadId && <Check size={16} className="text-indigo-600" />}
                      </button>
                      {users.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setLeadId(u.id)
                            setOpenPill(null)
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${u.id === leadId ? 'bg-gray-50' : ''
                            }`}
                        >
                          <span className="text-gray-800">{u.name || 'Unnamed User'}</span>
                          {u.id === leadId && <Check size={16} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Members pill (multi select) */}
                <div className="relative" ref={assigneeDropdownRef}>
                  {selectedAssignees.map(userId => (
                    <input key={userId} type="hidden" name="assigned_to" value={userId} />
                  ))}
                  <input
                    type="text"
                    className="sr-only"
                    value={selectedAssignees.join(',')}
                    required
                    onChange={() => { }}
                    title="Please select at least one member"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setIsAssigneeDropdownOpen(v => !v)
                      setOpenPill(null)
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Users size={14} className="text-gray-400" />
                    {selectedAssignees.length ? `Members (${selectedAssignees.length})` : 'Members'}
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>

                  {isAssigneeDropdownOpen && (
                    <div className="absolute z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {users.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">No users available</div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto">
                          {users.map(u => {
                            const isSelected = selectedAssignees.includes(u.id)
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => toggleAssignee(u.id)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${isSelected ? 'bg-gray-50' : ''
                                  }`}
                              >
                                <span className={isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}>
                                  {u.name || 'Unnamed User'}
                                </span>
                                {isSelected && <Check size={16} className="text-indigo-600" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Start pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPill(p => (p === 'start' ? null : 'start'))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Calendar size={14} className="text-gray-400" />
                    {startDate ? `Start: ${startDate}` : 'Start'}
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {openPill === 'start' && (
                    <div className="absolute z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white font-sans outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length === 0) return
                      setSelectedFiles((prev) => {
                        const existing = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`))
                        const next = [...prev]
                        for (const f of files) {
                          const key = `${f.name}-${f.size}-${f.lastModified}`
                          if (!existing.has(key)) next.push(f)
                        }
                        return next
                      })
                      // Allow selecting the same file again later.
                      e.currentTarget.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Paperclip size={14} className="text-gray-400" />
                    {selectedFiles.length ? `Attachments (${selectedFiles.length})` : 'Attachments'}
                  </button>
                </div>
              </div>

              {/* Selected attachments */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 rounded-lg px-2.5 py-1.5 group/file"
                    >
                      <FileIcon size={14} className="text-indigo-500" />
                      <span className="text-xs font-semibold text-indigo-700 max-w-[220px] truncate">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t border-gray-100 pt-6">
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={10}
                  className="w-full text-sm text-gray-700 placeholder:text-gray-400 outline-none bg-transparent resize-none leading-relaxed"
                  placeholder="Write a description, a project brief, or collect ideas..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
