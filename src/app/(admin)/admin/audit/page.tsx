import { redirect } from 'next/navigation';
import { getAuthenticatedAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { ShieldAlert, Terminal } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const auth = await getAuthenticatedAdmin();

  if (!auth) {
    redirect('/auth/login');
  }

  const logs = await db.getAuditLogs(100);

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2 text-rose-700">
          <ShieldAlert className="w-5 h-5" />
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
            Security & System Audit Logs
          </h1>
        </div>
        <p className="text-xs font-mono text-stone-500 mt-1">
          Chronological record of authentication attempts, administrative provisioning, password resets, and session revocations.
        </p>
      </div>

      <div className="bg-white border border-stone-300 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-stone-100/80 border-b border-stone-200 text-stone-600 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Entity</th>
              <th className="py-3 px-4">Origin IP</th>
              <th className="py-3 px-4">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {logs.length > 0 ? (
              logs.map((log) => {
                const isFailure = log.action.includes('FAILURE') || log.action.includes('DEACTIVATED');
                return (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                      {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-800">
                        {log.actorType}
                      </span>
                      <span className="text-stone-400 block text-[10px] truncate max-w-[120px]">
                        {log.actorId}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-semibold border ${
                          isFailure
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-stone-100 text-stone-800 border-stone-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-stone-600">
                      <div>{log.targetType}</div>
                      {log.targetId && (
                        <div className="text-[10px] text-stone-400 truncate max-w-[120px]">
                          {log.targetId}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                      {log.ipAddress || 'internal'}
                    </td>

                    <td className="py-3 px-4 text-stone-500 font-mono text-[11px] max-w-xs truncate">
                      {log.metadata || '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500 font-mono text-xs">
                  No security events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
