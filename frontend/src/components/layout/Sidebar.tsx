import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Image,
  Heart,
  Clock,
  Sparkles,
  Folder,
  Layers,
  EyeOff,
  Trash2,
  Users,
  Link2,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { Album, SharedAlbum } from '../../types';

/* ── Apple logo ──────────────────────────────────────────────── */
const AppleLogo: React.FC<{ className?: string }> = ({ className = 'w-[18px] h-[18px]' }) => (
  <svg viewBox="0 0 170 170" fill="currentColor" className={className}>
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.7-14.44-6.41-10.22-11.39-21.73-14.93-34.54-3.54-12.8-5.31-24.3-5.31-34.5 0-13.62 3.63-24.84 10.9-33.64 7.27-8.8 16.32-13.3 27.15-13.51 4.79 0 10.08 1.25 15.86 3.75 5.78 2.5 9.77 3.81 11.97 3.93 1.85-.24 5.99-1.63 12.43-4.17 6.44-2.54 11.75-3.71 15.93-3.51 12.23.63 21.9 4.88 29.02 12.74-10.74 6.52-16 15.35-15.79 26.5.21 8.75 3.58 16.14 10.12 22.18 6.53 6.04 14.38 9.53 23.53 10.47-2.29 7.08-5.26 14.28-8.91 21.6zm-29.39-105.7c0-6.24 2.29-12.18 6.87-17.82 4.58-5.64 10.18-9.4 16.8-11.27.73 2.19 1.1 4.48 1.1 6.88 0 6.04-2.34 12.08-7.03 18.13-4.69 6.04-10.47 9.8-17.34 11.28-.21-2.4-.4-4.8-.4-7.2z" />
  </svg>
);

/* ── Sidebar toggle icon ──────────────────────────────────────── */
const SidebarToggleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
    <rect x="2" y="3" width="16" height="14" rx="2.5" />
    <line x1="7" y1="3" x2="7" y2="17" />
  </svg>
);

/* ── Section label (PHOTOS / COLLECTIONS / SHARING) ─────────── */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 pt-5 pb-1.5 text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] tracking-[0.6px] uppercase select-none">
    {children}
  </div>
);

