'use client';

import { Users, FolderKanban, Shield, Search, MoreHorizontal } from 'lucide-react';

export function TeamSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full h-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="h-4 w-24 bg-gray-100 rounded mb-3"></div>
                <div className="h-9 w-12 bg-gray-200 rounded"></div>
              </div>
              <div className="h-10 w-10 bg-gray-50 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Team List with Search Skeleton */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <div className="h-10 w-full bg-gray-50 border border-gray-200 rounded-lg pl-10"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 bg-gray-100 border border-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Member Table Skeleton */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="px-6 py-4"><div className="h-3 w-12 bg-gray-200 rounded"></div></th>
                  <th className="px-6 py-4"><div className="h-3 w-12 bg-gray-200 rounded"></div></th>
                  <th className="px-6 py-4"><div className="h-3 w-12 bg-gray-200 rounded"></div></th>
                  <th className="px-6 py-4"><div className="h-3 w-12 bg-gray-200 rounded"></div></th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100"></div>
                        <div>
                          <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                          <div className="h-3 w-40 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-gray-100 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3 w-24 bg-gray-100 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3.5 w-16 bg-gray-50 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                      <MoreHorizontal className="text-gray-300" size={18} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
