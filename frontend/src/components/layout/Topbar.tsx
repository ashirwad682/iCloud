import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  User as UserIcon,
  LogOut,
  Shield,
  Sun,
  Moon,
  HardDrive,
} from 'lucide-react';

/* Two-panel sidebar toggle icon */
const SidebarToggleIcon: React.FC<{ className?: string }> = ({ className = 'w-[18px] h-[18px]' }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
    <rect x="2" y="3" width="16" height="14" rx="2.5" />
    <line x1="7" y1="3" x2="7" y2="17" />
  </svg>
);

/* Apple logo SVG */
const AppleLogo: React.FC<{ className?: string }> = ({ className = 'w-[17px] h-[17px]' }) => (
  <svg viewBox="0 0 170 170" fill="currentColor" className={className}>
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.7-14.44-6.41-10.22-11.39-21.73-14.93-34.54-3.54-12.8-5.31-24.3-5.31-34.5 0-13.62 3.63-24.84 10.9-33.64 7.27-8.8 16.32-13.3 27.15-13.51 4.79 0 10.08 1.25 15.86 3.75 5.78 2.5 9.77 3.81 11.97 3.93 1.85-.24 5.99-1.63 12.43-4.17 6.44-2.54 11.75-3.71 15.93-3.51 12.23.63 21.9 4.88 29.02 12.74-10.74 6.52-16 15.35-15.79 26.5.21 8.75 3.58 16.14 10.12 22.18 6.53 6.04 14.38 9.53 23.53 10.47-2.29 7.08-5.26 14.28-8.91 21.6zm-29.39-105.7c0-6.24 2.29-12.18 6.87-17.82 4.58-5.64 10.18-9.4 16.8-11.27.73 2.19 1.1 4.48 1.1 6.88 0 6.04-2.34 12.08-7.03 18.13-4.69 6.04-10.47 9.8-17.34 11.28-.21-2.4-.4-4.8-.4-7.2z" />
  </svg>
);
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, isSidebarOpen, toggleSidebar } = useUIStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="h-[52px] px-3 md:px-4 flex items-center justify-between bg-[#F5F5F7] dark:bg-[#161618] border-b border-[#D8D8DC] dark:border-[#2C2C2E] select-none z-20 relative font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">

      {/* Left: sidebar toggle when sidebar is collapsed */}
      <div className="w-10 flex items-center">
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#0071E3] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] transition-colors"
            title="Show Sidebar"
          >
            <SidebarToggleIcon className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {/* Center: iCloud Photos — always visible, absolutely centered */}
      <NavLink
        to="/photos"
        className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1.5 cursor-pointer group"
      >
        <AppleLogo className="w-[17px] h-[17px] text-[#1D1D1F] dark:text-white group-hover:opacity-75 transition-opacity" />
        <div className="flex items-baseline space-x-[2px]">
          <span className="font-semibold text-[14px] tracking-[-0.2px] text-[#1D1D1F] dark:text-white">iCloud</span>
          <span className="text-[14px] tracking-[-0.2px] text-[#6E6E73] dark:text-[#86868B] font-normal"> Photos</span>
        </div>
      </NavLink>

      {/* Right Controls: Theme Toggle & Avatar */}
      <div className="flex items-center space-x-2">
        {/* Theme Mode Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#1D1D1F]" />
          )}
        </button>

        {/* Apple Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-7 h-7 rounded-full bg-[#8E8E93] text-white flex items-center justify-center font-medium text-[11px] hover:ring-2 hover:ring-[#0071E3] transition-all ml-1 shadow-xs"
            title="Apple Account"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : user ? (
              `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            ) : (
              'A'
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#2C2C2E] p-3 shadow-2xl border border-[#E5E5EA] dark:border-[#3A3A3C] z-50 text-[13px] animate-scale-in">
              <div className="px-2 py-1.5 border-b border-[#E5E5EA] dark:border-[#3A3A3C] mb-2">
                <div className="font-semibold text-[#1D1D1F] dark:text-white">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-[11px] text-[#86868B] truncate">{user?.email}</div>
              </div>

              <NavLink
                to="/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <UserIcon className="w-4 h-4 text-[#0071E3]" />
                <span>Apple Account Settings</span>
              </NavLink>

              <NavLink
                to="/settings/security"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <Shield className="w-4 h-4 text-[#34C759]" />
                <span>Security & Password</span>
              </NavLink>

              <NavLink
                to="/settings/storage"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <HardDrive className="w-4 h-4 text-[#0071E3]" />
                <span>iCloud Storage</span>
              </NavLink>

              <button
                onClick={logout}
                className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors mt-2 pt-2 border-t border-[#E5E5EA] dark:border-[#3A3A3C]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
