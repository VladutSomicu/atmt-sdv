import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useSortableData from '../../hooks/useSortableData';
import SortableHeader from '../shared/SortableHeader';

const actionLabels = {
  project_created: 'Project Created',
  project_updated: 'Project Updated',
  diagram_saved: 'Diagram Saved',
  analysis_run: 'Analysis Run',
  threat_updated: 'Threat Updated',
  member_invited: 'Member Invited'
};

const actionColors = {
  project_created: 'text-green-400 bg-green-400/10 border-green-400/20',
  project_updated: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  diagram_saved: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  analysis_run: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  threat_updated: 'text-red-400 bg-red-400/10 border-red-400/20',
  member_invited: 'text-teal-400 bg-teal-400/10 border-teal-400/20'
};

export default function ProjectAuditLogTab({ projectId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const { items: sortedLogs, requestSort, sortConfig } = useSortableData(logs, { key: 'created_at', direction: 'descending' });

  useEffect(() => {
    // Load audit logs
    api.get(`/api/projects/${projectId}/audit`)
      .then(res => setLogs(res.data.audit_log || []))
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 h-full">Loading audit log...</div>;
  }

  return (
    <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 48px)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">Audit Log</h1>
          <p className="text-gray-500 text-sm">Review all actions and changes made in this project</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No actions recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <SortableHeader label="Timestamp" sortKey="created_at" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-48" />
                    <SortableHeader label="User" sortKey="user" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-40" />
                    <SortableHeader label="Action" sortKey="action" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-40" />
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-800/30 transition-colors align-top">
                      <td className="px-5 py-4">
                        <span className="text-gray-400 text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {log.user?.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-gray-300 text-sm font-medium">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded border font-medium whitespace-nowrap ${actionColors[log.action] || 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {log.justification && (
                          <div className="mb-2">
                            <span className="text-gray-500 text-xs uppercase tracking-wider block mb-0.5">Justification</span>
                            <span className="text-gray-300 italic">"{log.justification}"</span>
                          </div>
                        )}
                        {log.new_value && (
                          <div>
                            <span className="text-gray-500 text-xs uppercase tracking-wider block mb-0.5">Payload Data</span>
                            <pre className="text-gray-400 text-xs bg-gray-950 p-2 rounded border border-gray-800 overflow-x-auto">
                              {JSON.stringify(log.new_value, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
