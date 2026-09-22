'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

export interface DirectoryMember {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  bioHighlights: string[];
  skills: {
    skill: {
      id: string;
      name: string;
      category: string;
    };
  }[];
}

export function MembersDirectoryClient({ members }: { members: DirectoryMember[] }) {
  if (members.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-stone-200/80 rounded-2xl p-8">
        <p className="font-serif text-base text-stone-600">
          No members currently listed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-7 2xl:gap-8">
      {members.map((member) => {
        const initials = member.fullName
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        const avatarSrc = member.profileImageUrl?.replace(/^https?:\/\/\/uploads\//, '/uploads/');

        return (
          <Link
            key={member.id}
            href={`/members/${member.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between bg-white border border-stone-200/80 hover:border-stone-400/90 rounded-2xl p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 space-y-5"
          >
            {/* Top Bar: Singularity Logo & Minimalist Corner Arrow */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative size-6 rounded-md bg-black p-1 flex items-center justify-center border border-black/90 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Image
                    src="/singularity_logo.webp"
                    alt="Singularity Logo"
                    width={18}
                    height={18}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-mono text-[10px] tracking-wider text-stone-500 uppercase font-medium">
                  Singularity
                </span>
              </div>

              <ArrowUpRight className="size-4.5 text-stone-300 group-hover:text-stone-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
            </div>

            {/* Profile Hero: Avatar & Main Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative size-16 sm:size-18 rounded-xl bg-stone-100 border border-stone-200/80 overflow-hidden shadow-xs shrink-0 group-hover:scale-105 transition-transform duration-300">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt={member.fullName}
                      fill
                      sizes="72px"
                      unoptimized={Boolean(avatarSrc.includes('/uploads/'))}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif text-stone-700 text-xl font-medium bg-stone-100">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-stone-950 group-hover:text-black tracking-tight leading-tight transition-colors">
                    {member.fullName}
                  </h2>
                  <p className="font-absans text-xs text-stone-500 uppercase tracking-wider line-clamp-1 font-medium">
                    {member.title}
                  </p>
                </div>
              </div>

              {/* Bio Excerpt */}
              {member.bio && (
                <p className="font-absans text-xs text-stone-600 font-normal leading-relaxed line-clamp-2 pt-1">
                  {member.bio}
                </p>
              )}

              {/* Skills Tags */}
              {member.skills && member.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {member.skills.slice(0, 4).map((s, idx) => (
                    <span
                      key={idx}
                      className="font-absans px-2.5 py-1 text-xs text-stone-700 bg-stone-50 border border-stone-200/70 rounded-md group-hover:border-stone-300 group-hover:bg-stone-100/80 transition-colors"
                    >
                      {s.skill.name}
                    </span>
                  ))}
                  {member.skills.length > 4 && (
                    <span className="font-absans px-2 py-1 text-[11px] text-stone-400 bg-transparent border border-dashed border-stone-300 rounded-md">
                      +{member.skills.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Footer: Verification & Prompt */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-absans text-stone-500">
              <span className="font-medium text-stone-800 group-hover:text-black group-hover:underline underline-offset-4 transition-colors">
                View Portfolio
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-stone-400">
                <ShieldCheck className="size-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
