import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AttendanceCheckInProps {
  sessionId: string;
  sessionTitle: string;
  scheduledDate: Date;
  onCheckInSuccess?: () => void;
}

export function AttendanceCheckIn({
  sessionId,
  sessionTitle,
  scheduledDate,
  onCheckInSuccess,
}: AttendanceCheckInProps) {
  const [loading, setLoading] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already checked in
    fetchAttendanceRecord();
    
    // Request location permission
    requestLocation();
  }, [sessionId]);

  const fetchAttendanceRecord = async () => {
    try {
      const response = await fetch(`/api/attendance/session/${sessionId}/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecord(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance record:', error);
    }
  };

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Location access denied. Check-in will proceed without location.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setLocationError('Geolocation not supported by your browser.');
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance/check-in/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          latitude: location?.latitude,
          longitude: location?.longitude,
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecord(data);
        toast({
          title: 'Checked in successfully',
          description: data.isLate
            ? 'You have been marked as late arrival'
            : 'Your attendance has been recorded',
        });
        onCheckInSuccess?.();
      } else {
        const error = await response.json();
        toast({
          title: 'Check-in failed',
          description: error.message || 'Failed to check in',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Check-in failed',
        description: 'An error occurred while checking in',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance/check-out/${sessionId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecord(data);
        toast({
          title: 'Checked out successfully',
          description: 'Thank you for attending the session',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Check-out failed',
          description: error.message || 'Failed to check out',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Check-out failed',
        description: 'An error occurred while checking out',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (attendanceRecord && attendanceRecord.checkOutTime) {
    // Already checked out
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            Session Complete
          </CardTitle>
          <CardDescription className="text-green-700">
            Thank you for attending {sessionTitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Check-in:</span>
              <p className="font-medium text-gray-900">
                {new Date(attendanceRecord.checkInTime).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Check-out:</span>
              <p className="font-medium text-gray-900">
                {new Date(attendanceRecord.checkOutTime).toLocaleTimeString()}
              </p>
            </div>
            {attendanceRecord.duration && (
              <div>
                <span className="text-gray-600">Duration:</span>
                <p className="font-medium text-gray-900">
                  {formatDuration(attendanceRecord.duration)}
                </p>
              </div>
            )}
          </div>
          {attendanceRecord.isLate && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <Clock className="h-3 w-3 mr-1" />
              Late Arrival
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  if (attendanceRecord && !attendanceRecord.checkOutTime) {
    // Checked in, not checked out
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <CheckCircle2 className="h-5 w-5" />
            Checked In
          </CardTitle>
          <CardDescription className="text-blue-700">
            You are currently attending {sessionTitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Check-in time:</span>
              <p className="font-medium text-gray-900">
                {new Date(attendanceRecord.checkInTime).toLocaleTimeString()}
              </p>
            </div>
            {attendanceRecord.isLate && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Clock className="h-3 w-3 mr-1" />
                Late Arrival
              </Badge>
            )}
          </div>
          <Button onClick={handleCheckOut} disabled={loading} className="w-full">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Checking out...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Check Out
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not checked in yet
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-gray-700" />
          Session Attendance
        </CardTitle>
        <CardDescription>Check in to record your attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{sessionTitle}</p>
              <p className="text-xs text-gray-600">{formatDate(scheduledDate)}</p>
            </div>
          </div>

          {location && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
              <MapPin className="h-4 w-4" />
              Location detected
            </div>
          )}

          {locationError && (
            <div className="flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              {locationError}
            </div>
          )}
        </div>

        <Button onClick={handleCheckIn} disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Checking in...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Check In Now
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Make sure you're at the session location before checking in
        </p>
      </CardContent>
    </Card>
  );
}
