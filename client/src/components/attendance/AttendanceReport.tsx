import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  QrCode,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AttendanceReportProps {
  sessionId: string;
}

interface AttendeeRecord {
  userId: string;
  userName: string;
  email: string;
  checkInTime: Date;
  checkOutTime: Date | null;
  isLate: boolean;
  isExcused: boolean;
  duration: number | null;
}

interface AbsenteeRecord {
  userId: string;
  userName: string;
  email: string;
}

interface Report {
  sessionId: string;
  sessionTitle: string;
  scheduledDate: Date;
  totalFellows: number;
  attendedCount: number;
  attendanceRate: number;
  lateCount: number;
  excusedCount: number;
  attendees: AttendeeRecord[];
  absentees: AbsenteeRecord[];
}

export function AttendanceReport({ sessionId }: AttendanceReportProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [excusingUser, setExcusingUser] = useState<string | null>(null);
  const [excuseNotes, setExcuseNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance/session/${sessionId}/report`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await fetch(`/api/attendance/session/${sessionId}/qr-code`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setShowQR(true);
      }
    } catch (error) {
      toast({
        title: 'Failed to generate QR code',
        description: 'An error occurred while generating the QR code',
        variant: 'destructive',
      });
    }
  };

  const handleExcuseAbsence = async () => {
    if (!excusingUser) return;

    try {
      const response = await fetch(
        `/api/attendance/session/${sessionId}/user/${excusingUser}/excuse`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ notes: excuseNotes }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Absence excused',
          description: 'The absence has been marked as excused',
        });
        setExcusingUser(null);
        setExcuseNotes('');
        fetchReport();
      }
    } catch (error) {
      toast({
        title: 'Failed to excuse absence',
        description: 'An error occurred while updating attendance',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const headers = [
      'Name',
      'Email',
      'Status',
      'Check-in Time',
      'Check-out Time',
      'Duration (min)',
      'Late',
      'Excused',
    ];

    const rows = [
      ...report.attendees.map((a) => [
        a.userName,
        a.email,
        'Present',
        new Date(a.checkInTime).toLocaleString(),
        a.checkOutTime ? new Date(a.checkOutTime).toLocaleString() : 'N/A',
        a.duration?.toString() || 'N/A',
        a.isLate ? 'Yes' : 'No',
        a.isExcused ? 'Yes' : 'No',
      ]),
      ...report.absentees.map((a) => [
        a.userName,
        a.email,
        'Absent',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
      ]),
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${sessionId}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading attendance report...</p>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-500">No attendance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-700" />
                Attendance Report
              </CardTitle>
              <CardDescription>{report.sessionTitle}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchQRCode}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">Total Fellows</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{report.totalFellows}</p>
            </div>

            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-900">Attended</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{report.attendedCount}</p>
            </div>

            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-900">Attendance Rate</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{report.attendanceRate}%</p>
            </div>

            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-900">Late Arrivals</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{report.lateCount}</p>
            </div>
          </div>

          {/* Attendees Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Attendees</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Check-in</TableHead>
                    <TableHead className="text-center">Check-out</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.attendees.map((attendee) => (
                    <TableRow key={attendee.userId}>
                      <TableCell className="font-medium">{attendee.userName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{attendee.email}</TableCell>
                      <TableCell className="text-center text-sm">
                        {formatTime(attendee.checkInTime)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatTime(attendee.checkOutTime)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatDuration(attendee.duration)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {attendee.isLate && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Late
                            </Badge>
                          )}
                          {attendee.isExcused && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              Excused
                            </Badge>
                          )}
                          {!attendee.isLate && !attendee.isExcused && (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              On Time
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Absentees Table */}
          {report.absentees.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Absentees</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.absentees.map((absentee) => (
                      <TableRow key={absentee.userId}>
                        <TableCell className="font-medium">{absentee.userName}</TableCell>
                        <TableCell className="text-sm text-gray-600">{absentee.email}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExcusingUser(absentee.userId)}
                          >
                            Mark Excused
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Check-in QR Code</DialogTitle>
            <DialogDescription>Fellows can scan this QR code to check in</DialogDescription>
          </DialogHeader>
          {qrCode && (
            <div className="flex justify-center p-6">
              <img src={qrCode} alt="Check-in QR Code" className="w-64 h-64" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQR(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excuse Absence Dialog */}
      <Dialog open={!!excusingUser} onOpenChange={() => setExcusingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Absence as Excused</DialogTitle>
            <DialogDescription>Add notes explaining the excused absence</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter notes (optional)"
              value={excuseNotes}
              onChange={(e) => setExcuseNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcusingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleExcuseAbsence}>Mark Excused</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
