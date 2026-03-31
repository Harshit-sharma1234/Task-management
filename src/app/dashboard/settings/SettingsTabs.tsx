'use client'

import { useState, useRef } from 'react'
import { UserCircle, Shield, Plus, Lock } from 'lucide-react'
import { updateUserPassword, updateUserAvatar } from '@/app/dashboard/actions'
import { createClient } from '@/lib/supabase/client'

// A small helper to generate background colors
function stringToColor(str: string) {
    if (!str) return '#CBD5E1'
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export function SettingsTabs({ user }: { user: { id: string, name: string, email: string, avatar_url: string | null } }) {
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar_url)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Password Update State
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [signOutDevices, setSignOutDevices] = useState(true)
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState(false)

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
        window.location.reload()
    }

    const handlePasswordSubmit = async () => {
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

        const result = await updateUserPassword(newPassword)
        
        if (result.error) {
            setPasswordError(result.error)
        } else {
            setPasswordSuccess(true)
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => {
                setIsChangingPassword(false)
                setPasswordSuccess(false)
            }, 2500)
        }
        setIsSavingPassword(false)
    }

    const bgColor = stringToColor(user.name)

    return (
        <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-5xl flex overflow-hidden min-h-[640px] border border-gray-100/50">
            {/* Sidebar Left */}
            <div className="w-[280px] bg-[#f9fafb]/50 border-r border-gray-100 p-8 flex flex-col justify-between">
                <div>
                    <div className="mb-10">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h2>
                        <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">Personal Account</p>
                    </div>

                    <nav className="space-y-1.5">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                activeTab === 'profile' 
                                ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-indigo-600 border border-gray-100' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                        >
                            <UserCircle size={18} className={activeTab === 'profile' ? 'text-indigo-600' : 'text-gray-400'} />
                            Profile Details
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                activeTab === 'security' 
                                ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-indigo-600 border border-gray-100' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                        >
                            <Shield size={18} className={activeTab === 'security' ? 'text-indigo-600' : 'text-gray-400'} />
                            Security & Access
                        </button>
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
                    <div className="p-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold text-gray-900 leading-tight">Profile Details</h3>
                            <p className="text-sm text-gray-500 mt-1">Manage how you appear to your team.</p>
                        </div>
                        
                        <div className="space-y-10">
                            {/* Profile Row */}
                            <div className="group">
                                <div className="flex items-center justify-between pb-8 border-b border-gray-50">
                                    <div className="w-[140px]">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Photo</p>
                                    </div>
                                    <div className="flex-1 flex items-center justify-between bg-gray-50/30 p-4 rounded-2xl border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all duration-300">
                                        <div className="flex items-center gap-5">
                                            <div className="relative group/avatar">
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-2 border-white" />
                                                ) : (
                                                    <div 
                                                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                                                        style={{ backgroundColor: bgColor }}
                                                    >
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 rounded-full bg-black/0 group-hover/avatar:bg-black/20 flex items-center justify-center transition-all duration-200">
                                                    <Plus size={20} className="text-white opacity-0 group-hover/avatar:opacity-100" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-gray-900">{user.name}</p>
                                                <p className="text-sm text-gray-500 font-medium">{user.email}</p>
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
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedFile(null)
                                                            setPreviewUrl(user.avatar_url)
                                                        }}
                                                        disabled={isUploading}
                                                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={confirmImageUpload}
                                                        disabled={isUploading}
                                                        className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isUploading ? 'Uploading...' : 'Confirm'}
                                                    </button>
                                                </>
                                            ) : (
                                                <label 
                                                    htmlFor="avatar-upload"
                                                    className="px-5 py-2 text-xs font-bold text-indigo-600 border border-indigo-100 hover:bg-indigo-50/50 rounded-lg transition-all cursor-pointer"
                                                >
                                                    Change Photo
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 animate-in fade-in slide-in-from-right-4 duration-500">
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
                                            <p className="text-sm font-bold text-gray-900">Account Password</p>
                                            {!isChangingPassword && <p className="text-xs text-gray-500">Last updated recently</p>}
                                        </div>
                                    </div>
                                    {!isChangingPassword && (
                                        <button 
                                            onClick={() => setIsChangingPassword(true)}
                                            className="px-5 py-2 text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                                        >
                                            Change
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

                                        <div className="bg-white/50 p-4 rounded-xl border border-indigo-100/50 flex items-start gap-3">
                                            <input 
                                                id="sign-out" 
                                                type="checkbox" 
                                                checked={signOutDevices}
                                                onChange={(e) => setSignOutDevices(e.target.checked)}
                                                className="w-4 h-4 mt-0.5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <label htmlFor="sign-out" className="text-xs cursor-pointer text-gray-600 leading-normal">
                                                Sign out of all other devices after saving. Recommended for security.
                                            </label>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-2">
                                            <button 
                                                onClick={() => {
                                                    setIsChangingPassword(false)
                                                    setPasswordError('')
                                                    setPasswordSuccess(false)
                                                    setNewPassword('')
                                                    setConfirmPassword('')
                                                }}
                                                className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={handlePasswordSubmit}
                                                disabled={isSavingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                                                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                                            >
                                                {isSavingPassword ? 'Saving Changes...' : 'Update Password'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
