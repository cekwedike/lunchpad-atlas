"use client";

import { useState } from "react";
import { Calendar, FileText, RefreshCw, Edit, Save, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohorts, useSessions, useUpdateSession, useAuditLogs } from "@/hooks/api/useAdmin";
import { format } from "date-fns";

export default function SessionManagementPage() {
  const { data: profile } = useProfile();
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useSessions(selectedCohortId);
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs(1, 20);
  const updateSessionMutation = useUpdateSession();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  const handleEditClick = (session: any) => {
    setEditingSessionId(session.id);
    setEditFormData({
      title: session.title,
      scheduledDate: session.scheduledDate ? format(new Date(session.scheduledDate), "yyyy-MM-dd") : "",
      unlockDate: session.unlockDate ? format(new Date(session.unlockDate), "yyyy-MM-dd") : "",
    });
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditFormData({});
  };

  const handleSaveSession = async (sessionId: string) => {
    try {
      await updateSessionMutation.mutateAsync({
        sessionId,
        data: {
          title: editFormData.title,
          scheduledDate: editFormData.scheduledDate ? new Date(editFormData.scheduledDate).toISOString() : undefined,
          unlockDate: editFormData.unlockDate ? new Date(editFormData.unlockDate).toISOString() : undefined,
        },
      });
      setEditingSessionId(null);
      setEditFormData({});
      refetchSessions();
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  const selectedCohort = cohorts.find((c: any) => c.id === selectedCohortId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Session Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage cohort session dates and unlock schedules
            </p>
          </div>
          <Button
            onClick={() => refetchSessions()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Cohort Selector */}
        <Card className="p-6">
          <label htmlFor="cohort-select" className="text-base font-semibold mb-3 block">
            Select Cohort
          </label>
          <select
            id="cohort-select"
            className="w-full p-3 border rounded-lg bg-white"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            disabled={cohortsLoading}
          >
            <option value="">-- Select a cohort --</option>
            {cohorts?.map((cohort: any) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} ({format(new Date(cohort.startDate), "MMM yyyy")})
              </option>
            ))}
          </select>
          {selectedCohort && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Start:</span> {format(new Date(selectedCohort.startDate), "MMM dd, yyyy")}
                {" | "}
                <span className="font-semibold">End:</span> {format(new Date(selectedCohort.endDate), "MMM dd, yyyy")}
              </p>
            </div>
          )}
        </Card>

        {/* Sessions Table */}
        {selectedCohortId && (
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Sessions & Unlock Dates
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Resources unlock <strong>5 days</strong> before each session date
              </p>
            </div>
            <div className="overflow-x-auto">
              {sessionsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading sessions...</div>
              ) : sessions && sessions.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Scheduled Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unlock Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sessions.map((session: any) => {
                      const isEditing = editingSessionId === session.id;
                      const now = new Date();
                      const unlockDate = session.unlockDate ? new Date(session.unlockDate) : null;
                      const isUnlocked = unlockDate && unlockDate <= now;

                      return (
                        <tr key={session.id} className={isEditing ? "bg-blue-50" : "hover:bg-gray-50"}>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-atlas-navy">
                              Session {session.sessionNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input
                                value={editFormData.title}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, title: e.target.value })
                                }
                                className="max-w-xs"
                              />
                            ) : (
                              <span className="font-medium">{session.title}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editFormData.scheduledDate}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, scheduledDate: e.target.value })
                                }
                                className="max-w-xs"
                              />
                            ) : (
                              <span>
                                {session.scheduledDate
                                  ? format(new Date(session.scheduledDate), "MMM dd, yyyy")
                                  : "Not set"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editFormData.unlockDate}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, unlockDate: e.target.value })
                                }
                                className="max-w-xs"
                              />
                            ) : (
                              <span>
                                {session.unlockDate
                                  ? format(new Date(session.unlockDate), "MMM dd, yyyy")
                                  : "Not set"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={
                                isUnlocked
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }
                            >
                              {isUnlocked ? "Unlocked" : "Locked"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSession(session.id)}
                                  disabled={updateSessionMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(session)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No sessions found for this cohort
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Audit Logs */}
        <Card>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Audit Logs
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recent administrative actions
            </p>
          </div>
          <div className="overflow-x-auto">
            {auditLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
            ) : auditLogs && auditLogs.data.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Entity Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Changes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.data.slice(0, 10).map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">{log.entityType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">View changes</summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-w-md">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No audit logs found</div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
