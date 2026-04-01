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
        <div className="flex justify-between items-center mb-2">
            <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Team members</h1>
            </div>
            
            {isAdmin && (
                <>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 active:scale-95 shadow-sm shadow-indigo-200"
                    >
                        <Plus size={16} />
                        Add a member
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
