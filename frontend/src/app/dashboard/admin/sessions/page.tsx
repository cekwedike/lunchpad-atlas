"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  RefreshCw,
  Edit,
  Save,
  X,
  Users,
  CheckSquare,
  Bot,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProfile } from "@/hooks/api/useProfile";
import {
  useCohorts,
  useSessions,
  useUpdateSession,
  useCreateSession,
  useSessionAttendance,
  useMarkBulkAttendance,
  useAiReview,
  useAiChat,
} from "@/hooks/api/useAdmin";
import { format } from "date-fns";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  fellowId: string;
  isPresent: boolean;
  isLate: boolean;
  isExcused: boolean;
  notes: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Create Session Dialog ───────────────────────────────────────────────────
function CreateSessionDialog({
  cohortId,
  existingCount,
  open,
  onOpenChange,
}: {
  cohortId: string;
  existingCount: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createSession = useCreateSession();
  const [form, setForm] = useState({
    title: "",
    description: "",
    monthTheme: "",
    scheduledDate: "",
    unlockDate: "",
    sessionNumber: existingCount + 1,
  });

  const handleSubmit = async () => {
    if (!form.title || !form.scheduledDate) {
      toast.error("Title and scheduled date are required");
      return;
    }
    await createSession.mutateAsync({
      cohortId,
      sessionNumber: form.sessionNumber,
      title: form.title,
      description: form.description || undefined,
      monthTheme: form.monthTheme || undefined,
      scheduledDate: new Date(form.scheduledDate).toISOString(),
      unlockDate: form.unlockDate ? new Date(form.unlockDate).toISOString() : undefined,
    });
    onOpenChange(false);
    setForm({ title: "", description: "", monthTheme: "", scheduledDate: "", unlockDate: "", sessionNumber: existingCount + 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Session #</label>
              <Input
                type="number"
                min={1}
                value={form.sessionNumber}
                onChange={(e) => setForm({ ...form, sessionNumber: +e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Month Theme</label>
              <Input
                placeholder="e.g. Career Foundations"
                value={form.monthTheme}
                onChange={(e) => setForm({ ...form, monthTheme: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
            <Input
              placeholder="e.g. Week 1: Introduction"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <Input
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Scheduled Date *</label>
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Unlock Date</label>
              <Input
                type="date"
                value={form.unlockDate}
                onChange={(e) => setForm({ ...form, unlockDate: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Defaults to 5 days before session</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createSession.isPending}>
            {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────
function AttendanceModal({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: attendanceData, isLoading } = useSessionAttendance(open ? sessionId : undefined);
  const markAttendance = useMarkBulkAttendance();
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialize records from API data
  if (attendanceData && !initialized && attendanceData.fellows) {
    const init: Record<string, AttendanceRecord> = {};
    attendanceData.fellows.forEach((f: any) => {
      init[f.id] = {
        fellowId: f.id,
        isPresent: f.isPresent,
        isLate: f.isLate,
        isExcused: f.isExcused,
        notes: f.notes ?? "",
      };
    });
    setRecords(init);
    setInitialized(true);
  }

  const handleToggle = (fellowId: string, field: keyof AttendanceRecord, value: boolean | string) => {
    setRecords((prev) => ({ ...prev, [fellowId]: { ...prev[fellowId], [field]: value } }));
  };

  const handleSave = async () => {
    const attendances = Object.values(records);
    await markAttendance.mutateAsync({ sessionId, attendances });
    onOpenChange(false);
    setInitialized(false);
  };

  const fellows = attendanceData?.fellows ?? [];
  const presentCount = Object.values(records).filter((r) => r.isPresent).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setInitialized(false); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            Mark Attendance – {attendanceData?.session?.title}
          </DialogTitle>
          {!isLoading && fellows.length > 0 && (
            <p className="text-sm text-gray-500">
              {presentCount} / {fellows.length} present
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : fellows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No fellows in this cohort</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {fellows.map((fellow: any) => {
                const rec = records[fellow.id] ?? {
                  fellowId: fellow.id, isPresent: false, isLate: false, isExcused: false, notes: "",
                };
                return (
                  <div
                    key={fellow.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      rec.isPresent
                        ? "bg-green-50 border-green-200"
                        : rec.isExcused
                        ? "bg-amber-50 border-amber-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-blue-700">
                        {fellow.firstName?.[0]}{fellow.lastName?.[0]}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {fellow.firstName} {fellow.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{fellow.email}</p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Present toggle */}
                      <button
                        onClick={() => handleToggle(fellow.id, "isPresent", !rec.isPresent)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          rec.isPresent
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {rec.isPresent ? "Present" : "Absent"}
                      </button>

                      {/* Late toggle (only when present) */}
                      {rec.isPresent && (
                        <button
                          onClick={() => handleToggle(fellow.id, "isLate", !rec.isLate)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            rec.isLate
                              ? "bg-amber-500 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          Late
                        </button>
                      )}

                      {/* Excused toggle */}
                      {!rec.isPresent && (
                        <button
                          onClick={() => handleToggle(fellow.id, "isExcused", !rec.isExcused)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            rec.isExcused
                              ? "bg-amber-500 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          Excused
                        </button>
                      )}

                      {/* Notes */}
                      <input
                        type="text"
                        placeholder="Notes"
                        value={rec.notes}
                        onChange={(e) => handleToggle(fellow.id, "notes", e.target.value)}
                        className="w-28 text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => { setInitialized(false); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={markAttendance.isPending || fellows.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {markAttendance.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── AI Review Panel ──────────────────────────────────────────────────────────
function AiReviewPanel({ sessionId }: { sessionId: string }) {
  const [transcript, setTranscript] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const submitReview = useAiReview();
  const chat = useAiChat();

  const handleSubmitTranscript = async () => {
    if (!transcript.trim()) { toast.error("Please paste a transcript first"); return; }
    const result = await submitReview.mutateAsync({ sessionId, transcript });
    setAnalysisResult(result);
    setChatMessages([{
      role: "assistant",
      content: `I've analyzed the session transcript. Here's a summary:\n\n**Engagement Score:** ${result.engagementScore ?? "N/A"}/100\n**Participation Rate:** ${result.participationRate ?? "N/A"}%\n\nKey topics: ${(result.keyTopics as string[] | null)?.join(", ") ?? "N/A"}\n\nFeel free to ask me questions about the session!`,
    }]);
    setIsExpanded(true);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage;
    setInputMessage("");
    const currentHistory = chatMessages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: m.content,
    }));
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    const result = await chat.mutateAsync({
      sessionId,
      message: userMsg,
      transcript: transcript || undefined,
      history: currentHistory,
    });
    setChatMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <span className="font-semibold text-gray-900">AI Session Review</span>
          {analysisResult && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
              Analyzed
            </Badge>
          )}
        </div>
        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          {/* Transcript input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              <FileText className="h-4 w-4" /> Paste Meeting Transcript
            </label>
            <textarea
              rows={6}
              className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Paste your meeting transcript or notes here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleSubmitTranscript}
              disabled={submitReview.isPending || !transcript.trim()}
              className="mt-2 bg-purple-600 hover:bg-purple-700"
            >
              {submitReview.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
              Analyze with AI
            </Button>
          </div>

          {/* Analysis summary */}
          {analysisResult && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Engagement", value: analysisResult.engagementScore },
                  { label: "Participation", value: analysisResult.participationRate },
                  { label: "Attention", value: analysisResult.averageAttention },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded p-2 border border-purple-100">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-lg font-bold text-purple-700">{value != null ? `${Math.round(value)}%` : "–"}</p>
                  </div>
                ))}
              </div>
              {Array.isArray(analysisResult.keyTopics) && analysisResult.keyTopics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {analysisResult.keyTopics.map((t: string) => (
                    <Badge key={t} className="bg-white text-purple-700 border border-purple-200 text-xs">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat interface */}
          {chatMessages.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <ScrollArea className="h-56 p-3 bg-gray-50">
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-purple-600 text-white"
                            : "bg-white border border-gray-200 text-gray-800"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chat.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-lg px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t bg-white flex gap-2">
                <input
                  type="text"
                  className="flex-1 text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Ask about participation, suggest points..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                />
                <Button size="sm" onClick={handleSendMessage} disabled={!inputMessage.trim() || chat.isPending} className="bg-purple-600 hover:bg-purple-700">
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* Start chat prompt (no messages yet, but analysis done) */}
          {analysisResult && chatMessages.length === 0 && (
            <div className="text-center py-2 text-sm text-gray-500">
              Analysis complete! Ask questions about the session above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────
function SessionRow({ session, onAttendance }: { session: any; onAttendance: (id: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const updateSession = useUpdateSession();

  const now = new Date();
  const unlockDate = session.unlockDate ? new Date(session.unlockDate) : null;
  const scheduledDate = session.scheduledDate ? new Date(session.scheduledDate) : null;
  const isUnlocked = unlockDate && unlockDate <= now;
  const isPast = scheduledDate && scheduledDate < now;

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      title: session.title,
      scheduledDate: session.scheduledDate ? format(new Date(session.scheduledDate), "yyyy-MM-dd") : "",
      unlockDate: session.unlockDate ? format(new Date(session.unlockDate), "yyyy-MM-dd") : "",
    });
  };

  const handleSave = async () => {
    await updateSession.mutateAsync({
      sessionId: session.id,
      data: {
        title: editData.title,
        scheduledDate: editData.scheduledDate ? new Date(editData.scheduledDate).toISOString() : undefined,
        unlockDate: editData.unlockDate ? new Date(editData.unlockDate).toISOString() : undefined,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${isExpanded ? "shadow-md" : "shadow-sm"}`}>
      {/* Session header row */}
      <div
        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
          isEditing ? "bg-blue-50" : "bg-white"
        }`}
        onClick={() => !isEditing && setIsExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-blue-700">S{session.sessionNumber}</span>
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="max-w-sm text-sm"
            />
          ) : (
            <p className="font-semibold text-gray-900 truncate">{session.title}</p>
          )}
          {session.monthTheme && !isEditing && (
            <p className="text-xs text-gray-500">{session.monthTheme}</p>
          )}
        </div>

        {/* Dates */}
        <div className="hidden md:flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="text-xs text-gray-400">Scheduled</p>
            {isEditing ? (
              <Input
                type="date"
                value={editData.scheduledDate}
                onChange={(e) => setEditData({ ...editData, scheduledDate: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="text-xs w-36"
              />
            ) : (
              <p className="text-sm font-medium text-gray-700">
                {scheduledDate ? format(scheduledDate, "MMM d, yyyy") : "—"}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Unlock</p>
            {isEditing ? (
              <Input
                type="date"
                value={editData.unlockDate}
                onChange={(e) => setEditData({ ...editData, unlockDate: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="text-xs w-36"
              />
            ) : (
              <p className="text-sm font-medium text-gray-700">
                {unlockDate ? format(unlockDate, "MMM d, yyyy") : "—"}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="shrink-0">
          <Badge
            className={
              isPast && isUnlocked
                ? "bg-green-100 text-green-800 border-green-200"
                : isUnlocked
                ? "bg-blue-100 text-blue-800 border-blue-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }
          >
            {isPast ? "Completed" : isUnlocked ? "Unlocked" : "Upcoming"}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={updateSession.isPending} className="bg-green-600 hover:bg-green-700 h-8">
                {updateSession.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-8">
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleEdit} className="h-8 px-2">
                <Edit className="w-3 h-3 mr-1" />
                <span className="text-xs">Edit</span>
              </Button>
              <Button
                size="sm"
                onClick={() => onAttendance(session.id)}
                className="h-8 px-2 bg-blue-600 hover:bg-blue-700"
              >
                <Users className="w-3 h-3 mr-1" />
                <span className="text-xs">Attendance</span>
              </Button>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </>
          )}
        </div>
      </div>

      {/* Expandable: AI Review */}
      {isExpanded && !isEditing && (
        <div className="border-t bg-gray-50 p-4">
          <AiReviewPanel sessionId={session.id} />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SessionManagementPage() {
  const { data: profile } = useProfile();
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const { data: sessionsData, isLoading: sessionsLoading, refetch } = useSessions(selectedCohortId);
  const sessions = (Array.isArray(sessionsData) ? sessionsData : []).sort(
    (a: any, b: any) => a.sessionNumber - b.sessionNumber,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);

  const isAdmin = profile?.role === "ADMIN";
  const isFacilitator = profile?.role === "FACILITATOR";

  // For facilitators, auto-select their cohort
  useEffect(() => {
    if (isFacilitator && !selectedCohortId && profile?.cohortId) {
      setSelectedCohortId(profile.cohortId);
    }
  }, [isFacilitator, selectedCohortId, profile?.cohortId]);

  const selectedCohort = cohorts.find((c: any) => c.id === selectedCohortId);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Session Management</h1>
            <p className="text-gray-500 mt-1">
              {isFacilitator ? "Manage sessions, attendance, and AI reviews for your cohort" : "Manage all cohort sessions, attendance, and AI reviews"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            {selectedCohortId && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Add Session
              </Button>
            )}
          </div>
        </div>

        {/* Cohort Selector (admin only — facilitators see their cohort automatically) */}
        {isAdmin && (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Cohort</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-lg bg-white text-sm"
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                disabled={cohortsLoading}
              >
                <option value="">— Select a cohort —</option>
                {cohorts.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({format(new Date(c.startDate), "MMM yyyy")})
                  </option>
                ))}
              </select>
              {selectedCohort && (
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedCohort.startDate), "MMM d, yyyy")} – {format(new Date(selectedCohort.endDate), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedCohort._count?.fellows ?? 0} fellows
                  </span>
                  <Badge className={
                    selectedCohort.state === "ACTIVE" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-600"
                  }>
                    {selectedCohort.state}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Facilitator cohort info */}
        {isFacilitator && selectedCohort && (
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 text-sm text-blue-900">
              <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold">{selectedCohort.name}</p>
                <p className="text-blue-700">
                  {format(new Date(selectedCohort.startDate), "MMM d, yyyy")} – {format(new Date(selectedCohort.endDate), "MMM d, yyyy")}
                  {" · "}{selectedCohort._count?.fellows ?? 0} fellows
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions list */}
        {selectedCohortId ? (
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>Sessions ({sessions.length})</span>
                </div>
                <p className="text-sm font-normal text-gray-500">
                  Click a session to expand AI review · use the Attendance button to mark fellows
                </p>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No sessions yet</p>
                  <p className="text-sm mt-1 mb-4">Add your first session to get started</p>
                  <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session: any) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onAttendance={(id) => setAttendanceSessionId(id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          !isFacilitator && (
            <Card className="bg-white shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Calendar className="h-14 w-14 mb-4 text-gray-300" />
                <p className="font-medium">Select a cohort to view sessions</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Create Session Dialog */}
      {createOpen && selectedCohortId && (
        <CreateSessionDialog
          cohortId={selectedCohortId}
          existingCount={sessions.length}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}

      {/* Attendance Modal */}
      {attendanceSessionId && (
        <AttendanceModal
          sessionId={attendanceSessionId}
          open={!!attendanceSessionId}
          onOpenChange={(v) => { if (!v) setAttendanceSessionId(null); }}
        />
      )}
    </DashboardLayout>
  );
}
