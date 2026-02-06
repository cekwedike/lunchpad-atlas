import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, TrendingDown, Eye, PlayCircle, FastForward, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkimmingAlert {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  resource: {
    id: string;
    title: string;
    type: string;
  };
  engagementQuality: number;
  playbackSpeed: number;
  pauseCount: number;
  seekCount: number;
  attentionSpanScore: number;
  timeSpentMinutes: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface EngagementAlertsTableProps {
  cohortId?: string;
}

export function EngagementAlertsTable({ cohortId }: EngagementAlertsTableProps) {
  const [alerts, setAlerts] = useState<SkimmingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState('0.5');

  useEffect(() => {
    fetchAlerts();
  }, [cohortId, threshold]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      params.append('threshold', threshold);

      const response = await fetch(
        `/api/resources/engagement/alerts?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch engagement alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    const styles = {
      HIGH: 'bg-red-100 text-red-800 border-red-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    const icons = {
      HIGH: <AlertTriangle className="h-3 w-3" />,
      MEDIUM: <TrendingDown className="h-3 w-3" />,
      LOW: <Eye className="h-3 w-3" />,
    };

    return (
      <Badge variant="outline" className={cn('flex items-center gap-1', styles[severity])}>
        {icons[severity]}
        {severity}
      </Badge>
    );
  };

  const getQualityColor = (quality: number) => {
    if (quality < 0.3) return 'text-red-600 font-bold';
    if (quality < 0.5) return 'text-yellow-600 font-semibold';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading engagement alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Skimming Detection Alerts
            </CardTitle>
            <CardDescription>
              Users with low engagement quality or suspicious viewing patterns
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Threshold:</span>
            <Select value={threshold} onValueChange={setThreshold}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.3">30% (High)</SelectItem>
                <SelectItem value="0.5">50% (Medium)</SelectItem>
                <SelectItem value="0.7">70% (Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">
              No engagement alerts at this threshold
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting the threshold to see more results
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="text-center">Quality</TableHead>
                  <TableHead className="text-center">Speed</TableHead>
                  <TableHead className="text-center">Pauses</TableHead>
                  <TableHead className="text-center">Seeks</TableHead>
                  <TableHead className="text-center">Time</TableHead>
                  <TableHead className="text-center">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {alert.user.firstName} {alert.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{alert.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{alert.resource.title}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {alert.resource.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn('text-sm', getQualityColor(alert.engagementQuality))}>
                        {Math.round(alert.engagementQuality * 100)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {alert.playbackSpeed > 1.5 && <FastForward className="h-3 w-3 text-red-500" />}
                        <span
                          className={cn(
                            'text-sm',
                            alert.playbackSpeed > 1.5 ? 'text-red-600 font-semibold' : 'text-gray-600'
                          )}
                        >
                          {alert.playbackSpeed.toFixed(1)}x
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {alert.pauseCount > 5 && <Pause className="h-3 w-3 text-yellow-500" />}
                        <span className="text-sm text-gray-600">{alert.pauseCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-gray-600">{alert.seekCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-gray-600">
                        {Math.round(alert.timeSpentMinutes)}m
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getSeverityBadge(alert.severity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>High severity: Quality &lt; 30%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Medium: Quality &lt; 50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Low: Quality &lt; 70%</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAlerts}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
