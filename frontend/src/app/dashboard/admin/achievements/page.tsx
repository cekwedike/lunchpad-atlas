"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Edit, Users, Loader2,
  // type fallbacks
  Trophy, Star, Flame, MessageSquare,
  // per-achievement icons
  Footprints, BookOpen, Compass, Gauge, Library,
  FileQuestion, PenLine, Brain, Medal, Target,
  CheckCheck, Sparkles, Zap, Radio, Mic, Crown, Rocket,
  MessageCircle, MessagesSquare, Megaphone, LayoutList, Landmark,
  Reply, ReplyAll, MessageSquareDot, Award, Globe, Users2,
  Layers, TrendingUp, Shuffle, Swords, GraduationCap, MonitorPlay,
  BookMarked, LayoutGrid, BookCheck, University,
  CircleDollarSign, Coins, BarChart2, Wallet, BatteryCharging, BarChart3, ShieldCheck, Shield,
} from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  type: string;
  iconUrl: string | null;
  pointValue: number;
  criteria: Record<string, any>;
  unlockedByCount: number;
}

const TYPE_COLORS: Record<string, string> = {
  MILESTONE: "bg-blue-50 text-blue-700 border-blue-200",
  SOCIAL: "bg-green-50 text-green-700 border-green-200",
  STREAK: "bg-orange-50 text-orange-700 border-orange-200",
  LEADERBOARD: "bg-purple-50 text-purple-700 border-purple-200",
};

const TYPE_ICON_BG: Record<string, string> = {
  MILESTONE: "bg-blue-100 text-blue-600",
  SOCIAL: "bg-green-100 text-green-600",
  STREAK: "bg-orange-100 text-orange-600",
  LEADERBOARD: "bg-purple-100 text-purple-600",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MILESTONE: Star,
  SOCIAL: MessageSquare,
  STREAK: Flame,
  LEADERBOARD: Trophy,
};

// Unique icon per achievement name — falls back to TYPE_ICONS if not listed
const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // MILESTONE
  "First Step": Footprints,
  "Getting Started": BookOpen,
  "Resource Explorer": Compass,
  "Halfway There": Gauge,
  "Resource Master": Library,
  "Quiz Rookie": FileQuestion,
  "Quiz Enthusiast": PenLine,
  "Quiz Expert": Brain,
  "Quiz Champion": Medal,
  "Perfectionist": Target,
  "Twice Perfect": CheckCheck,
  "Flawless Five": Sparkles,
  "Flawless Ten": Star,
  "Live Buzzer": Zap,
  "Live Regular": Radio,
  "Live Pro": Mic,
  "Live Veteran": Crown,
  "Overachiever": Rocket,
  // SOCIAL
  "First Post": MessageSquare,
  "Regular Poster": MessageCircle,
  "Conversationalist": MessagesSquare,
  "Community Voice": Megaphone,
  "Forum Regular": LayoutList,
  "Community Pillar": Landmark,
  "First Reply": Reply,
  "Active Responder": ReplyAll,
  "Reply Guru": MessageSquareDot,
  "Reply Legend": Award,
  "Mega Contributor": Globe,
  "Social Butterfly": Users2,
  // STREAK / COMBO
  "Combo Starter": Layers,
  "Momentum Builder": TrendingUp,
  "All-Rounder": Shuffle,
  "Triple Threat": Swords,
  "Scholar": GraduationCap,
  "Live Learner": MonitorPlay,
  "Engaged Scholar": BookMarked,
  "The Trifecta": LayoutGrid,
  "Perfect Scholar": BookCheck,
  "Campus Legend": University,
  // LEADERBOARD / POINTS
  "Point Starter": CircleDollarSign,
  "Point Collector": Coins,
  "Point Accumulator": BarChart2,
  "Point Hoarder": Wallet,
  "Point Enthusiast": BatteryCharging,
  "Point Expert": BarChart3,
  "Point Legend": Trophy,
  "Point Elite": ShieldCheck,
  "Living Legend": Shield,
  "The GOAT": Flame,
};

function parseCriteria(criteria: unknown): Record<string, any> {
  if (!criteria) return {};
  if (typeof criteria === "string") {
    try { return JSON.parse(criteria); } catch { return {}; }
  }
  return criteria as Record<string, any>;
}

const CRITERIA_KEYS = [
  { key: "resourceCount", label: "Resources completed" },
  { key: "quizCount", label: "Quizzes passed" },
  { key: "perfectQuizCount", label: "Perfect quiz scores (100%)" },
  { key: "liveQuizCount", label: "Live quizzes joined" },
  { key: "liveQuizTop3", label: "Live quiz top-3 finishes" },
  { key: "discussionCount", label: "Discussions posted" },
  { key: "commentCount", label: "Comments posted" },
  { key: "qualityDiscussionCount", label: "Quality discussions (AI-scored)" },
  { key: "totalPoints", label: "Total points earned" },
  { key: "monthlyRank", label: "Monthly leaderboard rank ≤" },
  { key: "monthlyCoreCompletion", label: "Monthly core completion %" },
  { key: "sessionOptionalCompletion", label: "Session optional completion %" },
];

