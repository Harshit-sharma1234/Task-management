'use client';

import { Folder, CheckCircle2, Users, AlertTriangle, ArrowRight, Clock } from 'lucide-react';

export function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-pulse">
      {/* Header Section Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded-lg mb-2"></div>
          <div className="h-4 w-48 bg-gray-100 rounded"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="h-4 w-24 bg-gray-100 rounded mb-3"></div>
                <div className="h-9 w-12 bg-gray-200 rounded"></div>
              </div>
              <div className="h-10 w-10 bg-gray-50 rounded-lg"></div>
            </div>
            <div className="h-3 w-32 bg-gray-50 rounded mt-4"></div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 bg-gray-100 rounded"></div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden min-h-[320px] divide-y divide-gray-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 bg-gray-50 rounded-lg"></div>
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 w-48 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                  <div className="h-5 w-12 bg-gray-50 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          <div>
             <div className="h-5 w-32 bg-gray-200 rounded mb-4"></div>
             <div className="bg-white border border-gray-100 rounded-xl p-12 shadow-sm min-h-[200px] flex items-center justify-center">
                <div className="h-10 w-10 bg-gray-50 rounded-full"></div>
             </div>
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-100 rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-5 w-5 bg-gray-50 rounded"></div>
              </div>
              <div className="h-12 w-full bg-gray-50/50 rounded mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