/* ── Standard nav row ────────────────────────────────────────── */
const SideNavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}> = ({ to, icon, label, exact }) => (
  <NavLink
    to={to}
    end={exact}
    className={({ isActive }) =>
      `flex items-center space-x-3 mx-2 px-3 py-[7px] rounded-[9px] font-medium transition-all text-[15px] leading-tight ${
        isActive
          ? 'bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7]'
          : 'text-[#1D1D1F] dark:text-[#E5E5EA] hover:bg-[#EBEBEF] dark:hover:bg-[#2A2A2C]'
      }`
    }
  >
    <span className="text-[#0071E3] flex-shrink-0">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

/* ── Expandable row (chevron left, nav right, optional ... button) ── */
const ExpandableRow: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  isActive?: boolean;
  showMoreButton?: boolean;
  onMoreClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}> = ({
  to,
  icon,
  label,
  isOpen,
  onToggle,
  isActive,
  showMoreButton,
  onMoreClick,
  children,
}) => (
  <div>
    <div className="group/row flex items-center mx-2 relative">
      {/* Chevron LEFT — click to expand/collapse */}
      <button
        onClick={onToggle}
        className="w-7 h-9 flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white transition-colors flex-shrink-0"
      >
        {isOpen ? (
          <ChevronDown className="w-[13px] h-[13px] stroke-[2.5]" />
        ) : (
          <ChevronRight className="w-[13px] h-[13px] stroke-[2.5]" />
        )}
      </button>

      {/* Nav link */}
      <NavLink
        to={to}
        className={`flex-1 flex items-center justify-between px-1.5 py-[7px] pr-2 rounded-[9px] font-medium transition-all text-[15px] leading-tight ${
          isActive
            ? 'bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7]'
            : 'text-[#1D1D1F] dark:text-[#E5E5EA] hover:bg-[#EBEBEF] dark:hover:bg-[#2A2A2C]'
        }`}
      >
        <div className="flex items-center space-x-3 truncate">
          <span className="text-[#0071E3] flex-shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
        </div>

        {/* ... More options button on right (matching Apple iCloud sidebar) */}
        {showMoreButton && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onMoreClick) onMoreClick(e);
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-opacity ${
              isActive
                ? 'opacity-100 bg-[#D1D1D6] dark:bg-[#48484A] text-[#1D1D1F] dark:text-white'
                : 'opacity-0 group-hover/row:opacity-100 hover:bg-[#D1D1D6] dark:hover:bg-[#48484A] text-[#86868B]'
            }`}
            title="Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </div>
        )}
      </NavLink>
    </div>

    {/* Sub-items */}
    {isOpen && children && (
      <div className="pl-10 pr-3 pt-0.5 pb-1 space-y-0.5">
        {children}
      </div>
    )}
  </div>
);

/* ════════════════════════════════════════════════════════════════
   SIDEBAR COMPONENT
════════════════════════════════════════════════════════════════ */
export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [sharedAlbums, setSharedAlbums] = useState<SharedAlbum[]>([]);
  const [isAlbumsOpen, setIsAlbumsOpen] = useState(true);
  const [isSharedAlbumsOpen, setIsSharedAlbumsOpen] = useState(true);
  const [isMediaTypesOpen, setIsMediaTypesOpen] = useState(false);

  useEffect(() => {
    const fetch = () => {
      api.get('/albums').then((r: any) => { if (r.data?.success) setAlbums(r.data.data); }).catch(() => {});
      api.get('/shared-albums').then((r: any) => { if (r.data?.success) setSharedAlbums(r.data.data); }).catch(() => {});
    };
    fetch();
    window.addEventListener('cv_media_uploaded', fetch);
    return () => window.removeEventListener('cv_media_uploaded', fetch);
  }, []);

  if (!isSidebarOpen) return null;

  const isAlbumDetailActive = location.pathname.startsWith('/albums/');
  const isSharedDetailActive = location.pathname.startsWith('/shared-albums/');

  return (
    <aside className="w-[260px] h-screen flex-shrink-0 hidden md:flex flex-col bg-[#F5F5F7] dark:bg-[#161618] border-r border-[#D8D8DC] dark:border-[#2C2C2E] select-none z-30 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">

      {/* ── Header: iCloud Photos + sidebar toggle ── */}
      <div className="h-[52px] flex-shrink-0 flex items-center justify-between px-4 border-b border-[#D8D8DC] dark:border-[#2C2C2E]">
        <NavLink to="/photos" className="flex items-center space-x-2 group">
          <AppleLogo className="w-[18px] h-[18px] text-[#1D1D1F] dark:text-white" />
          <div className="flex items-baseline space-x-[3px]">
            <span className="font-semibold text-[15px] tracking-[-0.2px] text-[#1D1D1F] dark:text-white">iCloud</span>
            <span className="text-[15px] tracking-[-0.2px] text-[#6E6E73] dark:text-[#86868B] font-normal"> Photos</span>
          </div>
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#0071E3] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] transition-colors"
          title="Hide Sidebar"
        >
          <SidebarToggleIcon className="w-[19px] h-[19px]" />
        </button>
      </div>

      {/* ── Nav body ── */}
      <div className="flex-1 overflow-y-auto py-1">

        {/* PHOTOS */}
        <SectionLabel>Photos</SectionLabel>
        <div className="space-y-0.5">
          <SideNavLink to="/photos" exact
            icon={<Image className="w-[18px] h-[18px]" />}
            label="Library"
          />
          <SideNavLink to="/favorites"
            icon={<Heart className="w-[18px] h-[18px]" />}
            label="Favorites"
          />
          <SideNavLink to="/recents"
            icon={<Clock className="w-[18px] h-[18px]" />}
            label="Recents"
          />
        </div>

        {/* COLLECTIONS */}
        <SectionLabel>Collections</SectionLabel>
        <div className="space-y-0.5">
          <SideNavLink to="/memories"
            icon={<Sparkles className="w-[18px] h-[18px]" />}
            label="Memories"
          />

          {/* > Albums */}
          <ExpandableRow
            to="/albums"
            icon={<Folder className="w-[18px] h-[18px]" />}
            label="Albums"
            isOpen={isAlbumsOpen}
            onToggle={() => setIsAlbumsOpen((v) => !v)}
            isActive={location.pathname === '/albums' || isAlbumDetailActive}
            showMoreButton={true}
          >
            {albums.map((a) => (
              <NavLink
                key={a._id}
                to={`/albums/${a._id}`}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${
                    isActive
                      ? 'text-[#0071E3] font-semibold bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                      : 'text-[#3C3C43] dark:text-[#A1A1A6] hover:bg-[#EBEBEF] dark:hover:bg-[#2A2A2C]'
                  }`
                }
              >
                <span className="truncate">{a.title}</span>
                <span className="text-[11px] text-[#86868B] ml-1 flex-shrink-0">{a.itemCount}</span>
              </NavLink>
            ))}
          </ExpandableRow>

          {/* > Media Types */}
          <ExpandableRow
            to="/media-types"
            icon={<Layers className="w-[18px] h-[18px]" />}
            label="Media Types"
            isOpen={isMediaTypesOpen}
            onToggle={() => setIsMediaTypesOpen((v) => !v)}
            isActive={location.pathname === '/media-types'}
          >
            {[
              { to: '/videos', label: 'Videos' },
              { to: '/photos?tag=Selfie', label: 'Selfies' },
              { to: '/photos?tag=Screenshot', label: 'Screenshots' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `block px-3 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${
                    isActive
                      ? 'text-[#0071E3] font-semibold bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                      : 'text-[#3C3C43] dark:text-[#A1A1A6] hover:bg-[#EBEBEF] dark:hover:bg-[#2A2A2C]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </ExpandableRow>

          <SideNavLink to="/hidden"
            icon={<EyeOff className="w-[18px] h-[18px]" />}
            label="Hidden"
          />
          <SideNavLink to="/trash"
            icon={<Trash2 className="w-[18px] h-[18px]" />}
            label="Recently Deleted"
          />
        </div>

        {/* SHARING */}
        <SectionLabel>Sharing</SectionLabel>
        <div className="space-y-0.5">
          {/* > Shared Albums */}
          <ExpandableRow
            to="/shared"
            icon={<Users className="w-[18px] h-[18px]" />}
            label="Shared Albums"
            isOpen={isSharedAlbumsOpen}
            onToggle={() => setIsSharedAlbumsOpen((v) => !v)}
            isActive={location.pathname === '/shared' || isSharedDetailActive}
            showMoreButton={true}
          >
            {sharedAlbums.map((a) => (
              <NavLink
                key={a._id}
                to={`/shared-albums/${a._id}`}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${
                    isActive
                      ? 'text-[#0071E3] font-semibold bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                      : 'text-[#3C3C43] dark:text-[#A1A1A6] hover:bg-[#EBEBEF] dark:hover:bg-[#2A2A2C]'
                  }`
                }
              >
                <span className="truncate">{a.title}</span>
                <span className="text-[11px] text-[#86868B] ml-1 flex-shrink-0">{a.itemCount}</span>
              </NavLink>
            ))}
          </ExpandableRow>

          <SideNavLink to="/shared-links"
            icon={<Link2 className="w-[18px] h-[18px]" />}
            label="iCloud Links"
          />
        </div>

        {/* bottom spacer */}
        <div className="h-6" />
      </div>

      {/* ── Footer: Cloud Storage ── */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-[#D8D8DC] dark:border-[#2C2C2E] text-[11px] text-[#86868B]">
        <NavLink to="/settings/storage" className="hover:text-[#0071E3] transition-colors flex items-center justify-between">
          <span>Cloud Storage</span>
          <span>
            {((user?.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(1)} GB
            {' / '}
            {(() => {
              const quotaBytes = user?.storageQuotaBytes || 16106127360;
              const quotaGB = quotaBytes / (1024 * 1024 * 1024);
              if (quotaGB >= 1024) {
                return `${(quotaGB / 1024).toFixed(0)} TB`;
              }
              return `${quotaGB.toFixed(0)} GB`;
            })()}
          </span>
        </NavLink>
      </div>
    </aside>
  );
};
