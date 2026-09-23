'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Upload,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  Calendar,
  Briefcase,
  Layers,
  Quote,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { GithubIcon } from '@/components/icons';
import { PortfolioMemberProps } from '@/components/portfolio/MemberPortfolioTemplate';

interface SkillCatalogItem {
  id: string;
  name: string;
  category: string;
}

interface MemberDashboardClientProps {
  initialMember: PortfolioMemberProps;
  allSkills: SkillCatalogItem[];
}

export function MemberDashboardClient({ initialMember, allSkills }: MemberDashboardClientProps) {
  const [member, setMember] = useState(initialMember);
  const [activeTab, setActiveTab] = useState<'profile' | 'experiences' | 'projects' | 'skills'>('profile');

  // Status and feedback
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string, value: any) => {
    setMember((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // File upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  // 1. Profile fields save handler
  const handleSaveProfile = async () => {
    setSaving(true);
    setStatusMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: member.fullName,
          title: member.title,
          bio: member.bio,
          bioHighlights: member.bioHighlights.filter(Boolean),
          bookCallUrl: member.bookCallUrl || '',
          email: member.email || '',
          github: member.github || '',
          twitter: member.twitter || '',
          linkedin: member.linkedin || '',
          discord: member.discord || '',
          resumeUrl: member.resumeUrl || '',
          profileImageUrl: member.profileImageUrl || '',
          githubUsername: member.githubUsername || '',
          closingQuote: member.closingQuote || '',
          quoteAuthor: member.quoteAuthor || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.issues && Array.isArray(data.issues)) {
          const errMap: Record<string, string> = {};
          data.issues.forEach((issue: { field: string; message: string }) => {
            if (issue.field) errMap[issue.field] = issue.message;
          });
          setFieldErrors(errMap);
          setActiveTab('profile');
        } else if (data.field) {
          setFieldErrors({ [data.field]: data.error });
          setActiveTab('profile');
        }
        setStatusMessage({ type: 'error', text: data.error || 'Failed to save changes.' });
        setSaving(false);
        return;
      }

      setFieldErrors({});
      setStatusMessage({ type: 'success', text: 'Profile changes successfully synchronized.' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage({ type: 'error', text: 'Network connection failure while saving.' });
    } finally {
      setSaving(false);
    }
  };

  // 2. Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'avatar');

    try {
      const res = await fetch('/api/member/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'Avatar upload rejected.' });
        setUploadingAvatar(false);
        return;
      }

      setMember((prev) => ({ ...prev, profileImageUrl: data.url }));
      setStatusMessage({ type: 'success', text: 'Avatar uploaded and verified successfully.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage({ type: 'error', text: 'Network failure during avatar upload.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 3. Resume PDF upload
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'resume');

    try {
      const res = await fetch('/api/member/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'PDF resume upload rejected.' });
        setUploadingResume(false);
        return;
      }

      setMember((prev) => ({ ...prev, resumeUrl: data.url }));
      setStatusMessage({ type: 'success', text: 'Curriculum Vitae verified (%PDF-) and attached.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage({ type: 'error', text: 'Network failure during resume upload.' });
    } finally {
      setUploadingResume(false);
    }
  };

  // 4. Bio Highlights helpers (max 3)
  const handleHighlightChange = (index: number, val: string) => {
    const updated = [...member.bioHighlights];
    updated[index] = val;
    setMember({ ...member, bioHighlights: updated });
  };

  const addHighlight = () => {
    if (member.bioHighlights.length >= 3) return;
    setMember({ ...member, bioHighlights: [...member.bioHighlights, ''] });
  };

  const removeHighlight = (index: number) => {
    const updated = member.bioHighlights.filter((_, i) => i !== index);
    setMember({ ...member, bioHighlights: updated });
  };

  // 5. Experience Handlers
  const addExperienceRow = async () => {
    const newExp = {
      title: 'New Position / Appointment',
      org: 'Organization Name',
      location: 'City, Country',
      startDate: '2025',
      endDate: null,
      description: 'Summary of contributions and role responsibilities.',
      sortOrder: member.experiences.length,
    };

    try {
      const res = await fetch('/api/member/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExp),
      });
      const data = await res.json();
      if (res.ok) {
        setMember((prev) => ({ ...prev, experiences: [data.experience, ...prev.experiences] }));
        setStatusMessage({ type: 'success', text: 'Experience added.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to add experience.' });
    }
  };

  const updateExperienceField = async (id: string, field: string, value: string | null) => {
    const target = member.experiences.find((e) => e.id === id);
    if (!target) return;

    const updated = { ...target, [field]: value };
    setMember((prev) => ({
      ...prev,
      experiences: prev.experiences.map((e) => (e.id === id ? updated : e)),
    }));

    try {
      await fetch('/api/member/experiences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Auto-save failed for experience.' });
    }
  };

  const deleteExperienceRow = async (id: string) => {
    try {
      const res = await fetch(`/api/member/experiences?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMember((prev) => ({
          ...prev,
          experiences: prev.experiences.filter((e) => e.id !== id),
        }));
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to delete experience.' });
    }
  };

  // 6. Project Handlers
  const addProjectRow = async () => {
    const newProj = {
      name: 'New Project',
      thumbnailUrl: null,
      status: 'LIVE' as const,
      description: 'Project overview and technical details.',
      projectUrl: '',
      techTags: ['TypeScript', 'Next.js'],
      sortOrder: member.projects.length,
    };

    try {
      const res = await fetch('/api/member/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProj),
      });
      const data = await res.json();
      if (res.ok) {
        setMember((prev) => ({ ...prev, projects: [data.project, ...prev.projects] }));
        setStatusMessage({ type: 'success', text: 'Project card added.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to add project.' });
    }
  };

  const updateProjectField = async (
    id: string,
    field: string,
    value: string | string[] | null
  ) => {
    const target = member.projects.find((p) => p.id === id);
    if (!target) return;

    const updated = { ...target, [field]: value };
    setMember((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? updated : p)),
    }));

    try {
      await fetch('/api/member/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Auto-save failed for project.' });
    }
  };

  const deleteProjectRow = async (id: string) => {
    try {
      const res = await fetch(`/api/member/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMember((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== id),
        }));
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to delete project.' });
    }
  };

  // 7. Curated Skills Toggling & Custom Skill Addition
  const [catalogSkills, setCatalogSkills] = useState<SkillCatalogItem[]>(() => {
    const map = new Map<string, SkillCatalogItem>();
    allSkills.forEach((s) => map.set(s.id, s));
    initialMember.skills.forEach((ms) => {
      if (ms.skill && !map.has(ms.skill.id)) {
        map.set(ms.skill.id, ms.skill);
      }
    });
    return Array.from(map.values());
  });

  const [addingOtherCat, setAddingOtherCat] = useState<string | null>(null);
  const [otherSkillName, setOtherSkillName] = useState('');
  const [addingOtherLoading, setAddingOtherLoading] = useState(false);
  const [otherError, setOtherError] = useState<string | null>(null);

  const activeSkillIds = new Set(member.skills.map((s) => s.skill.id));

  const toggleSkill = async (skillItem: SkillCatalogItem) => {
    let nextIds: string[];
    if (activeSkillIds.has(skillItem.id)) {
      nextIds = member.skills.filter((s) => s.skill.id !== skillItem.id).map((s) => s.skill.id);
      setMember((prev) => ({
        ...prev,
        skills: prev.skills.filter((s) => s.skill.id !== skillItem.id),
      }));
    } else {
      nextIds = [...member.skills.map((s) => s.skill.id), skillItem.id];
      setMember((prev) => ({
        ...prev,
        skills: [...prev.skills, { skill: skillItem, sortOrder: prev.skills.length }],
      }));
    }

    try {
      await fetch('/api/member/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillIds: nextIds }),
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to synchronize skills.' });
    }
  };

  const handleAddOtherSkill = async (category: string) => {
    const trimmed = otherSkillName.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) {
      setOtherError('Skill name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 50) {
      setOtherError('Skill name is too long (max 50 chars)');
      return;
    }

    setAddingOtherLoading(true);
    setOtherError(null);

    try {
      const res = await fetch('/api/member/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, category }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtherError(data.error || 'Failed to add skill');
        setAddingOtherLoading(false);
        return;
      }

      const newSkill: SkillCatalogItem = data.skill;

      // Add to catalog if not already there
      setCatalogSkills((prev) => {
        if (prev.some((s) => s.id === newSkill.id)) return prev;
        return [...prev, newSkill];
      });

      // Attach to member skills if not already attached
      setMember((prev) => {
        if (prev.skills.some((s) => s.skill.id === newSkill.id)) return prev;
        return {
          ...prev,
          skills: [...prev.skills, { skill: newSkill, sortOrder: prev.skills.length }],
        };
      });

      setStatusMessage({ type: 'success', text: `Added "${newSkill.name}" to competencies.` });
      setOtherSkillName('');
      setAddingOtherCat(null);
    } catch {
      setOtherError('Network error while adding skill. Please try again.');
    } finally {
      setAddingOtherLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
            Portfolio Builder
          </h1>
          <p className="text-xs font-mono text-stone-500 mt-1">
            Editing verified portfolio for @{member.slug}
          </p>
        </div>

        {/* Global Save Trigger */}
        <div className="flex items-center gap-3">
          {statusMessage && (
            <div
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-mono uppercase tracking-widest font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-1 overflow-x-auto text-xs font-mono uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'profile'
              ? 'border-stone-900 text-stone-950 bg-stone-100/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          1. Header & Identity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('experiences')}
          className={`px-4 py-2.5 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'experiences'
              ? 'border-stone-900 text-stone-950 bg-stone-100/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          2. Experiences ({member.experiences.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2.5 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'projects'
              ? 'border-stone-900 text-stone-950 bg-stone-100/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          3. Projects ({member.projects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2.5 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'skills'
              ? 'border-stone-900 text-stone-950 bg-stone-100/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          4. Skills ({member.skills.length})
        </button>
      </div>

      {/* TAB 1: HEADER & PROFILE FIELDS */}
      {activeTab === 'profile' && (
        <div className="space-y-10">
          {/* Avatar and Resume Uploads */}
          <section className="p-6 bg-white border border-stone-300 space-y-6">
            <h2 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-200 pb-2">
              Official Media & Credentials
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Square Avatar Uploader */}
              <div className="space-y-3">
                <span className="block text-xs font-mono uppercase tracking-wider text-stone-700">
                  Square Headshot / Avatar (Max 2MB)
                </span>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0 bg-stone-100 border border-stone-300 overflow-hidden">
                    {member.profileImageUrl ? (
                      <Image
                        src={member.profileImageUrl.replace(/^https?:\/\/\/uploads\//, '/uploads/')}
                        alt={member.fullName}
                        fill
                        sizes="80px"
                        unoptimized={Boolean(member.profileImageUrl?.includes('/uploads/'))}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif text-stone-600 text-xl font-medium">
                        {member.fullName[0] || 'SL'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-stone-100 hover:bg-stone-200 border border-stone-300 cursor-pointer text-stone-800">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingAvatar ? 'Verifying...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-stone-500 font-mono">
                      Strict format check: JPEG, PNG, WEBP.
                    </p>
                  </div>
                </div>
              </div>

              {/* PDF Resume Uploader */}
              <div className="space-y-3">
                <span className="block text-xs font-mono uppercase tracking-wider text-stone-700">
                  Curriculum Vitae (PDF Only, Max 5MB)
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-stone-100 hover:bg-stone-200 border border-stone-300 cursor-pointer text-stone-800">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{uploadingResume ? 'Validating %PDF-...' : 'Upload PDF Resume'}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                    </label>
                    {member.resumeUrl && (
                      <a
                        href={member.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-stone-600 hover:text-stone-950 underline underline-offset-2"
                      >
                        Inspect Current CV &rarr;
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Binary magic-byte header (%PDF-) verified on ingestion.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Primary Identity Fields */}
          <section className="p-6 bg-white border border-stone-300 space-y-6">
            <h2 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-200 pb-2">
              Primary Identity & Bio
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={member.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.fullName ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.fullName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Role / Title Tagline
                </label>
                <input
                  type="text"
                  value={member.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.title ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.title}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-700">
                  One-Paragraph Bio
                </label>
                <span className="text-[11px] font-mono text-stone-500">
                  {member.bio.length} / 600 characters
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={600}
                value={member.bio}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900 leading-relaxed font-normal"
              />
            </div>

            {/* Repeatable Structured Bio Highlights (max 3) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-700">
                  Bio Highlights (Up to 3 bullet items)
                </label>
                {member.bioHighlights.length < 3 && (
                  <button
                    type="button"
                    onClick={addHighlight}
                    className="inline-flex items-center gap-1 text-xs font-mono text-stone-600 hover:text-stone-950 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Highlight</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {member.bioHighlights.map((hl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-stone-400 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      maxLength={140}
                      value={hl}
                      onChange={(e) => handleHighlightChange(idx, e.target.value)}
                      placeholder="e.g. Lead author on OSDI '25 distributed training paper"
                      className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => removeHighlight(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA & Socials */}
          <section className="p-6 bg-white border border-stone-300 space-y-6">
            <h2 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-200 pb-2">
              CTA & Social Links (Optional)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Book A Call URL (Optional HTTPS)
                </label>
                <input
                  type="text"
                  placeholder="https://cal.com/username or cal.com/username"
                  value={member.bookCallUrl || ''}
                  onChange={(e) => handleFieldChange('bookCallUrl', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.bookCallUrl ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.bookCallUrl && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.bookCallUrl}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Public Email Address (mailto:)
                </label>
                <input
                  type="email"
                  placeholder="member@example.com"
                  value={member.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.email ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  GitHub Profile URL
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/username or github.com/username"
                  value={member.github || ''}
                  onChange={(e) => handleFieldChange('github', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.github ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.github && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.github}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Twitter / 𝕏 Profile URL
                </label>
                <input
                  type="text"
                  placeholder="https://x.com/username or x.com/username"
                  value={member.twitter || ''}
                  onChange={(e) => handleFieldChange('twitter', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.twitter ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.twitter && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.twitter}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/username or linkedin.com/in/username"
                  value={member.linkedin || ''}
                  onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.linkedin ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.linkedin && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.linkedin}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Discord Username / ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. username#1234"
                  value={member.discord || ''}
                  onChange={(e) => handleFieldChange('discord', e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                    fieldErrors.discord ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                  }`}
                />
                {fieldErrors.discord && (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.discord}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* GitHub Integration & Closing Quote */}
          <section className="p-6 bg-white border border-stone-300 space-y-6">
            <h2 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-200 pb-2">
              GitHub Heatmap & Closing Reflection
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  GitHub Username (for server-cached heatmap & merged PRs)
                </label>
                <div className="relative">
                  <GithubIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="e.g. torvalds"
                    value={member.githubUsername || ''}
                    onChange={(e) => handleFieldChange('githubUsername', e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border focus:bg-white focus:outline-hidden transition-colors ${
                      fieldErrors.githubUsername ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600' : 'border-stone-300 focus:border-stone-900'
                    }`}
                  />
                </div>
                {fieldErrors.githubUsername ? (
                  <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.githubUsername}</span>
                  </p>
                ) : (
                  <p className="text-[11px] font-mono text-stone-500 mt-1">
                    Fetched server-side, cached for 4 hours. Fails silently if unavailable.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Closing Quote Signature
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={member.quoteAuthor || ''}
                  onChange={(e) => handleFieldChange('quoteAuthor', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                Closing Quote Statement (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={240}
                placeholder="A succinct personal quote, engineering reflection, or motto."
                value={member.closingQuote || ''}
                onChange={(e) => handleFieldChange('closingQuote', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
              />
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: REPEATABLE EXPERIENCES EDITOR */}
      {activeTab === 'experiences' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="font-serif text-xl text-stone-950 font-normal">
                Structured Experience Entries
              </h2>
              <p className="text-xs font-mono text-stone-500">
                Sorted newest first. Rendered in clean institutional timeline layout.
              </p>
            </div>
            <button
              type="button"
              onClick={addExperienceRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Appointment</span>
            </button>
          </div>

          <div className="space-y-4">
            {member.experiences.map((exp, idx) => (
              <div key={exp.id} className="p-5 bg-white border border-stone-300 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                    Entry #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteExperienceRow(exp.id)}
                    className="text-xs font-mono text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                      Title / Role
                    </label>
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => updateExperienceField(exp.id, 'title', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                      Organization / Institution
                    </label>
                    <input
                      type="text"
                      value={exp.org}
                      onChange={(e) => updateExperienceField(exp.id, 'org', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) => updateExperienceField(exp.id, 'location', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sep 2024"
                        value={exp.startDate}
                        onChange={(e) => updateExperienceField(exp.id, 'startDate', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                        End Date (Empty = Present)
                      </label>
                      <input
                        type="text"
                        placeholder="Present"
                        value={exp.endDate || ''}
                        onChange={(e) => updateExperienceField(exp.id, 'endDate', e.target.value || null)}
                        className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                    Description & Highlights
                  </label>
                  <textarea
                    rows={2}
                    maxLength={600}
                    value={exp.description}
                    onChange={(e) => updateExperienceField(exp.id, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900 leading-relaxed font-normal"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REPEATABLE PROJECTS EDITOR */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="font-serif text-xl text-stone-950 font-normal">
                Repeatable Project Cards
              </h2>
              <p className="text-xs font-mono text-stone-500">
                Rendered as a responsive card grid with status dots (Live / Archived / In Progress).
              </p>
            </div>
            <button
              type="button"
              onClick={addProjectRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          <div className="space-y-6">
            {member.projects.map((proj, idx) => (
              <div key={proj.id} className="p-5 bg-white border border-stone-300 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                    Project #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteProjectRow(proj.id)}
                    className="text-xs font-mono text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => updateProjectField(proj.id, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                      Status (Fixed Enum)
                    </label>
                    <select
                      value={proj.status}
                      onChange={(e) => updateProjectField(proj.id, 'status', e.target.value as 'LIVE' | 'IN_PROGRESS' | 'ARCHIVED')}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900 font-mono"
                    >
                      <option value="LIVE">Live (Active / Production)</option>
                      <option value="IN_PROGRESS">In Progress (Active Development)</option>
                      <option value="ARCHIVED">Archived (Completed / Preserved)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                      Thumbnail Image URL (HTTPS)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={proj.thumbnailUrl || ''}
                      onChange={(e) => updateProjectField(proj.id, 'thumbnailUrl', e.target.value || null)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                      Project Link (External URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/singularity-lab/project"
                      value={proj.projectUrl || ''}
                      onChange={(e) => updateProjectField(proj.id, 'projectUrl', e.target.value || null)}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                    Technology Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rust, CUDA, Distributed Systems"
                    value={proj.techTags.join(', ')}
                    onChange={(e) =>
                      updateProjectField(
                        proj.id,
                        'techTags',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                    Project Description
                  </label>
                  <textarea
                    rows={2}
                    maxLength={600}
                    value={proj.description}
                    onChange={(e) => updateProjectField(proj.id, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900 leading-relaxed font-normal"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CURATED SKILLS SELECTOR */}
      {activeTab === 'skills' && (
        <div className="p-6 bg-white border border-stone-300 space-y-6">
          <div className="border-b border-stone-200 pb-3">
            <h2 className="font-serif text-xl text-stone-950 font-normal">
              Curated Skill Matrix
            </h2>
            <p className="text-xs font-mono text-stone-500 mt-1">
              Click chips to attach or detach competencies. Using a curated catalog ensures institutional consistency across all member profiles.
            </p>
          </div>

          <div className="space-y-6">
            {['CORE_LANGUAGES', 'FRAMEWORKS_LIBRARIES', 'SYSTEMS_INFRA', 'AI_ML', 'TOOLS_DEV'].map((cat) => {
              const catSkills = catalogSkills.filter((s) => s.category === cat);
              const catTitles: Record<string, string> = {
                CORE_LANGUAGES: 'Languages & Core Systems',
                FRAMEWORKS_LIBRARIES: 'Frameworks & Runtimes',
                SYSTEMS_INFRA: 'Distributed Systems & Infrastructure',
                AI_ML: 'Machine Learning & Theory',
                TOOLS_DEV: 'Tooling & Telemetry',
              };

              const catPlaceholders: Record<string, string> = {
                CORE_LANGUAGES: 'e.g. Zig, Mojo, Scala...',
                FRAMEWORKS_LIBRARIES: 'e.g. Svelte, Angular, Spring...',
                SYSTEMS_INFRA: 'e.g. Kafka, Nomad, Terraform...',
                AI_ML: 'e.g. LangChain, Whisper, JAX...',
                TOOLS_DEV: 'e.g. Neovim, Grafana, Ansible...',
              };

              return (
                <div key={cat} className="space-y-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-600 block">
                    {catTitles[cat] || cat}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {catSkills.map((skill) => {
                      const isSelected = activeSkillIds.has(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-stone-900 text-stone-100 border-stone-900'
                              : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                          <span>{skill.name}</span>
                        </button>
                      );
                    })}

                    {/* Inline "+ Other" custom skill creator */}
                    {addingOtherCat === cat ? (
                      <div className="inline-flex flex-col gap-1">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            placeholder={catPlaceholders[cat] || 'Custom skill...'}
                            value={otherSkillName}
                            onChange={(e) => {
                              setOtherSkillName(e.target.value);
                              if (otherError) setOtherError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOtherSkill(cat);
                              } else if (e.key === 'Escape') {
                                setAddingOtherCat(null);
                                setOtherSkillName('');
                                setOtherError(null);
                              }
                            }}
                            disabled={addingOtherLoading}
                            className="px-2.5 py-1 text-xs font-mono bg-white border border-stone-900 text-stone-900 placeholder:text-stone-400 focus:outline-hidden w-44 sm:w-56"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddOtherSkill(cat)}
                            disabled={addingOtherLoading || !otherSkillName.trim()}
                            className="px-2.5 py-1 text-xs font-mono bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                          >
                            {addingOtherLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <span>Add</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingOtherCat(null);
                              setOtherSkillName('');
                              setOtherError(null);
                            }}
                            disabled={addingOtherLoading}
                            className="p-1 text-xs font-mono text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {otherError && (
                          <div className="text-[11px] font-mono text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 inline shrink-0" />
                            <span>{otherError}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingOtherCat(cat);
                          setOtherSkillName('');
                          setOtherError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer border border-dashed border-stone-400 bg-stone-50/60 text-stone-600 hover:border-stone-900 hover:text-stone-900 hover:bg-white"
                        title={`Add other ${catTitles[cat] || 'skill'}`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Other</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
