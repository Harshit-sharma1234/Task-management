import { Search, Moon } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 shrink-0">
      <div className="flex-1 w-full max-w-md">
        <div className="relative flex items-center w-full">
          <Search size={16} className="absolute left-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search projects, tasks..." 
            className="w-full bg-white border border-gray-200 rounded-md py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-gray-700 flex items-center justify-center p-2 rounded-full hover:bg-gray-50 transition-colors">
          <Moon size={18} />
        </button>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-semibold cursor-pointer">
          K
        </div>
      </div>
    </header>
  );
}
