import { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  BarChart3,
  Users,
  TrendingUp,
} from 'lucide-react';

const cx = (...classes: Array<string | null | undefined | false>) =>
  classes.filter(Boolean).join(' ');

interface AnalyticsExportPanelProps {
  sessionId?: string;
  cohortId?: string;
  type: 'session' | 'cohort';
}

export function AnalyticsExportPanel({ sessionId, cohortId, type }: AnalyticsExportPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const notify = (title: string, description: string) => {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n${description}`);
    }
  };

  const handleExport = async (exportType: string, endpoint: string) => {
    setLoading(exportType);
    try {
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify('Export successful', `${exportType} data has been downloaded`);
    } catch (error) {
      notify('Export failed', 'Failed to download analytics data');
    } finally {
      setLoading(null);
    }
  };

  const sessionExports = [
    {
      id: 'session-analytics',
      title: 'Session Analytics',
      description: 'Attendance, engagement scores, participation rates',
      icon: BarChart3,
      color: 'blue',
      endpoint: `/session-analytics/export/session/${sessionId}/csv`,
    },
    {
      id: 'resource-progress',
      title: 'Resource Progress',
      description: 'Individual user progress with engagement metrics',
      icon: TrendingUp,
      color: 'purple',
      endpoint: `/session-analytics/export/resource-progress/${sessionId}/csv`,
    },
  ];

  const cohortExports = [
    {
      id: 'cohort-analytics',
      title: 'Cohort Analytics',
      description: 'All sessions with attendance and engagement data',
      icon: Users,
      color: 'green',
      endpoint: `/session-analytics/export/cohort/${cohortId}/csv`,
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard Export',
      description: 'User rankings by points and activity',
      icon: TrendingUp,
      color: 'yellow',
      endpoint: `/session-analytics/export/leaderboard/${cohortId}/csv`,
    },
    {
      id: 'summary',
      title: 'Analytics Summary',
      description: 'Comprehensive cohort statistics (JSON)',
      icon: FileSpreadsheet,
      color: 'indigo',
      endpoint: `/session-analytics/summary/${cohortId}`,
      isJson: true,
    },
  ];

  const exports = type === 'session' ? sessionExports : cohortExports;

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-100',
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        hover: 'hover:bg-purple-100',
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200',
        hover: 'hover:bg-green-100',
      },
      yellow: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-600',
        border: 'border-yellow-200',
        hover: 'hover:bg-yellow-100',
      },
      indigo: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        border: 'border-indigo-200',
        hover: 'hover:bg-indigo-100',
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Download className="h-5 w-5 text-gray-700" />
          Export Analytics
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Download analytics data in CSV format for further analysis
        </p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {exports.map((exportItem) => {
            const Icon = exportItem.icon;
            const colors = getColorClasses(exportItem.color);
            const isLoading = loading === exportItem.id;

            return (
              <div
                key={exportItem.id}
                className={cx(
                  'p-4 rounded-lg border transition-all',
                  colors.bg,
                  colors.border,
                  colors.hover,
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cx('p-2 rounded-lg', colors.bg)}>
                    <Icon className={cx('h-5 w-5', colors.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm text-gray-900">
                        {exportItem.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      {exportItem.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleExport(exportItem.id, exportItem.endpoint)}
                      disabled={isLoading}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <span className="inline-flex items-center">
                          <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2" />
                          Exporting...
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          <FileSpreadsheet className="h-3 w-3 mr-2" />
                          Download CSV
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
