'use client'

import { useState, useRef } from 'react'
import { UserCircle, Shield, Plus, Lock, Mail, Building, Trash2, AlertTriangle } from 'lucide-react'
import { updateUserPassword, updateUserAvatar, updateUserEmail } from '@/app/dashboard/actions'
import { deleteWorkspaceAction, updateWorkspaceAction, resetPasswordAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useSettingsStore } from '@/lib/store/settings'
import { useAvatarStore } from '@/lib/store/avatar'
import { DeleteWorkspaceModal } from '@/components/dashboard/DeleteWorkspaceModal'
import { toast } from 'sonner'

export function SettingsTabs({ user }: { user: { id: string, name: string, email: string, avatar_url: string | null, workspacerole: string, hasPassword: boolean, activeWorkspace: { id: string, name: string, slug: string } } }) {
    const setUserData = useSettingsStore((s) => s.setUserData)
    const setGlobalAvatar = useAvatarStore((s) => s.setAvatarUrl)
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'workspace'>('profile')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar_url)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const isAdmin = user.workspacerole === 'Admin'

    // Password Update State
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [isResettingPassword, setIsResettingPassword] = useState(false)
    const [resetSuccess, setResetSuccess] = useState(false)

    // Email Update State
    const [isChangingEmail, setIsChangingEmail] = useState(false)
    const [newEmail, setNewEmail] = useState(user.email)
    const [isSavingEmail, setIsSavingEmail] = useState(false)
    const [emailError, setEmailError] = useState('')
    const [emailSuccess, setEmailSuccess] = useState(false)

    // Workspace State
    const [workspaceName, setWorkspaceName] = useState(user.activeWorkspace?.name || '')
    const [isSavingWorkspaceName, setIsSavingWorkspaceName] = useState(false)
    const [workspaceSuccess, setWorkspaceSuccess] = useState(false)
    const [workspaceError, setWorkspaceError] = useState('')

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
        setSelectedFile(file)
    }

    const confirmImageUpload = async () => {
        if (!selectedFile) return
        setIsUploading(true)
        
        const supabase = createClient()
        const fileExt = selectedFile.name.split('.').pop()
        const filePath = `${user.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, selectedFile, { upsert: true })

        if (uploadError) {
            console.error('Error uploading image:', uploadError)
            alert(`Storage Error: ${uploadError.message}`)
            setIsUploading(false)
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        const result = await updateUserAvatar(user.id, publicUrl)

        if (result.error) {
            console.error('Error saving image URL:', result.error)
            alert(`Database Error: ${result.error}`)
            setIsUploading(false)
            return
        }

        setIsUploading(false)
        setSelectedFile(null)
        setPreviewUrl(publicUrl)
        setUserData({ ...user, avatar_url: publicUrl })
        setGlobalAvatar(publicUrl) // Broadcast to Header & all components site-wide
    }

    const handlePasswordSubmit = async () => {
        if (user.hasPassword && !oldPassword) {
            setPasswordError("Current password is required")
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords don't match")
            return
        }
        if (newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters")
            return
        }

        setIsSavingPassword(true)
        setPasswordError('')
        setPasswordSuccess(false)

        const result = await updateUserPassword(oldPassword, newPassword)
        
        if (result.error) {
            setPasswordError(result.error)
        } else {
            setPasswordSuccess(true)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => {
                setIsChangingPassword(false)
                setPasswordSuccess(false)
            }, 2500)
        }
        setIsSavingPassword(false)
    }

    const handleForgotPassword = async () => {
        setIsResettingPassword(true)
        const result = await resetPasswordAction()
        if (result.error) {
            toast.error(result.error)
        } else {
            setResetSuccess(true)
            toast.success('Password reset link sent to your email!')
            setTimeout(() => setResetSuccess(false), 5000)
        }
        setIsResettingPassword(false)
    }

    const handleEmailSubmit = async () => {
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            setEmailError('Please enter a valid email address')
            return
        }
        if (newEmail === user.email) {
            setIsChangingEmail(false)
            return
        }

        setIsSavingEmail(true)
        setEmailError('')
        setEmailSuccess(false)

        const result = await updateUserEmail(newEmail)

        if (result.error) {
            setEmailError(result.error)
        } else {
            setEmailSuccess(true)
            setUserData({ ...user, email: newEmail })
            setTimeout(() => {
                setIsChangingEmail(false)
                setEmailSuccess(false)
            }, 2500)
        }
        setIsSavingEmail(false)
    }

    const handleWorkspaceNameSubmit = async () => {
        if (!workspaceName || workspaceName.trim().length < 2) {
            setWorkspaceError('Workspace name must be at least 2 characters')
            return
        }
        
        setIsSavingWorkspaceName(true)
        setWorkspaceError('')
        setWorkspaceSuccess(false)
        
        const result = await updateWorkspaceAction(user.activeWorkspace.id, workspaceName)
        
        if (result.error) {
            setWorkspaceError(result.error)
        } else {
            setWorkspaceSuccess(true)
            // Update local state and re-sync
            setUserData({ 
                ...user, 
                activeWorkspace: { 
                    ...user.activeWorkspace, 
                    name: workspaceName 
                } 
            })
            setTimeout(() => setWorkspaceSuccess(false), 3000)
        }
        setIsSavingWorkspaceName(false)
    }


    return (
        <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-5xl flex overflow-hidden min-h-[640px] border border-gray-100/50">
            {/* Sidebar Left */}
            <div className="w-[260px] bg-[#f9fafb]/50 border-r border-gray-100 p-6 flex flex-col justify-between shrink-0">
                <div>
                    <div className="mb-10">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h2>
                        <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">Personal Account</p>
                    </div>

                    <nav className="space-y-1.5">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-[12px] font-bold transition-all duration-200 whitespace-nowrap overflow-hidden ${
                                activeTab === 'profile' 
                                ? 'bg-white shadow-[0_2px_15px_rgba(0,0,0,0.06)] text-indigo-600 border border-gray-100/50 translate-x-1' 
                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                        >
                            <UserCircle size={18} className="shrink-0" />
                            <span className="truncate">Profile Details</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-[12px] font-bold transition-all duration-200 whitespace-nowrap overflow-hidden ${
                                activeTab === 'security' 
                                ? 'bg-white shadow-[0_2px_15px_rgba(0,0,0,0.06)] text-indigo-600 border border-gray-100/50 translate-x-1' 
                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                        >
                            <Shield size={18} className="shrink-0" />
                            <span className="truncate">Security & Access</span>
                        </button>

                        {isAdmin && (
                            <button 
                                onClick={() => setActiveTab('workspace')}
                                className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-[12px] font-bold transition-all duration-200 whitespace-nowrap overflow-hidden ${
                                    activeTab === 'workspace' 
                                    ? 'bg-white shadow-[0_2px_15px_rgba(0,0,0,0.06)] text-indigo-600 border border-gray-100/50 translate-x-1' 
                                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100/50'
                                }`}
                            >
                                <Building size={18} className="shrink-0" />
                                <span className="truncate">Workspace Settings</span>
                            </button>
                        )}
                    </nav>
                </div>

                {/* Footer Brand */}
                <div className="pt-6 border-t border-gray-100/80">
                    <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
                        <div className="w-5 h-5 bg-gray-900 rounded-sm flex items-center justify-center">
                            <Shield size={10} className="text-white" />
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold tracking-tighter uppercase">Secured by Supabase</p>
                    </div>
                </div>
            </div>

            {/* Content Right */}
            <div className="flex-1 bg-white relative">
                {activeTab === 'profile' ? (
                    <div className="p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold text-gray-900 leading-tight">Profile Details</h3>
                            <p className="text-sm text-gray-500 mt-1">Manage how you appear to your team.</p>
                        </div>
                        
                        <div className="space-y-10">
                            {/* Profile Row */}
                            <div className="group">
                                <div className="flex items-center justify-between pb-8 border-b border-gray-50">
                                    <div className="w-[110px] shrink-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 border-l-2 border-gray-100">Photo</p>
                                    </div>
                                        <div className="flex-1 flex items-center justify-between bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 gap-6 overflow-hidden">
                                            <div className="flex items-center gap-5 min-w-0">
                                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] relative shrink-0 aspect-square flex-none">
                                                    {selectedFile && previewUrl ? (
                                                        <Image src={previewUrl} alt="Profile" fill className="object-cover" />
                                                    ) : (
                                                        <UserAvatar
                                                            name={user.name}
                                                            avatarUrl={user.avatar_url}
                                                            size="xl"
                                                            className="w-full h-full"
                                                        />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <p className="text-[17px] font-bold text-gray-900 leading-tight truncate">{user.name}</p>
                                                    <p className="text-[13px] text-gray-400 font-medium truncate">{user.email}</p>
                                                </div>
                                            </div>

                                        <div className="flex gap-2">
                                            <input 
                                                type="file" 
                                                id="avatar-upload"
                                                accept="image/*" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                onChange={handleImageSelect} 
                                            />
                                            {selectedFile ? (
                                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedFile(null)
                                                            setPreviewUrl(user.avatar_url)
                                                        }}
                                                        disabled={isUploading}
                                                        className="px-4 py-2.5 text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-all whitespace-nowrap rounded-lg"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={confirmImageUpload}
                                                        disabled={isUploading}
                                                        className="px-6 py-2.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        {isUploading ? 'Uploading...' : 'Confirm'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <label 
                                                    htmlFor="avatar-upload"
                                                    className="px-6 py-2.5 text-[11px] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all cursor-pointer border border-indigo-100/50 active:scale-95 shrink-0 whitespace-nowrap ml-auto"
                                                >
                                                    Change Photo
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Email Row */}
                            <div className="group">
                                <div className="flex flex-col pb-8 border-b border-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="w-[110px] shrink-0">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 border-l-2 border-gray-100">Email</p>
                                        </div>
                                            <div className="flex-1 flex items-center justify-between bg-white p-5 rounded-[20px] border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors duration-300">
                                                        <Mail size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{isChangingEmail ? 'Update Email' : user.email}</p>
                                                        {!isChangingEmail && <p className="text-[11px] text-gray-400 font-medium">Primary email for notifications</p>}
                                                    </div>
                                                </div>
                                            {!isChangingEmail && (
                                                <button 
                                                    onClick={() => setIsChangingEmail(true)}
                                                    className="px-5 py-2 text-xs font-bold text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200/60"
                                                >
                                                    Change
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isChangingEmail && (
                                        <div className="ml-[110px] pt-4 mt-2 border-t border-gray-50 space-y-4">
                                            {emailError && (
                                                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                                                    {emailError}
                                                </div>
                                            )}
                                            {emailSuccess && (
                                                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                                                    Email updated successfully!
                                                </div>
                                            )}

                                            <div className="space-y-1.5 w-max min-w-[320px]">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">New Email</label>
                                                <input 
                                                    type="email" 
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                                    placeholder="you@example.com"
                                                />
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button 
                                                    onClick={() => {
                                                        setIsChangingEmail(false)
                                                        setEmailError('')
                                                        setEmailSuccess(false)
                                                        setNewEmail(user.email)
                                                    }}
                                                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleEmailSubmit}
                                                    disabled={isSavingEmail || !newEmail}
                                                    className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                                                >
                                                    {isSavingEmail ? 'Saving...' : 'Save Email'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'workspace' ? (
                    <div className="p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold text-gray-900 leading-tight">Workspace Settings</h3>
                            <p className="text-sm text-gray-500 mt-1">Manage workspace-wide configuration.</p>
                        </div>

                        <div className="space-y-12">
                             {/* General Settings */}
                             <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Workspace Name</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1 group">
                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                    <Building size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={workspaceName}
                                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-medium text-gray-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                                    placeholder="Enter workspace name"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleWorkspaceNameSubmit}
                                                disabled={isSavingWorkspaceName || workspaceName === user.activeWorkspace.name}
                                                className="px-6 py-3.5 bg-indigo-600 text-white text-[13px] font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed"
                                            >
                                                {isSavingWorkspaceName ? 'Saving...' : 'Update'}
                                            </button>
                                        </div>
                                        {workspaceError && <p className="text-[11px] text-red-500 font-bold pl-1">{workspaceError}</p>}
                                        {workspaceSuccess && <p className="text-[11px] text-emerald-500 font-bold pl-1">Workspace name updated!</p>}
                                    </div>
                                </div>
                                <div className="space-y-1.5 pt-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Workspace Slug</label>
                                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-mono text-gray-400">
                                        {user.activeWorkspace?.slug}
                                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-gray-300">Read-Only</span>
                                    </div>
                                </div>
                             </div>

                             {/* Danger Zone */}
                             <div className="pt-10 border-t border-red-50">
                                <div className="flex items-center gap-2 mb-6">
                                    <AlertTriangle size={18} className="text-red-500" />
                                    <h4 className="text-sm font-bold text-red-600 uppercase tracking-widest">Danger Zone</h4>
                                </div>
                                
                                <div className="bg-red-50/30 border border-red-100 rounded-[24px] p-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                        <div className="max-w-md">
                                            <h5 className="text-base font-bold text-gray-900 mb-1">Delete this workspace</h5>
                                            <p className="text-sm text-gray-500 leading-relaxed">
                                                Once you delete a workspace, there is no going back. Please be certain. 
                                                All projects, issues, and team data will be permanently wiped.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            className="px-6 py-3.5 bg-white border border-red-200 text-red-600 text-[13px] font-bold rounded-2xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-95 shrink-0"
                                        >
                                            Delete Workspace
                                        </button>
                                    </div>
                                </div>
                             </div>
                        </div>

                        <DeleteWorkspaceModal
                            isOpen={isDeleteModalOpen}
                            onClose={() => setIsDeleteModalOpen(false)}
                            workspaceName={user.activeWorkspace.name}
                            onConfirm={async () => {
                                const result = await deleteWorkspaceAction(user.activeWorkspace.id);
                                if (result?.error) {
                                    toast.error(result.error);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold text-gray-900 leading-tight">Security & Privacy</h3>
                            <p className="text-sm text-gray-500 mt-1">Keep your account safe and manage logins.</p>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Password Row */}
                            <div className={`p-6 rounded-2xl border transition-all duration-300 ${isChangingPassword ? 'bg-indigo-50/20 border-indigo-100 shadow-sm' : 'bg-white border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isChangingPassword ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-gray-100 text-gray-500'}`}>
                                            <Lock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{user.hasPassword ? 'Account Password' : 'Set Account Password'}</p>
                                            {!isChangingPassword && <p className="text-xs text-gray-500">{user.hasPassword ? 'Last updated recently' : 'No password set yet (Social Login)'}</p>}
                                        </div>
                                    </div>
                                    {!isChangingPassword && (
                                        <button 
                                            onClick={() => setIsChangingPassword(true)}
                                            className="px-5 py-2 text-xs font-bold text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all"
                                        >
                                            {user.hasPassword ? 'Change' : 'Set Password'}
                                        </button>
                                    )}
                                </div>

                                {isChangingPassword && (
                                    <div className="pt-4 mt-4 border-t border-indigo-100/50 space-y-5">
                                        {passwordError && (
                                            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                                                {passwordError}
                                            </div>
                                        )}
                                        {passwordSuccess && (
                                            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                                                Password updated successfully!
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {user.hasPassword && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Current Password</label>
                                                    <input 
                                                        type="password" 
                                                        value={oldPassword}
                                                        onChange={(e) => setOldPassword(e.target.value)}
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                                        placeholder="Required to continue"
                                                    />
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">New Password</label>
                                                    <input 
                                                        type="password" 
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                                        placeholder="8+ characters"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Confirm New</label>
                                                    <input 
                                                        type="password" 
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>
                                        </div>


                                        <div className="flex justify-end gap-3 pt-2">
                                            <button 
                                                onClick={() => {
                                                    setIsChangingPassword(false)
                                                    setPasswordError('')
                                                    setPasswordSuccess(false)
                                                    setOldPassword('')
                                                    setNewPassword('')
                                                    setConfirmPassword('')
                                                }}
                                                className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={handlePasswordSubmit}
                                                disabled={isSavingPassword || (user.hasPassword && !oldPassword) || newPassword.length < 8 || newPassword !== confirmPassword}
                                                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                                            >
                                                {isSavingPassword ? 'Saving Changes...' : (user.hasPassword ? 'Update Password' : 'Set Password')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Forgot Password Link */}
                            <div className="p-8 rounded-3xl bg-gray-50/50 border border-gray-100/50 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all hover:bg-white hover:shadow-xl hover:shadow-gray-200/40 group/reset">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover/reset:text-indigo-600 group-hover/reset:border-indigo-100 group-hover/reset:shadow-lg group-hover/reset:shadow-indigo-600/10 transition-all duration-500">
                                        <Mail size={22} />
                                    </div>
                                    <div>
                                        <h4 className="text-[15px] font-bold text-gray-900 mb-1">Forgot your password?</h4>
                                        <p className="text-[13px] text-gray-500 font-medium max-w-[320px] leading-relaxed">
                                            We'll send a secure password reset link to <span className="text-indigo-600 font-bold">{user.email}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleForgotPassword}
                                    disabled={isResettingPassword || resetSuccess}
                                    className={`px-8 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-300 flex items-center gap-2.5 active:scale-95 shrink-0 shadow-lg ${
                                        resetSuccess 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-emerald-500/10' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isResettingPassword ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Sending Link...</span>
                                        </>
                                    ) : resetSuccess ? (
                                        <>
                                            <Plus size={16} className="rotate-45" />
                                            <span>Email Sent!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={16} />
                                            <span>Send Reset Link</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
