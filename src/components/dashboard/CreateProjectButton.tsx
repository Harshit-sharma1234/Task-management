'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/dashboard/actions'

interface User {
  id: string
  name: string
}

interface CreateProjectButtonProps {
  variant?: 'header' | 'empty-state'
  users: User[]
}

export function CreateProjectButton({ variant = 'header', users }: CreateProjectButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false)
  const assigneeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setIsAssigneeDropdownOpen(false)
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
  }

  const toggleAssignee = (id: string) => {
    setSelectedAssignees(prev => 
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const result = await createProject(formData)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setIsLoading(false)
      closeModal()
      router.refresh()
    }
  }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4 overflow-hidden relative">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
              <button 
                onClick={closeModal} 
                className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  id="project_name"
                  name="project_name"
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g. Website Redesign"
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lead_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Lead *
                  </label>
                  <select
                    id="lead_id"
                    name="lead_id"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="" disabled selected>Select a Lead</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name || 'Unnamed User'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium" selected>Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="backlog">Backlog</option>
                  <option value="to_do">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="relative" ref={assigneeDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignees
                  </label>
                  
                  {/* Hidden inputs to capture selected assignees for FormData */}
                  {selectedAssignees.map(userId => (
                    <input key={userId} type="hidden" name="assigned_to" value={userId} />
                  ))}
                  <input type="hidden" name="assigned_to" value="" /> {/* Fallback empty value if none selected so it's defined */}
                  
                  <div 
                    onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                    className="w-full border border-gray-300 rounded-md p-2 min-h-[38px] text-sm bg-white cursor-pointer flex flex-wrap gap-1 items-center justify-between"
                  >
                    <div className="flex flex-wrap gap-1 flex-1">
                      {selectedAssignees.length === 0 ? (
                        <span className="text-gray-500">None selected</span>
                      ) : (
                        selectedAssignees.map(id => {
                          const user = users.find(u => u.id === id)
                          return (
                            <span key={id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              {user?.name || 'User'}
                              <X 
                                size={12} 
                                className="cursor-pointer hover:text-indigo-900" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAssignee(id);
                                }} 
                              />
                            </span>
                          )
                        })
                      )}
                    </div>
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  </div>

                  {isAssigneeDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {users.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">No users available</div>
                      ) : (
                        users.map(u => {
                          const isSelected = selectedAssignees.includes(u.id)
                          return (
                            <div 
                              key={u.id}
                              onClick={() => toggleAssignee(u.id)}
                              className={`px-3 py-2 text-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-indigo-50/50' : ''}`}
                            >
                              <span className={isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}>
                                {u.name || 'Unnamed User'}
                              </span>
                              {isSelected && <Check size={16} className="text-indigo-600" />}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white font-sans"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="What is this project about?"
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
