import { Folder, CheckCircle2, Users, AlertTriangle, Clock } from 'lucide-react'

export default function OverviewSkeleton() {
    return (
        <div className="p-8 max-w-7xl mx-auto animate-pulse">
            {/* Header Section Skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="h-8 bg-gray-200 rounded-md w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-80"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="h-4 bg-gray-200 rounded-md w-24 mb-3"></div>
                                <div className="h-8 bg-gray-200 rounded-md w-12"></div>
                            </div>
                            <div className="bg-gray-100 p-2.5 rounded-lg w-10 h-10"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-md w-32 mt-4"></div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Project Overview & Recent Activity) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div className="h-6 bg-gray-200 rounded-md w-32"></div>
                            <div className="h-4 bg-gray-200 rounded-md w-16"></div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[320px]">
                            <div className="grid grid-cols-1 divide-y divide-gray-100 flex-1">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-100 p-3 rounded-lg w-11 h-11"></div>
                                            <div>
                                                <div className="h-4 bg-gray-200 rounded-md w-48 mb-2"></div>
                                                <div className="h-3 bg-gray-200 rounded-md w-64"></div>
                                            </div>
                                        </div>
                                        <div className="h-6 bg-gray-200 rounded-md w-16"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="h-6 bg-gray-200 rounded-md w-32 mb-4"></div>
                        <div className="bg-white border border-gray-100 rounded-xl p-12 shadow-sm min-h-[200px]"></div>
                    </div>
                </div>

                {/* Right Column (Task Statuses) */}
                <div className="flex flex-col gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                                    <div className="h-4 bg-gray-200 rounded-md w-24"></div>
                                </div>
                                <div className="h-5 bg-gray-200 rounded-md w-6"></div>
                            </div>
                            <div className="h-4 bg-gray-200 rounded-md w-20 mx-auto my-6"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
