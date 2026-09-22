'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  Mail,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  GitPullRequest,
  ArrowUpRight,
} from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/icons';
import { GitHubActivityData } from '@/lib/github/fetch-contributions';

export interface PortfolioMemberProps {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  bio: string;
  bioHighlights: string[];
  bookCallUrl?: string | null;
  email?: string | null;
  github?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  discord?: string | null;
  resumeUrl?: string | null;
  profileImageUrl?: string | null;
  githubUsername?: string | null;
  closingQuote?: string | null;
  quoteAuthor?: string | null;
  experiences: {
    id: string;
    title: string;
    org: string;
    location: string;
    startDate: string;
    endDate: string | null;
    description: string;
    sortOrder: number;
  }[];
  projects: {
    id: string;
    name: string;
    thumbnailUrl: string | null;
    status: 'LIVE' | 'IN_PROGRESS' | 'ARCHIVED';
    description: string;
    projectUrl: string | null;
    techTags: string[];
    sortOrder: number;
  }[];
  skills: {
    skill: {
      id: string;
      name: string;
      category: string;
    };
    sortOrder: number;
  }[];
}

interface TemplateProps {
  member: PortfolioMemberProps;
  githubData?: GitHubActivityData | null;
}

export function MemberPortfolioTemplate({ member, githubData }: TemplateProps) {
  const [showAllExperiences, setShowAllExperiences] = useState(false);
  const [expandedExperienceIds, setExpandedExperienceIds] = useState<Record<string, boolean>>({});
  const [imgError, setImgError] = useState(false);

  const toggleExperienceCollapse = (id: string) => {
    setExpandedExperienceIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleExperiences = showAllExperiences
    ? member.experiences
    : member.experiences.slice(0, 4);

  const categoryTitles: Record<string, string> = {
    CORE_LANGUAGES: 'Languages & Core Systems',
    FRAMEWORKS_LIBRARIES: 'Frameworks & Libraries',
    SYSTEMS_INFRA: 'Systems & Infrastructure',
    AI_ML: 'AI & Machine Learning',
    TOOLS_DEV: 'Tools & DevOps',
  };

  const skillsByCategory = member.skills.reduce((acc, item) => {
    const cat = item.skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item.skill.name);
    return acc;
  }, {} as Record<string, string[]>);

  const initials = member.fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const cleanAvatarUrl = member.profileImageUrl
    ? member.profileImageUrl.replace(/^https?:\/\/\/uploads\//, '/uploads/')
    : null;

  useEffect(() => {
    setImgError(false);
  }, [member.profileImageUrl]);

  const hasCtaRow = Boolean(member.bookCallUrl || member.email);
  const hasSocialsRow = Boolean(
    member.github || member.twitter || member.linkedin || member.discord || member.resumeUrl
  );

  return (
    <div className="w-full max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-6 font-sans text-stone-900 selection:bg-stone-200 space-y-14">
      {/* 1. HERO IDENTITY & BIOGRAPHY */}
      <section aria-label="Identity" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          {/* Avatar */}
          <div className="relative size-24 sm:size-32 rounded-2xl bg-white border border-stone-200/90 shadow-sm overflow-hidden shrink-0">
            {cleanAvatarUrl && !imgError ? (
              <Image
                src={cleanAvatarUrl}
                alt={member.fullName}
                fill
                sizes="(max-width: 640px) 96px, 128px"
                className="object-cover"
                priority
                unoptimized={Boolean(cleanAvatarUrl.startsWith('/uploads/'))}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-800 font-serif font-medium text-2xl tracking-wider select-none">
                {initials || 'ME'}
              </div>
            )}
          </div>

          {/* Name & Title */}
          <div className="space-y-1.5 flex-1">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-stone-950 font-normal tracking-tight leading-tight">
              {member.fullName}
            </h1>
            <p className="font-mono text-xs sm:text-sm text-stone-600 uppercase tracking-wide font-medium">
              {member.title}
            </p>
          </div>
        </div>

        {/* Bio Narrative */}
        {member.bio && (
          <p className="text-stone-700 text-base sm:text-lg font-light leading-relaxed max-w-2xl whitespace-pre-line">
            {member.bio}
          </p>
        )}

        {/* Bio Highlights */}
        {member.bioHighlights && member.bioHighlights.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-stone-200/70 max-w-2xl">
            {member.bioHighlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-700 leading-relaxed font-normal">
                <span className="inline-block size-1.5 rounded-full bg-stone-400 mt-2 shrink-0" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions & Social Links */}
        {(hasCtaRow || hasSocialsRow) && (
          <div className="pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
            {hasCtaRow && (
              <div className="flex flex-wrap items-center gap-2">
                {member.bookCallUrl && (
                  <a
                    href={member.bookCallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <Calendar className="size-3.5" />
                    <span>Book a call</span>
                    <ExternalLink className="size-3 text-zinc-400" />
                  </a>
                )}
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider font-medium text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-full transition-colors"
                  >
                    <Mail className="size-3.5 text-stone-500" />
                    <span>Send email</span>
                  </a>
                )}
              </div>
            )}

            {hasSocialsRow && (
              <div className="flex flex-wrap items-center gap-1.5">
                {member.github && (
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200 transition-colors"
                  >
                    <GithubIcon className="size-3.5" />
                    <span>GitHub</span>
                  </a>
                )}
                {member.twitter && (
                  <a
                    href={member.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200 transition-colors"
                  >
                    <span className="font-bold text-xs">𝕏</span>
                    <span>Twitter</span>
                  </a>
                )}
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200 transition-colors"
                  >
                    <LinkedinIcon className="size-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {member.discord && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-mono text-stone-600 bg-stone-100 border border-stone-200 select-all cursor-default">
                    <span className="text-[10px] uppercase text-stone-400">Discord:</span>
                    <span>{member.discord}</span>
                  </span>
                )}
                {member.resumeUrl && (
                  <a
                    href={member.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-colors"
                  >
                    <FileText className="size-3.5 text-stone-600" />
                    <span>Resume</span>
                    <ExternalLink className="size-2.5 text-stone-400" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. PROJECTS */}
      {member.projects && member.projects.length > 0 && (
        <section aria-label="Projects" className="space-y-6 pt-6 border-t border-stone-200/80">
          <div className="border-b border-stone-200 pb-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
              Projects
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {member.projects.map((project) => {
              const statusConfig = {
                LIVE: { label: 'Live', dotClass: 'bg-emerald-500' },
                IN_PROGRESS: { label: 'In Progress', dotClass: 'bg-amber-500' },
                ARCHIVED: { label: 'Archived', dotClass: 'bg-stone-400' },
              }[project.status] || { label: project.status, dotClass: 'bg-stone-400' };

              return (
                <div
                  key={project.id}
                  className="group flex flex-col justify-between p-5 bg-white border border-stone-200/80 hover:border-stone-400 rounded-xl transition-all duration-200 shadow-2xs space-y-4"
                >
                  <div className="space-y-3">
                    {project.thumbnailUrl && (
                      <div className="relative w-full h-36 bg-stone-100 rounded-lg overflow-hidden border border-stone-200/80">
                        <Image
                          src={project.thumbnailUrl}
                          alt={project.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 360px"
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-serif text-lg font-medium text-stone-950 group-hover:text-black tracking-tight leading-snug">
                        {project.name}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-stone-500 shrink-0">
                        <span className={`size-1.5 rounded-full ${statusConfig.dotClass}`} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>

                    {project.description && (
                      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light line-clamp-3">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-100 space-y-3">
                    {project.techTags && project.techTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {project.techTags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 text-[10px] font-mono text-stone-600 bg-stone-50 border border-stone-200 rounded-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {project.projectUrl && (
                      <a
                        href={project.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-stone-800 hover:text-black group-hover:underline underline-offset-4 transition-colors"
                      >
                        <span>View Project</span>
                        <ArrowUpRight className="size-3.5 text-stone-400 group-hover:text-black transition-colors" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. EXPERIENCE */}
      {member.experiences && member.experiences.length > 0 && (
        <section aria-label="Experience" className="space-y-6 pt-6 border-t border-stone-200/80">
          <div className="border-b border-stone-200 pb-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
              Experience
            </h2>
          </div>

          <div className="space-y-4">
            {visibleExperiences.map((exp) => {
              const isExpanded = expandedExperienceIds[exp.id] ?? true;
              return (
                <div
                  key={exp.id}
                  className="p-5 bg-white border border-stone-200/80 rounded-xl space-y-2 shadow-2xs hover:border-stone-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                    <h3 className="text-base font-medium text-stone-950">
                      {exp.title}
                    </h3>
                    <span className="text-xs font-mono text-stone-500 shrink-0">
                      {exp.startDate} — {exp.endDate || 'Present'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-600">
                    <span className="font-medium text-stone-800">{exp.org}</span>
                    {exp.location && (
                      <>
                        <span className="text-stone-300">•</span>
                        <span className="inline-flex items-center gap-1 text-stone-500">
                          <MapPin className="size-3 text-stone-400" />
                          {exp.location}
                        </span>
                      </>
                    )}
                  </div>

                  {exp.description && (
                    <div className="pt-1">
                      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
                        {exp.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {member.experiences.length > 4 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAllExperiences(!showAllExperiences)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-600 hover:text-stone-950 font-medium py-1 cursor-pointer border-b border-stone-300 transition-colors"
              >
                <span>{showAllExperiences ? 'Show Less' : `View All (${member.experiences.length}) Experiences`}</span>
                {showAllExperiences ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. GITHUB CONTRIBUTIONS */}
      {member.githubUsername && githubData && (
        <section aria-label="Open Source Contributions" className="space-y-4 pt-6 border-t border-stone-200/80">
          <div className="border-b border-stone-200 pb-2 flex items-center justify-between">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
              Open Source & Contributions
            </h2>
            <a
              href={`https://github.com/${githubData.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-600 hover:text-stone-950 bg-white border border-stone-200 px-3 py-1 rounded-md shadow-2xs transition-colors"
            >
              <GithubIcon className="size-3.5" />
              <span>@{githubData.username}</span>
            </a>
          </div>

          <div className="p-5 bg-white border border-stone-200/80 rounded-xl shadow-2xs space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-stone-600 mb-3 pb-2 border-b border-stone-100 gap-1">
                <span className="font-medium text-stone-800 text-[11px]">
                  Activity Heatmap
                </span>
                <span className="text-[11px] text-stone-500">
                  {githubData.totalPublicEvents} public event{githubData.totalPublicEvents === 1 ? '' : 's'} • Past 52 Weeks
                </span>
              </div>

              {/* Heatmap Grid */}
              <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="min-w-[690px] pt-1">
                  <div className="flex gap-[3px] ml-7 mb-1.5 text-[10px] font-mono text-stone-500 select-none h-4">
                    {githubData.heatmapWeeks.map((week, wIdx) => (
                      <div key={wIdx} className="w-2.5 sm:w-3 shrink-0 text-left relative overflow-visible">
                        {week.monthLabel ? (
                          <span className="absolute left-0 top-0 whitespace-nowrap font-medium text-stone-600">
                            {week.monthLabel}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex flex-col gap-[3px] text-[9px] font-mono text-stone-400 select-none shrink-0 w-5">
                      <span className="h-2.5 sm:h-3 leading-none opacity-0">Sun</span>
                      <span className="h-2.5 sm:h-3 leading-none flex items-center">Mon</span>
                      <span className="h-2.5 sm:h-3 leading-none opacity-0">Tue</span>
                      <span className="h-2.5 sm:h-3 leading-none flex items-center">Wed</span>
                      <span className="h-2.5 sm:h-3 leading-none opacity-0">Thu</span>
                      <span className="h-2.5 sm:h-3 leading-none flex items-center">Fri</span>
                      <span className="h-2.5 sm:h-3 leading-none opacity-0">Sat</span>
                    </div>

                    <div className="flex gap-[3px] flex-1">
                      {githubData.heatmapWeeks.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-[3px] shrink-0">
                          {week.days.map((day, dIdx) => {
                            const cellColor = {
                              0: 'bg-stone-100 border border-stone-200/60',
                              1: 'bg-emerald-200 border border-emerald-300',
                              2: 'bg-emerald-400 border border-emerald-500',
                              3: 'bg-emerald-600 border border-emerald-700',
                              4: 'bg-emerald-800 border border-emerald-900',
                            }[day.level];
                            return (
                              <div
                                key={dIdx}
                                title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.formattedDate || day.date}`}
                                className={`size-2.5 sm:size-3 rounded-[2px] ${cellColor} transition-transform hover:scale-125 cursor-pointer`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 text-[11px] font-mono text-stone-500 gap-2 mt-2">
                <span className="text-stone-400 text-[10px]">
                  Public telemetry
                </span>
                <div className="flex items-center gap-1.5 select-none">
                  <span className="text-[10px]">Less</span>
                  <span className="size-2.5 rounded-[1px] bg-stone-100 border border-stone-200/60" />
                  <span className="size-2.5 rounded-[1px] bg-emerald-200 border border-emerald-300" />
                  <span className="size-2.5 rounded-[1px] bg-emerald-400 border border-emerald-500" />
                  <span className="size-2.5 rounded-[1px] bg-emerald-600 border border-emerald-700" />
                  <span className="size-2.5 rounded-[1px] bg-emerald-800 border border-emerald-900" />
                  <span className="text-[10px]">More</span>
                </div>
              </div>
            </div>

            {githubData.recentPRs && githubData.recentPRs.length > 0 && (
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                  Recent Contributions
                </span>
                <div className="space-y-1.5">
                  {githubData.recentPRs.map((pr, pIdx) => (
                    <div key={pIdx} className="flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <GitPullRequest className="size-3.5 text-stone-400 shrink-0" />
                        <a
                          href={pr.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-800 hover:text-stone-950 truncate font-normal underline decoration-stone-300 underline-offset-2"
                        >
                          {pr.title}
                        </a>
                      </div>
                      <span className="font-mono text-stone-400 text-[11px] shrink-0">
                        {pr.repoName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. SKILLS */}
      {Object.keys(skillsByCategory).length > 0 && (
        <section aria-label="Skills" className="space-y-6 pt-6 border-t border-stone-200/80">
          <div className="border-b border-stone-200 pb-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
              Skills
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(skillsByCategory).map(([catKey, skillNames]) => (
              <div
                key={catKey}
                className="p-4 bg-white border border-stone-200/80 rounded-xl space-y-2.5 shadow-2xs"
              >
                <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 font-medium">
                  {categoryTitles[catKey] || catKey}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {skillNames.map((name, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2.5 py-1 text-xs font-mono text-stone-800 bg-stone-50 border border-stone-200/70 rounded-md"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. CLOSING QUOTE */}
      {member.closingQuote && (
        <section aria-label="Quote" className="pt-6 border-t border-stone-200/80">
          <blockquote className="p-6 bg-white border border-stone-200/80 rounded-xl shadow-2xs space-y-2.5">
            <p className="font-serif italic text-lg sm:text-xl text-stone-800 leading-relaxed font-normal">
              &ldquo;{member.closingQuote}&rdquo;
            </p>
            {member.quoteAuthor && (
              <cite className="block text-xs font-mono tracking-wider uppercase text-stone-500 not-italic">
                — {member.quoteAuthor}
              </cite>
            )}
          </blockquote>
        </section>
      )}
    </div>
  );
}
