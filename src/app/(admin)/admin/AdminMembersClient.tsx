'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  KeyRound,
  ShieldOff,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

interface AdminMemberRow {
  id: string;
  slug: string;
  username: string;
  fullName: string;
  title: string;
  email: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  tokenVersion: number;
  createdAt: string | Date;
}

export function AdminMembersClient({ initialMembers }: { initialMembers: AdminMemberRow[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New member form
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dialog for temporary password reveal
  const [revealedCreds, setRevealedCreds] = useState<{
    username: string;
    temporaryPassword: string;
    fullName: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Handle Copy
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Create Member
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fullName, title, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create member');
        setSubmitting(false);
        return;
      }

      setMembers([data.member, ...members]);
      setShowCreateModal(false);
      setUsername('');
      setFullName('');
      setTitle('');
      setEmail('');

      // Reveal temporary password for admin to issue
      setRevealedCreds({
        username: data.member.username,
        fullName: data.member.fullName,
        temporaryPassword: data.temporaryPassword,
      });
    } catch {
      setFormError('Network error while creating member');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Toggle Active / Deactivate
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_ACTIVE', isActive: !currentStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setMembers(members.map((m) => (m.id === id ? { ...m, isActive: !currentStatus, tokenVersion: m.tokenVersion + 1 } : m)));
        setStatusNotice(
          !currentStatus
            ? 'Member reactivated. Portfolio restored to public directory.'
            : 'Member deactivated. All active sessions immediately revoked, public URL now returns 404.'
        );
        setTimeout(() => setStatusNotice(null), 4000);
      }
    } catch {
      setStatusNotice('Failed to update member status.');
    }
  };

  // 3. Reset Password
  const handleResetPassword = async (id: string, memberName: string, memberUsername: string) => {
    if (!confirm(`Generate a new temporary password for ${memberName}? Any existing sessions will be immediately invalidated.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_PASSWORD' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMembers(members.map((m) => (m.id === id ? { ...m, mustChangePassword: true, tokenVersion: m.tokenVersion + 1 } : m)));
        setRevealedCreds({
          username: memberUsername,
          fullName: memberName,
          temporaryPassword: data.temporaryPassword,
        });
      }
    } catch {
      setStatusNotice('Failed to reset password.');
    }
  };

  // 4. Revoke All Sessions
  const handleRevokeSessions = async (id: string, memberName: string) => {
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REVOKE_SESSIONS' }),
      });
      if (res.ok) {
        setMembers(members.map((m) => (m.id === id ? { ...m, tokenVersion: m.tokenVersion + 1 } : m)));
        setStatusNotice(`All active sessions for ${memberName} revoked (tokenVersion incremented).`);
        setTimeout(() => setStatusNotice(null), 4000);
      }
    } catch {
      setStatusNotice('Failed to revoke sessions.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
            Member Management & Identity Control
          </h1>
          <p className="text-xs font-mono text-stone-500 mt-1">
            Manual provisioning, immediate session revocation, and status gating.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-mono uppercase tracking-widest font-medium transition-colors cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Provision New Member</span>
        </button>
      </div>

      {/* Global Status Notice */}
      {statusNotice && (
        <div className="p-3 bg-stone-900 text-stone-100 text-xs font-mono flex items-center justify-between">
          <span>{statusNotice}</span>
          <button type="button" onClick={() => setStatusNotice(null)} className="text-stone-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Temporary Password Modal / Reveal Dialog */}
      {revealedCreds && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 text-stone-900 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-700" />
              <h3 className="font-serif text-base font-semibold text-amber-900">
                Temporary Credentials Generated
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setRevealedCreds(null)}
              className="p-1 text-stone-500 hover:text-stone-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed font-normal">
            Issue these temporary credentials to <strong className="font-medium">{revealedCreds.fullName}</strong>. The user will be automatically forced to change this password upon their first login.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-amber-200 font-mono text-xs">
            <div>
              <span className="text-stone-500 block text-[10px] uppercase">Username:</span>
              <strong className="text-stone-900">{revealedCreds.username}</strong>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px] uppercase">Temporary Password:</span>
              <code className="text-amber-900 font-bold bg-amber-100/70 px-2 py-0.5 select-all">
                {revealedCreds.temporaryPassword}
              </code>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(revealedCreds.temporaryPassword)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Password'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Provision Member Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-300 max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="font-serif text-xl text-stone-950 font-normal">
                Provision Lab Member Account
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Username / ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jane.doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Role / Title Tagline
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack Developer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="member@singularitylab.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="p-3 bg-stone-100 text-[11px] font-mono text-stone-600 space-y-1">
                <p>• A cryptographically random temporary password will be generated.</p>
                <p>• Password change is forced on the member&apos;s first login.</p>
                <p>• Scoped strictly to editing their own record.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white border border-stone-300 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-stone-100/80 border-b border-stone-200 text-stone-600 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Member / Title</th>
              <th className="py-3 px-4">Slug & Username</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Security State</th>
              <th className="py-3 px-4 text-right">Administrative Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <p className="font-serif text-stone-900 text-lg">No Members Provisioned Yet</p>
                    <p className="font-mono text-xs text-stone-500">
                      The directory is currently empty. Click below to provision your first member account.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-mono uppercase tracking-widest font-medium transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Provision New Member</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-sans font-medium text-stone-900 text-sm">
                      {m.fullName}
                    </div>
                    <div className="text-stone-500 text-[11px] font-sans truncate max-w-xs">
                      {m.title}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-stone-600">
                    <div className="font-semibold text-stone-800">@{m.username}</div>
                    <div className="text-stone-400 text-[11px]">/members/{m.slug}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {m.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 text-stone-600 border border-stone-300 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                        <span>Deactivated (404)</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-stone-600">
                    <div className="text-[11px]">
                      {m.mustChangePassword ? (
                        <span className="text-amber-700 font-semibold">Must Change Password</span>
                      ) : (
                        <span className="text-stone-500">Passphrase Established</span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      tokenVersion: v{m.tokenVersion}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right space-x-2">
                    <Link
                      href={`/members/${m.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View public template page"
                      className="inline-flex items-center p-1 text-stone-500 hover:text-stone-900 border border-stone-200 hover:border-stone-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleResetPassword(m.id, m.fullName, m.username)}
                      title="Generate temporary password and force change"
                      className="inline-flex items-center p-1 text-stone-600 hover:text-stone-950 border border-stone-200 hover:border-stone-400 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRevokeSessions(m.id, m.fullName)}
                      title="Revoke active sessions (bumps tokenVersion)"
                      className="inline-flex items-center p-1 text-stone-600 hover:text-stone-950 border border-stone-200 hover:border-stone-400 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(m.id, m.isActive)}
                      title={m.isActive ? 'Deactivate member' : 'Reactivate member'}
                      className={`inline-flex items-center p-1 border transition-colors cursor-pointer ${
                        m.isActive
                          ? 'text-stone-500 hover:text-rose-700 border-stone-200 hover:border-rose-300'
                          : 'text-emerald-700 border-emerald-300 bg-emerald-50'
                      }`}
                    >
                      {m.isActive ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
