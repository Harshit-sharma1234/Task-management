'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddEmployeeModal } from './AddEmployeeModal'

interface TeamHeaderProps {
    isAdmin: boolean
}

export function TeamHeader({ isAdmin }: TeamHeaderProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Team</h1>
                <p className="text-sm text-gray-500 mt-1">Manage team members and their contributions</p>
            </div>
            
            {isAdmin && (
                <>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
                    >
                        <Plus size={18} />
                        Add Member
                    </button>
                    <AddEmployeeModal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                    />
                </>
            )}
        </div>
    )
}
