"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohorts, useSessions } from "@/hooks/api/useAdmin";
import {
  useSessionQrCode,
  useSessionAttendanceReport,
  useCohortAttendanceStats,
  useCheckIn,
  useCheckOut,
  useMyAttendance,
} from "@/hooks/api/useAttendance";
import { RefreshCw, QrCode, CheckCircle, LogOut, Users } from "lucide-react";

export default function AttendancePage() {
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === "ADMIN";
  const isFacilitator = profile?.role === "FACILITATOR";

  const { data: cohortsData } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  useEffect(() => {
    if (!selectedCohortId && profile?.cohortId) {
      setSelectedCohortId(profile.cohortId);
    }
  }, [selectedCohortId, profile?.cohortId]);

  useEffect(() => {
    setSelectedSessionId("");
  }, [selectedCohortId]);

  const { data: sessionsData } = useSessions(selectedCohortId);
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  const qrQuery = useSessionQrCode(selectedSessionId || undefined);
  const reportQuery = useSessionAttendanceReport(selectedSessionId || undefined);
  const statsQuery = useCohortAttendanceStats(selectedCohortId || undefined);
  const myAttendanceQuery = useMyAttendance(selectedSessionId || undefined);

  const checkInMutation = useCheckIn(selectedSessionId || undefined);
  const checkOutMutation = useCheckOut(selectedSessionId || undefined);

  const handleCheckIn = async () => {
    if (!selectedSessionId) return;
    await checkInMutation.mutateAsync(undefined);
  };

  const handleCheckOut = async () => {
    if (!selectedSessionId) return;
    await checkOutMutation.mutateAsync();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
            <p className="text-gray-600 mt-1">
              Manage attendance and session check-ins
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">Cohort</div>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                disabled={(isFacilitator && !!profile?.cohortId) || !isAdmin}
              >
                <option value="">Select a cohort</option>
                {cohorts.map((cohort: any) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">Session</div>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={!selectedCohortId}
              >
                <option value="">Select a session</option>
                {sessions.map((session: any) => (
                  <option key={session.id} value={session.id}>
                    Session {session.sessionNumber}: {session.title}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>

        {(isAdmin || isFacilitator) && selectedSessionId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Session QR</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center gap-4">
                {qrQuery.data?.qrCode ? (
                  <img
                    src={qrQuery.data.qrCode}
                    alt="Session QR code"
                    className="w-56 h-56 border rounded"
                  />
                ) : (
                  <div className="w-56 h-56 border rounded bg-gray-50 flex items-center justify-center text-gray-500">
                    <QrCode className="h-10 w-10" />
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => qrQuery.refetch()}
                  disabled={qrQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${qrQuery.isFetching ? 'animate-spin' : ''}`} />
                  Refresh QR
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm lg:col-span-2">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Session Report</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {!reportQuery.data ? (
                  <div className="text-gray-600">No report data yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded border bg-gray-50">
                      <div className="text-sm text-gray-600">Attended</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {reportQuery.data.attendedCount}/{reportQuery.data.totalFellows}
                      </div>
                    </div>
                    <div className="p-3 rounded border bg-gray-50">
                      <div className="text-sm text-gray-600">Late</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {reportQuery.data.lateCount}
                      </div>
                    </div>
                    <div className="p-3 rounded border bg-gray-50">
                      <div className="text-sm text-gray-600">Excused</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {reportQuery.data.excusedCount}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedCohortId && statsQuery.data && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Cohort Attendance Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded border bg-gray-50">
                <div className="text-sm text-gray-600">Avg Attendance Rate</div>
                <div className="text-xl font-semibold text-gray-900">
                  {statsQuery.data.averageAttendanceRate}%
                </div>
              </div>
              <div className="p-3 rounded border bg-gray-50">
                <div className="text-sm text-gray-600">Late Rate</div>
                <div className="text-xl font-semibold text-gray-900">
                  {statsQuery.data.lateRate}%
                </div>
              </div>
              <div className="p-3 rounded border bg-gray-50">
                <div className="text-sm text-gray-600">Total Sessions</div>
                <div className="text-xl font-semibold text-gray-900">
                  {statsQuery.data.totalSessions}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">My Check-In</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {!selectedSessionId ? (
              <div className="text-gray-600">Select a session to check in.</div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">Session</Badge>
                  <div className="text-gray-900">
                    {sessions.find((s: any) => s.id === selectedSessionId)?.title || 'Selected session'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkInMutation.isPending || !!myAttendanceQuery.data}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCheckOut}
                    disabled={checkOutMutation.isPending || !myAttendanceQuery.data || !!myAttendanceQuery.data?.checkOutTime}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Check Out
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
