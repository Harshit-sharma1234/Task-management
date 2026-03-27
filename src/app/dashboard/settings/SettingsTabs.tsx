'use client'

import { useState, useRef } from 'react'
import { UserCircle, Shield, Plus, MoreHorizontal, Monitor } from 'lucide-react'
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
        
        // Show local preview instantly but don't upload yet
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
        setSelectedFile(file)
    }

    const confirmImageUpload = async () => {
        if (!selectedFile) return
        setIsUploading(true)
        
        // Upload to Supabase Storage
        const supabase = createClient()
        const fileExt = selectedFile.name.split('.').pop()
        const filePath = `${user.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, selectedFile, { upsert: true })

        if (uploadError) {
            console.error('Error uploading image:', uploadError)
            alert(`Storage Error: ${uploadError.message}. Did you run the SQL snippet exactly?`)
            setIsUploading(false)
            return
        }

        // Get the permanent public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        // Save URL to the custom users table using Server Action
        const result = await updateUserAvatar(user.id, publicUrl)

        if (result.error) {
            console.error('Error saving image URL to profile:', result.error)
            alert(`Database Error: ${result.error}.`)
            setIsUploading(false)
            return
        }

        setIsUploading(false)
        setSelectedFile(null)
        // Reload to instantly sync the top Header navigation avatar
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
            // Close after brief success indication
            setTimeout(() => {
                setIsChangingPassword(false)
                setPasswordSuccess(false)
            }, 2500)
        }
        setIsSavingPassword(false)
    }

    const bgColor = stringToColor(user.name)

    return (
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-4xl flex overflow-hidden min-h-[600px] border border-gray-100">
            {/* Sidebar Left */}
            <div className="w-1/3 bg-[#fdfdfd] border-r border-gray-100 p-6 flex flex-col justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Account</h2>
                    <p className="text-sm text-gray-500 mb-8">Manage your account info.</p>

                    <nav className="space-y-1">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'profile' 
                                ? 'bg-gray-100/80 text-gray-900' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <UserCircle size={18} className={activeTab === 'profile' ? 'text-gray-900' : 'text-gray-500'} />
                            Profile
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'security' 
                                ? 'bg-gray-100/80 text-gray-900' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Shield size={18} className={activeTab === 'security' ? 'text-gray-900' : 'text-gray-500'} />
                            Security
                        </button>
                    </nav>
                </div>

                {/* Footer Brand */}
                <div className="flex flex-col items-center">
                    <p className="text-xs text-gray-400 font-medium">Secured by <span className="text-gray-600 font-bold tracking-tight">Supabase</span></p>
                </div>
            </div>

            {/* Content Right */}
            <div className="w-2/3 p-10 bg-white">
                {activeTab === 'profile' ? (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="text-xl font-bold text-gray-900 mb-8">Profile details</h3>
                        
                        <div className="space-y-8">
                            {/* Profile Row */}
                            <div className="flex items-center justify-between py-5 border-b border-gray-100">
                                <div className="w-1/3">
                                    <p className="text-sm font-semibold text-gray-900">Profile</p>
                                </div>
                                <div className="w-2/3 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover shadow-inner" />
                                        ) : (
                                            <div 
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-inner"
                                                style={{ backgroundColor: bgColor }}
                                            >
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                    </div>
                                    <div>
                                        <input 
                                            type="file" 
                                            id="avatar-upload"
                                            accept="image/*" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            onChange={handleImageSelect} 
                                        />
                                        {selectedFile ? (
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedFile(null)
                                                        setPreviewUrl(user.avatar_url)
                                                    }}
                                                    disabled={isUploading}
                                                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={confirmImageUpload}
                                                    disabled={isUploading}
                                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {isUploading ? 'Saving...' : 'Save image'}
                                                </button>
                                            </div>
                                        ) : (
                                            <label 
                                                htmlFor="avatar-upload"
                                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                            >
                                                Update profile
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Connected Accounts Row */}
                            <div className="flex items-center justify-between py-5">
                                <div className="w-1/3">
                                    <p className="text-sm font-semibold text-gray-900">Connected accounts</p>
                                </div>
                                <div className="w-2/3 flex justify-between items-center">
                                    <p className="text-sm text-gray-500 italic">No external accounts connected.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="text-xl font-bold text-gray-900 mb-8">Security</h3>
                        
                        <div className="space-y-8">
                            {/* Password Row */}
                            {isChangingPassword ? (
                                <div className="py-5 border-b border-gray-100 flex items-start justify-between">
                                    <div className="w-1/3 mt-2">
                                        <p className="text-sm font-semibold text-gray-900">Password</p>
                                    </div>
                                    <div className="w-2/3">
                                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                            <h4 className="text-base font-bold text-gray-900 mb-6">Set password</h4>
                                            
                                            {passwordError && (
                                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                                                    {passwordError}
                                                </div>
                                            )}
                                            {passwordSuccess && (
                                                <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-100">
                                                    Password updated successfully!
                                                </div>
                                            )}

                                            <div className="mb-4">
                                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">New password</label>
                                                <div className="relative">
                                                    <input 
                                                        type="password" 
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1.5">Your password must contain 8 or more characters.</p>
                                            </div>

                                            <div className="mb-6">
                                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Confirm password</label>
                                                <div className="relative">
                                                    <input 
                                                        type="password" 
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mb-8 flex items-start gap-3">
                                                <div className="flex items-center h-5">
                                                    <input 
                                                        id="sign-out" 
                                                        type="checkbox" 
                                                        checked={signOutDevices}
                                                        onChange={(e) => setSignOutDevices(e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </div>
                                                <label htmlFor="sign-out" className="text-sm cursor-pointer">
                                                    <span className="font-semibold text-gray-900 block mb-0.5">Sign out of all other devices</span>
                                                    <span className="text-gray-500">It is recommended to sign out of all other devices which may have used your old password.</span>
                                                </label>
                                            </div>

                                            <div className="flex justify-end gap-3">
                                                <button 
                                                    onClick={() => {
                                                        setIsChangingPassword(false)
                                                        setPasswordError('')
                                                        setPasswordSuccess(false)
                                                        setNewPassword('')
                                                        setConfirmPassword('')
                                                    }}
                                                    className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handlePasswordSubmit}
                                                    disabled={isSavingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                                                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {isSavingPassword ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between py-5 border-b border-gray-100">
                                    <div className="w-1/3">
                                        <p className="text-sm font-semibold text-gray-900">Password</p>
                                    </div>
                                    <div className="w-2/3 flex items-center justify-between">
                                        <button 
                                            onClick={() => setIsChangingPassword(true)}
                                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                            Set password
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Active Devices Row */}
                            <div className="flex items-start justify-between py-5 border-b border-gray-100">
                                <div className="w-1/3">
                                    <p className="text-sm font-semibold text-gray-900">Active devices</p>
                                </div>
                                <div className="w-2/3 flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <Monitor size={24} className="text-gray-700 mt-1" />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-semibold text-gray-900">This Device</h4>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">Current</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-1">Authenticated via Supabase</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Delete Account Row */}
                            <div className="flex items-center justify-between py-5">
                                <div className="w-1/3">
                                    <p className="text-sm font-semibold text-gray-900">Delete account</p>
                                </div>
                                <div className="w-2/3">
                                    <button className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                                        Delete account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
