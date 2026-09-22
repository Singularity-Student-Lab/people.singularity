'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutGroup } from 'framer-motion';
import { Users, ArrowUpRight, LogIn, Info, ChevronDown } from 'lucide-react';
import {
  NotchItem,
  NotchLeftWing,
  NotchRightWing,
  NotchDropdownItem,
  type NotchItemData,
} from '@/components/ui/notch-nav';
import { cn } from '@/lib/utils';

export function PublicNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = pathname.startsWith('/about') ? 'about' : 'directory';

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const navItems: NotchItemData[] = [
    {
      id: 'directory',
      label: 'Directory',
      icon: Users,
    },
    {
      id: 'about',
      label: 'About Lab',
      icon: Info,
    },
  ];

  const handleTabSelect = (id: string) => {
    setIsDropdownOpen(false);
    if (id === 'directory') {
      if (pathname !== '/') {
        router.push('/');
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (id === 'about') {
      if (pathname !== '/about') {
        router.push('/about');
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="relative z-40 w-full flex justify-center select-none pt-0">
      <div ref={containerRef} className="relative flex flex-col items-center max-w-full px-2">
        <div
          role="navigation"
          aria-label="Navigation"
          className="relative flex items-center h-10 sm:h-11 px-2.5 sm:px-4 bg-zinc-950 text-zinc-50 rounded-b-[20px] sm:rounded-b-[24px] shadow-sm gap-2 sm:gap-3.5 select-none max-w-full font-absans"
        >
          <NotchLeftWing position="top" className="text-zinc-950" />
          <NotchRightWing position="top" className="text-zinc-950" />

          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="relative size-5 sm:size-5.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/singularity_logo.webp"
                alt="Singularity Logo"
                width={22}
                height={22}
                className="w-full h-full object-contain mix-blend-screen"
                priority
              />
            </div>
            <span className="font-serif text-xs sm:text-sm font-medium tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              Singularity
            </span>
          </Link>

          <div className="h-3.5 sm:h-4 w-px bg-zinc-800" />

          {/* Desktop Navigation Tabs */}
          <div className="hidden sm:flex items-center">
            <LayoutGroup id="notch-nav-pill">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {navItems.map((item) => (
                  <NotchItem
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    isActive={activeTab === item.id}
                    onSelect={handleTabSelect}
                    className="h-7.5 px-2.5 text-xs"
                  />
                ))}
              </div>
            </LayoutGroup>
          </div>

          {/* Mobile Navigation Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="sm:hidden flex items-center gap-1 text-[11px] font-medium text-zinc-300 px-2 py-1 rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <span>{navItems.find((n) => n.id === activeTab)?.label}</span>
            <ChevronDown
              className={cn(
                'size-3 text-zinc-400 transition-transform duration-200',
                isDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          <div className="h-3.5 sm:h-4 w-px bg-zinc-800" />

          {/* Sign In Link */}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full border border-zinc-700/80 transition-all shrink-0 group"
          >
            <LogIn className="size-3 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            <span>Sign In</span>
            <ArrowUpRight className="size-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Dropdown Menu */}
        {isDropdownOpen && (
          <div className="sm:hidden absolute top-full mt-1.5 w-44 bg-zinc-950 text-zinc-50 rounded-2xl p-1.5 shadow-xl border border-zinc-800 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <NotchDropdownItem
                  key={item.id}
                  item={item}
                  isSelected={activeTab === item.id}
                  onSelect={handleTabSelect}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
