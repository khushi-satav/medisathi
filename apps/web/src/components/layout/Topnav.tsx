import { Bell, Search, UserCircle } from 'lucide-react';

export default function Topnav() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 w-64 md:w-96">
        <Search size={18} className="text-gray-500 mr-2" />
        <input 
          type="text" 
          placeholder="Search medications..." 
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <UserCircle size={28} className="text-gray-600" />
        </button>
      </div>
    </header>
  );
}
