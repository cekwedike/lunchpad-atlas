"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  FileQuestion, Plus, Trash2, Clock, Award, Sparkles, Loader2,
  ChevronDown, ChevronUp, CheckCircle, BookOpen, Zap, CalendarClock,
  LockOpen, Lock,
} from "lucide-react";
import {
  useCohorts, useSessions, useCohortQuizzes, useCreateQuiz,
  useDeleteQuiz, useGenerateAIQuestions,
} from "@/hooks/api/useAdmin";
import { useCreateLiveQuiz, useDeleteLiveQuiz, useCohortLiveQuizzes } from "@/hooks/api/useLiveQuiz";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuizTab = "standard" | "live";
type QuizTypeFilter = "ALL" | "SESSION" | "GENERAL" | "MEGA";

interface QuestionDraft {
  question: string;
  options: [string, string, string, string];
  correctAnswer: string;
}

const QUIZ_TYPE_COLORS: Record<string, string> = {
  SESSION:  "bg-blue-100 text-blue-700",
  GENERAL:  "bg-emerald-100 text-emerald-700",
  MEGA:     "bg-amber-100 text-amber-700",
};

// ─── Quiz Card ────────────────────────────────────────────────────────────────
function StandardQuizCard({
  quiz, cohortId, onDelete,
}: {
  quiz: any;
  cohortId: string;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="p-2 rounded-lg bg-violet-100 shrink-0">
          <FileQuestion className="h-4 w-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{quiz.title}</p>
              {quiz.sessions?.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {quiz.sessions.map((qs: any) => `S${qs.session.sessionNumber}: ${qs.session.title}`).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`text-xs ${QUIZ_TYPE_COLORS[quiz.quizType] || "bg-gray-100 text-gray-600"}`}>
                {quiz.quizType || "SESSION"}
              </Badge>
              {quiz.timeLimit > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" /> {quiz.timeLimit}m
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Award className="h-3 w-3" /> {quiz.pointValue} pts
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
            <span>{quiz._count?.questions ?? 0} questions</span>
            <span>{quiz._count?.responses ?? 0} attempts</span>
            <span>Pass: {quiz.passingScore}%</span>
            {quiz.openAt && (
              <span className="flex items-center gap-1 text-emerald-600">
                <LockOpen className="h-3 w-3" />
                Opens {new Date(quiz.openAt).toLocaleString()}
              </span>
            )}
            {quiz.closeAt && (
              <span className="flex items-center gap-1 text-orange-500">
                <Lock className="h-3 w-3" />
                Closes {new Date(quiz.closeAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-600">Delete?</span>
              <button
                onClick={onDelete}
                className="px-2 py-0.5 rounded bg-red-600 text-white text-xs hover:bg-red-700"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="px-2 py-0.5 rounded border text-xs hover:bg-gray-50"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
      {expanded && quiz.questions && quiz.questions.length > 0 && (
        <div className="border-t bg-gray-50 p-4 space-y-2">
          {quiz.questions.map((q: any, i: number) => (
            <div key={q.id} className="text-xs text-gray-700">
              <span className="font-medium text-gray-900">{i + 1}. {q.question}</span>
              <div className="ml-3 mt-1 space-y-0.5">
                {(Array.isArray(q.options) ? q.options : []).map((opt: string) => (
                  <div key={opt} className={`flex items-center gap-1 ${opt === q.correctAnswer ? "text-green-700 font-medium" : "text-gray-500"}`}>
                    {opt === q.correctAnswer && <CheckCircle className="h-3 w-3 shrink-0" />}
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Live Quiz Card ───────────────────────────────────────────────────────────
function LiveQuizCard({ quiz, onDelete }: { quiz: any; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-amber-100 shrink-0">
        <Zap className="h-4 w-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm">{quiz.title}</p>
          <Badge className={`text-xs ${statusColors[quiz.status] || "bg-gray-100 text-gray-600"}`}>
            {quiz.status}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
          <span>{quiz.totalQuestions} questions</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{quiz.timePerQuestion}s/question</span>
          {quiz.participants && <span>{quiz.participants.length} participants</span>}
        </div>
      </div>
      <div className="shrink-0">
        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600">Delete?</span>
            <button onClick={onDelete} className="px-2 py-0.5 rounded bg-red-600 text-white text-xs hover:bg-red-700">Yes</button>
            <button onClick={() => setConfirm(false)} className="px-2 py-0.5 rounded border text-xs hover:bg-gray-50">No</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Standard Quiz Dialog ──────────────────────────────────────────────
function CreateStandardQuizDialog({
  open, onClose, cohortId, sessions,
}: {
  open: boolean;
  onClose: () => void;
  cohortId: string;
  sessions: any[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quizType, setQuizType] = useState<"SESSION" | "GENERAL" | "MEGA">("SESSION");
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(0);
  const [passingScore, setPassingScore] = useState(70);
  const [pointValue, setPointValue] = useState(200);
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  // AI generation state
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [showAiForm, setShowAiForm] = useState(false);

  const createQuiz = useCreateQuiz();
  const generateAI = useGenerateAIQuestions();

  const resetForm = () => {
    setTitle(""); setDescription(""); setQuizType("SESSION"); setSelectedSessionIds([]);
    setTimeLimit(0); setPassingScore(70); setPointValue(200); setQuestions([]);
    setOpenAt(""); setCloseAt("");
    setAiCount(5); setAiDifficulty("medium");
    setShowAiForm(false);
  };

  const toggleSession = (id: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGenerateAI = async () => {
    const result = await generateAI.mutateAsync({
      quizTitle: title || undefined,
      sessionIds: quizType === "SESSION" ? selectedSessionIds : undefined,
      cohortId: quizType === "MEGA" ? cohortId : undefined,
      questionCount: aiCount,
      difficulty: aiDifficulty,
    });
    const drafts: QuestionDraft[] = result.questions.map((q) => ({
      question: q.question,
      options: q.options.slice(0, 4).concat(["", "", "", ""]).slice(0, 4) as [string, string, string, string],
      correctAnswer: q.correctAnswer,
    }));
    setQuestions((prev) => [...prev, ...drafts]);
    setShowAiForm(false);
    toast.success(`${drafts.length} questions generated`);
  };

  const addBlankQuestion = () => {
    setQuestions((prev) => [...prev, { question: "", options: ["", "", "", ""], correctAnswer: "" }]);
  };

  const updateQuestion = (i: number, field: keyof QuestionDraft, value: any) => {
    setQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        const opts = [...q.options] as [string, string, string, string];
        opts[oi] = value;
        return { ...q, options: opts };
      }),
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (quizType === "SESSION" && selectedSessionIds.length === 0) { toast.error("Select at least one session"); return; }
    if (questions.length === 0) { toast.error("Add at least one question"); return; }
    const invalid = questions.find((q) => !q.question.trim() || !q.correctAnswer || q.options.some((o) => !o.trim()));
    if (invalid) { toast.error("All questions must have text, 4 options, and a correct answer"); return; }

    await createQuiz.mutateAsync({
      title, description: description || undefined,
      cohortId, quizType, timeLimit, passingScore, pointValue,
      openAt: openAt || undefined,
      closeAt: closeAt || undefined,
      sessionIds: quizType === "SESSION" ? selectedSessionIds : undefined,
      questions: questions.map((q, i) => ({ ...q, order: i + 1 })),
    });
    toast.success("Quiz created");
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-violet-600" />
            Create Quiz
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm font-medium">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 1 Knowledge Check" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm font-medium">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>

            {/* Quiz Type */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm font-medium">Quiz Type *</Label>
              <div className="flex gap-2">
                {(["SESSION", "GENERAL", "MEGA"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setQuizType(t); setSelectedSessionIds([]); }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      quizType === t
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-violet-300"
                    }`}
                  >
                    {t === "SESSION" ? "Session" : t === "GENERAL" ? "General" : "Mega"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                {quizType === "SESSION" && "Linked to one or more sessions — one quiz covers all selected sessions"}
                {quizType === "GENERAL" && "Cohort-wide quiz, not tied to any session"}
                {quizType === "MEGA" && "End-of-month mega quiz with high point value"}
              </p>
            </div>

            {/* Session multi-select */}
            {quizType === "SESSION" && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-sm font-medium">
                  Sessions * <span className="text-gray-400 font-normal">({selectedSessionIds.length} selected)</span>
                </Label>
                <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100">
                  {sessions.length === 0 ? (
                    <p className="p-3 text-sm text-gray-400 text-center">No sessions in this cohort</p>
                  ) : (
                    sessions.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-violet-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedSessionIds.includes(s.id)}
                          onChange={() => toggleSession(s.id)}
                          className="accent-violet-600"
                        />
                        <span className="text-sm text-gray-800">
                          <span className="font-medium text-violet-700">S{s.sessionNumber}</span>
                          {" — "}{s.title}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedSessionIds.length > 1 && (
                  <p className="text-xs text-violet-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {selectedSessionIds.length} sessions linked to this quiz
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Time Limit (min)</Label>
              <Input type="number" min={0} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
              <p className="text-xs text-gray-400">0 = no limit</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Passing Score (%)</Label>
              <Input type="number" min={1} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Point Value</Label>
              <Input type="number" min={1} value={pointValue} onChange={(e) => setPointValue(Number(e.target.value))} />
            </div>
          </div>

          {/* Open / Close Schedule */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-gray-500" />
              Quiz Schedule <span className="text-xs font-normal text-gray-400">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <LockOpen className="h-3 w-3 text-emerald-500" /> Opens At
                </Label>
                <Input
                  type="datetime-local"
                  value={openAt}
                  onChange={(e) => setOpenAt(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-400">Leave blank to open immediately</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-orange-500" /> Closes At
                </Label>
                <Input
                  type="datetime-local"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-400">Leave blank to never close</p>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-900">Questions ({questions.length})</Label>
              <div className="flex gap-2">
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => setShowAiForm((v) => !v)}
                  className="h-7 text-xs gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <Sparkles className="h-3 w-3" /> Generate with ATLAS
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={addBlankQuestion} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Manual
                </Button>
              </div>
            </div>

            {/* AI Form */}
            {showAiForm && (
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 space-y-3">
                <p className="text-sm font-medium text-purple-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Generate Questions with ATLAS
                </p>
                {/* Context summary — what ATLAS will use */}
                <div className="text-xs text-purple-700 bg-purple-100 rounded-lg px-3 py-2 space-y-0.5">
                  <p className="font-medium">ATLAS will base questions on:</p>
                  {title && <p>• Quiz title: <span className="font-semibold">{title}</span></p>}
                  {quizType === "SESSION" && selectedSessionIds.length > 0 && (
                    <p>• {selectedSessionIds.length} selected session{selectedSessionIds.length > 1 ? "s" : ""} (transcripts auto-imported)</p>
                  )}
                  {quizType === "MEGA" && (
                    <p>• All analysed sessions in cohort (transcripts auto-imported)</p>
                  )}
                  {quizType === "GENERAL" && !title && (
                    <p>• General career development content</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Question Count</Label>
                    <Input type="number" min={1} max={20} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Difficulty</Label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm bg-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button" size="sm"
                    onClick={handleGenerateAI}
                    disabled={generateAI.isPending}
                    className="bg-purple-600 hover:bg-purple-700 gap-1"
                  >
                    {generateAI.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {generateAI.isPending ? "Generating…" : "Generate"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowAiForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Question list */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {questions.map((q, qi) => (
                <div key={qi} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-500 mt-2 shrink-0">Q{qi + 1}</span>
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(qi, "question", e.target.value)}
                      placeholder="Question text"
                      className="text-sm"
                    />
                    <button onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))} className="p-1 text-gray-400 hover:text-red-500 mt-1 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="ml-6 grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctAnswer === opt && opt !== ""}
                          onChange={() => updateQuestion(qi, "correctAnswer", opt)}
                          className="shrink-0 accent-green-600"
                          title="Mark as correct answer"
                        />
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="ml-6 text-xs text-gray-400">Select the radio button next to the correct answer</p>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  <FileQuestion className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No questions yet — generate with ATLAS or add manually</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={createQuiz.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {createQuiz.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
            ) : (
              "Create Quiz"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Live Quiz Dialog ──────────────────────────────────────────────────
function CreateLiveQuizDialog({
  open, onClose, cohortId, sessions,
}: {
  open: boolean;
  onClose: () => void;
  cohortId: string;
  sessions: any[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [questions, setQuestions] = useState<Array<{
    questionText: string;
    options: [string, string, string, string];
    correctAnswer: number;
    timeLimit: number;
    pointValue: number;
  }>>([]);

  // AI state
  const [showAiForm, setShowAiForm] = useState(false);
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const createLiveQuiz = useCreateLiveQuiz();
  const generateAI = useGenerateAIQuestions();

  const OPTION_COLORS = ["red", "blue", "yellow", "green"] as const;

  const toggleLiveSession = (id: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setSelectedSessionIds([]);
    setTimePerQuestion(30); setQuestions([]);
    setShowAiForm(false); setAiCount(5);
  };

  const handleGenerateAI = async () => {
    const result = await generateAI.mutateAsync({
      quizTitle: title || undefined,
      sessionIds: selectedSessionIds.length ? selectedSessionIds : undefined,
      questionCount: aiCount,
      difficulty: aiDifficulty,
    });
    const drafts = result.questions.map((q) => ({
      questionText: q.question,
      options: q.options.slice(0, 4).concat(["", "", "", ""]).slice(0, 4) as [string, string, string, string],
      correctAnswer: q.options.indexOf(q.correctAnswer) >= 0 ? q.options.indexOf(q.correctAnswer) : 0,
      timeLimit: timePerQuestion,
      pointValue: 1000,
    }));
    setQuestions((prev) => [...prev, ...drafts]);
    setShowAiForm(false);
    toast.success(`${drafts.length} questions generated`);
  };

  const addBlankQuestion = () => {
    setQuestions((prev) => [...prev, { questionText: "", options: ["", "", "", ""], correctAnswer: 0, timeLimit: timePerQuestion, pointValue: 1000 }]);
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (selectedSessionIds.length === 0) { toast.error("Select at least one session"); return; }
    if (questions.length === 0) { toast.error("Add at least one question"); return; }
    const invalid = questions.find((q) => !q.questionText.trim() || q.options.some((o) => !o.trim()));
    if (invalid) { toast.error("All questions must have text and 4 options"); return; }

    const payload = questions.map((q) => ({
      questionText: q.questionText,
      options: q.options.map((text, i) => ({ text, color: OPTION_COLORS[i] })),
      correctAnswer: q.correctAnswer,
      timeLimit: q.timeLimit,
      pointValue: q.pointValue,
    }));

    await createLiveQuiz.mutateAsync({
      sessionIds: selectedSessionIds,
      title,
      description: description || undefined,
      timePerQuestion,
      questions: payload,
    });
    toast.success("Live quiz created");
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Create Live Quiz (Mega Quiz)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm font-medium">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. March End-of-Month Mega Quiz" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm font-medium">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm font-medium">
                Sessions * <span className="text-gray-400 font-normal">({selectedSessionIds.length} selected)</span>
              </Label>
              <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100">
                {sessions.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400 text-center">No sessions in this cohort</p>
                ) : (
                  sessions.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-amber-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.includes(s.id)}
                        onChange={() => toggleLiveSession(s.id)}
                        className="accent-amber-500"
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-medium text-amber-600">S{s.sessionNumber}</span>
                        {" — "}{s.title}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedSessionIds.length > 1 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {selectedSessionIds.length} sessions linked to this quiz
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Default Seconds / Question</Label>
              <Input type="number" min={5} max={120} value={timePerQuestion} onChange={(e) => setTimePerQuestion(Number(e.target.value))} />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-900">Questions ({questions.length})</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline"
                  onClick={() => setShowAiForm((v) => !v)}
                  className="h-7 text-xs gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <Sparkles className="h-3 w-3" /> Generate with ATLAS
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={addBlankQuestion} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Manual
                </Button>
              </div>
            </div>

            {showAiForm && (
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 space-y-3">
                <p className="text-sm font-medium text-purple-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Generate with ATLAS
                </p>
                <div className="text-xs text-purple-700 bg-purple-100 rounded-lg px-3 py-2 space-y-0.5">
                  <p className="font-medium">ATLAS will base questions on:</p>
                  {title && <p>• Quiz title: <span className="font-semibold">{title}</span></p>}
                  {selectedSessionIds.length > 0 && (
                    <p>• {selectedSessionIds.length} selected session{selectedSessionIds.length > 1 ? "s" : ""} (transcripts auto-imported)</p>
                  )}
                  {!title && selectedSessionIds.length === 0 && <p>• General career development content</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Count</Label>
                    <Input type="number" min={1} max={20} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Difficulty</Label>
                    <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as any)} className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm bg-white">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleGenerateAI} disabled={generateAI.isPending} className="bg-purple-600 hover:bg-purple-700 gap-1">
                    {generateAI.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {generateAI.isPending ? "Generating…" : "Generate"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowAiForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {questions.map((q, qi) => (
                <div key={qi} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-500 mt-2 shrink-0">Q{qi + 1}</span>
                    <Input
                      value={q.questionText}
                      onChange={(e) => setQuestions((prev) => prev.map((q2, i) => i === qi ? { ...q2, questionText: e.target.value } : q2))}
                      placeholder="Question text"
                      className="text-sm"
                    />
                    <button onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))} className="p-1 text-gray-400 hover:text-red-500 mt-1 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="ml-6 grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`live-correct-${qi}`}
                          checked={q.correctAnswer === oi}
                          onChange={() => setQuestions((prev) => prev.map((q2, i) => i === qi ? { ...q2, correctAnswer: oi } : q2))}
                          className="shrink-0 accent-green-600"
                          title="Correct answer"
                        />
                        <Input
                          value={opt}
                          onChange={(e) => setQuestions((prev) =>
                            prev.map((q2, i) => {
                              if (i !== qi) return q2;
                              const opts = [...q2.options] as [string, string, string, string];
                              opts[oi] = e.target.value;
                              return { ...q2, options: opts };
                            }),
                          )}
                          placeholder={`${["Red", "Blue", "Yellow", "Green"][oi]} option`}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No questions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createLiveQuiz.isPending} className="bg-amber-500 hover:bg-amber-600">
            {createLiveQuiz.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
            ) : (
              "Create Live Quiz"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizManagementPage() {
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [activeTab, setActiveTab] = useState<QuizTab>("standard");
  const [typeFilter, setTypeFilter] = useState<QuizTypeFilter>("ALL");
  const [showCreateStandard, setShowCreateStandard] = useState(false);
  const [showCreateLive, setShowCreateLive] = useState(false);

  const { data: cohortsData } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  const { data: sessionsData } = useSessions(selectedCohortId);
  const sessions: any[] = Array.isArray(sessionsData) ? sessionsData : (sessionsData as any)?.sessions ?? [];

  const { data: quizData, isLoading: loadingQuizzes } = useCohortQuizzes(selectedCohortId || undefined);
  const { data: liveQuizzes, isLoading: loadingLive } = useCohortLiveQuizzes(selectedCohortId);

  const deleteQuiz = useDeleteQuiz();
  const deleteLiveQuiz = useDeleteLiveQuiz();

  const sessionQuizzes: any[] = quizData?.sessionQuizzes ?? [];
  const cohortQuizzes: any[] = quizData?.cohortQuizzes ?? [];
  const allStandard = [...sessionQuizzes, ...cohortQuizzes];
  const filteredStandard = typeFilter === "ALL" ? allStandard : allStandard.filter((q) => q.quizType === typeFilter);

  const liveList: any[] = Array.isArray(liveQuizzes) ? liveQuizzes : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quiz Management</h1>
            <p className="text-gray-600 mt-1 text-sm">Create and manage quizzes for fellows</p>
          </div>
        </div>

        {/* Cohort Selector */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-medium text-gray-600 shrink-0">Cohort</label>
              <select
                className="w-full sm:w-80 p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm"
                value={selectedCohortId}
                onChange={(e) => { setSelectedCohortId(e.target.value); }}
              >
                <option value="">Select a cohort</option>
                {cohorts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {!selectedCohortId ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileQuestion className="h-14 w-14 mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">Select a cohort to manage quizzes</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
              {([
                { key: "standard", label: "Standard Quizzes", icon: BookOpen },
                { key: "live",     label: "Live / Mega Quizzes", icon: Zap },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? "border-violet-600 text-violet-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Standard Quizzes Tab ── */}
            {activeTab === "standard" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Type filter */}
                  <div className="flex gap-1.5">
                    {(["ALL", "SESSION", "GENERAL", "MEGA"] as QuizTypeFilter[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          typeFilter === t
                            ? "bg-violet-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {t === "ALL" ? `All (${allStandard.length})` : `${t} (${allStandard.filter((q) => q.quizType === t).length})`}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateStandard(true)}
                    className="bg-violet-600 hover:bg-violet-700 gap-1"
                  >
                    <Plus className="h-4 w-4" /> New Quiz
                  </Button>
                </div>

                {loadingQuizzes ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                  </div>
                ) : filteredStandard.length === 0 ? (
                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <FileQuestion className="h-10 w-10 mb-2 text-gray-200" />
                      <p className="text-sm font-medium">No quizzes yet</p>
                      <p className="text-xs mt-1">Create your first quiz to get started</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredStandard.map((quiz) => (
                      <StandardQuizCard
                        key={quiz.id}
                        quiz={quiz}
                        cohortId={selectedCohortId}
                        onDelete={() => deleteQuiz.mutate({ quizId: quiz.id, cohortId: selectedCohortId })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Live / Mega Quizzes Tab ── */}
            {activeTab === "live" && (
              <div className="space-y-4">
                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={() => setShowCreateLive(true)}
                    className="bg-amber-500 hover:bg-amber-600 gap-1"
                  >
                    <Plus className="h-4 w-4" /> New Live Quiz
                  </Button>
                </div>

                {loadingLive ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                  </div>
                ) : liveList.length === 0 ? (
                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Zap className="h-10 w-10 mb-2 text-gray-200" />
                      <p className="text-sm font-medium">No live quizzes yet</p>
                      <p className="text-xs mt-1">Create a Mega Quiz to run a Kahoot-style live game</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {liveList.map((quiz) => (
                      <LiveQuizCard
                        key={quiz.id}
                        quiz={quiz}
                        onDelete={() => deleteLiveQuiz.mutate(quiz.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <CreateStandardQuizDialog
        open={showCreateStandard}
        onClose={() => setShowCreateStandard(false)}
        cohortId={selectedCohortId}
        sessions={sessions}
      />
      <CreateLiveQuizDialog
        open={showCreateLive}
        onClose={() => setShowCreateLive(false)}
        cohortId={selectedCohortId}
        sessions={sessions}
      />
    </DashboardLayout>
  );
}
