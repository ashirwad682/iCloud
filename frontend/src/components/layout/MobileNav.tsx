import React from 'react';
import { NavLink } from 'react-router-dom';
import { Image, LayoutGrid, FolderHeart, Video, Settings } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const links = [
    { to: '/photos', icon: Image, label: 'Photos' },
    { to: '/albums', icon: LayoutGrid, label: 'Albums' },
    { to: '/favorites', icon: FolderHeart, label: 'Favorites' },
    { to: '/videos', icon: Video, label: 'Videos' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-nav flex items-center justify-around px-2 z-40 border-t border-border">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-xl transition-all duration-200 ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <link.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