function EditAchievementDialog({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(achievement.name);
  const [description, setDescription] = useState(achievement.description);
  const [pointValue, setPointValue] = useState(String(achievement.pointValue));
  const [type, setType] = useState(achievement.type);
  const [criteria, setCriteria] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(parseCriteria(achievement.criteria)).map(([k, v]) => [k, String(v)])
    )
  );

  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.patch(`/admin/achievements/${achievement.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-achievements"] });
      toast.success("Achievement updated");
      onClose();
    },
    onError: (err: any) => {
      toast.error("Failed to update", { description: err.message });
    },
  });

  const handleSave = () => {
    const parsedCriteria: Record<string, number> = {};
    for (const [k, v] of Object.entries(criteria)) {
      const n = Number(v);
      if (!isNaN(n) && v.trim() !== "") parsedCriteria[k] = n;
    }

    mutation.mutate({
      name: name.trim(),
      description: description.trim(),
      pointValue: Number(pointValue),
      type,
      criteria: parsedCriteria,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Achievement</DialogTitle>
          <DialogDescription>
            Update the name, description, reward points, icon, and unlock conditions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bonus Points Awarded</Label>
              <Input
                type="number"
                min={0}
                value={pointValue}
                onChange={(e) => setPointValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="MILESTONE">Milestone</option>
                <option value="SOCIAL">Social</option>
                <option value="STREAK">Streak</option>
                <option value="LEADERBOARD">Leaderboard</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unlock Conditions</Label>
            <p className="text-xs text-gray-500">
              All non-empty fields must be satisfied for the achievement to unlock. Leave a field blank to exclude it.
            </p>
            <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
              {CRITERIA_KEYS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex-1 text-xs text-gray-600">{label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={criteria[key] ?? ""}
                    onChange={(e) =>
                      setCriteria((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder="—"
                    className="w-24 text-right h-7 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAchievementsPage() {
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const { data: achievements = [], isLoading } = useQuery<Achievement[]>({
    queryKey: ["admin-achievements"],
    queryFn: () => apiClient.get("/admin/achievements"),
  });

  const filtered = typeFilter === "ALL"
    ? achievements
    : achievements.filter((a) => a.type === typeFilter);

  const typeGroups = ["MILESTONE", "SOCIAL", "STREAK", "LEADERBOARD"];
  const totalUnlocked = achievements.reduce((s, a) => s + a.unlockedByCount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Achievements</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {achievements.length} achievements · {totalUnlocked} total unlocks
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["ALL", ...typeGroups].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
                className="text-xs"
              >
                {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
                {t !== "ALL" && (
                  <span className="ml-1 opacity-60">
                    ({achievements.filter((a) => a.type === t).length})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((achievement) => (
              <Card key={achievement.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {(() => {
                        const IconComp = ACHIEVEMENT_ICONS[achievement.name] ?? TYPE_ICONS[achievement.type] ?? Star;
                        const iconCls = TYPE_ICON_BG[achievement.type] ?? "bg-gray-100 text-gray-600";
                        return (
                          <div className={`shrink-0 p-1.5 rounded-lg ${iconCls}`}>
                            <IconComp className="h-5 w-5" />
                          </div>
                        );
                      })()}
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold text-gray-900 leading-tight truncate">
                          {achievement.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] px-1.5 py-0 ${TYPE_COLORS[achievement.type] ?? ""}`}
                        >
                          {achievement.type}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => setEditingAchievement(achievement)}
                    >
                      <Edit className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-gray-500 leading-snug">{achievement.description}</p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-600">+{achievement.pointValue} pts bonus</span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users className="h-3 w-3" />
                      {achievement.unlockedByCount} unlock{achievement.unlockedByCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {(() => {
                    const c = parseCriteria(achievement.criteria);
                    return Object.keys(c).length > 0 ? (
                      <div className="rounded-md bg-gray-50 px-2 py-1.5 space-y-0.5">
                        {Object.entries(c).map(([k, v]) => {
                          const label = CRITERIA_KEYS.find((ck) => ck.key === k)?.label ?? k;
                          return (
                            <div key={k} className="flex justify-between text-[11px] text-gray-600">
                              <span>{label}</span>
                              <span className="font-medium text-gray-900">{String(v)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {editingAchievement && (
          <EditAchievementDialog
            achievement={editingAchievement}
            onClose={() => setEditingAchievement(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
