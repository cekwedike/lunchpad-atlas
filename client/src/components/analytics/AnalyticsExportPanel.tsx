import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileSpreadsheet,
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AnalyticsExportPanelProps {
  sessionId?: string;
  cohortId?: string;
  type: 'session' | 'cohort';
}

export function AnalyticsExportPanel({ sessionId, cohortId, type }: AnalyticsExportPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

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

      toast({
        title: 'Export successful',
        description: `${exportType} data has been downloaded`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to download analytics data',
        variant: 'destructive',
      });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-gray-700" />
          Export Analytics
        </CardTitle>
        <CardDescription>
          Download analytics data in CSV format for further analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exports.map((exportItem) => {
            const Icon = exportItem.icon;
            const colors = getColorClasses(exportItem.color);
            const isLoading = loading === exportItem.id;

            return (
              <div
                key={exportItem.id}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  colors.bg,
                  colors.border,
                  colors.hover,
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', colors.bg)}>
                    <Icon className={cn('h-5 w-5', colors.text)} />
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(exportItem.id, exportItem.endpoint)}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-3 w-3 mr-2" />
                          Download CSV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
