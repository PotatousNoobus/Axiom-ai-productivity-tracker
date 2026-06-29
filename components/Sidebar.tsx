"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Calendar, Settings, ChevronLeft, ChevronRight, BarChart3, Menu, Volume2, VolumeX, User, Check } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile?: 'Student' | 'Working Professional' | 'Startup Founder';
  onProfileChange?: (profile: 'Student' | 'Working Professional' | 'Startup Founder') => void;
}

export default function Sidebar({ isOpen, setIsOpen, activeTab, setActiveTab, userProfile = 'Student', onProfileChange }: SidebarProps) {
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('isSilentMode');
    if (stored === 'true') {
      setIsSilentMode(true);
    }
  }, []);

  const toggleSilentMode = () => {
    const newVal = !isSilentMode;
    setIsSilentMode(newVal);
    localStorage.setItem('isSilentMode', String(newVal));
  };

  const navItems = [
    { id: "timeline", icon: LayoutDashboard, label: "Dashboard" },
    { id: "analytics", icon: BarChart3, label: "Analytics" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Mobile overlay for when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out shrink-0 border-r border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#161b22] flex flex-col ${isOpen ? 'w-64' : 'w-16 lg:w-20'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800/50 h-[88px] lg:h-16">
          {isOpen && <span className="font-bold text-cyan-600 dark:text-cyan-400 tracking-wider text-sm ml-2">Axiom</span>}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors ml-auto cursor-pointer"
          >
            {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-2 flex flex-col overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setIsOpen(false); // Close on mobile after selection
              }}
              className={`flex flex-wrap items-center gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all group shrink-0 cursor-pointer ${isOpen ? 'justify-start' : 'justify-center'} ${activeTab === item.id ? 'bg-gray-100 dark:bg-gray-800 !text-cyan-600 dark:!text-cyan-400 ring-1 ring-cyan-500/50 hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
            >
              <item.icon size={22} className="group-hover:scale-110 transition-transform shrink-0" />
              <span className={`font-medium whitespace-nowrap ${isOpen ? 'block' : 'hidden'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800/50 space-y-2">
          <button 
            onClick={toggleSilentMode}
            className={`flex flex-wrap items-center gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all group shrink-0 w-full cursor-pointer ${isOpen ? 'justify-start' : 'justify-center'} ${isSilentMode ? 'text-red-500 dark:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title={isSilentMode ? "Disable Silent Mode" : "Enable Silent Mode"}
          >
            {isSilentMode ? <VolumeX size={22} className="group-hover:scale-110 transition-transform shrink-0" /> : <Volume2 size={22} className="group-hover:scale-110 transition-transform shrink-0" />}
            <span className={`font-medium whitespace-nowrap ${isOpen ? 'block' : 'hidden'}`}>
              {isSilentMode ? 'Silent Mode On' : 'Silent Mode Off'}
            </span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex flex-wrap items-center gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all group shrink-0 w-full cursor-pointer ${isOpen ? 'justify-start' : 'justify-center'} ${isProfileMenuOpen ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/20 dark:border-cyan-500/50">
                <User size={14} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className={`font-medium whitespace-nowrap ${isOpen ? 'block' : 'hidden'}`}>
                Profile
              </span>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800/50 shadow-lg rounded-xl overflow-hidden z-50">
                <div className="p-3 border-b border-gray-100 dark:border-gray-800/50">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Profile</h3>
                </div>
                <div className="p-1">
                  {(['Student', 'Working Professional', 'Startup Founder'] as const).map((profile) => (
                    <button
                      key={profile}
                      onClick={() => {
                        onProfileChange?.(profile);
                        setIsProfileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${userProfile === profile ? 'text-cyan-600 dark:text-cyan-400 font-medium bg-cyan-50/50 dark:bg-cyan-900/10' : 'text-slate-700 dark:text-gray-300'}`}
                    >
                      {profile}
                      {userProfile === profile && <Check size={14} className="text-cyan-600 dark:text-cyan-400" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800/50 p-1">
                  <button
                    onClick={() => {
                      setActiveTab("settings");
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-slate-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    <span>⚙️</span> Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
