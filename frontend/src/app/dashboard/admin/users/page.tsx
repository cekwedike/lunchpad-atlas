"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Search, Plus, Edit, Trash2,
  Eye, EyeOff, Loader2, CheckCircle, XCircle, Award, BookOpen, Ban, ShieldCheck, UserCheck
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAdminUsers, useCreateUser, useUpdateUserRole, useDeleteUser, useCohorts, useSessions, useUpdateUserCohort, useUpdateUserFacilitator, useUpdateUserDetails, useSuspendUser, useUnsuspendUser, useCreateGuestFacilitator, useExtendGuestAccess } from "@/hooks/api/useAdmin";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function formatDateForDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: usersResponse, isLoading } = useAdminUsers();
  const { data: cohortsData } = useCohorts();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const updateUserCohort = useUpdateUserCohort();
  const updateUserFacilitator = useUpdateUserFacilitator();
  const deleteUser = useDeleteUser();
  const updateUserDetails = useUpdateUserDetails();
  const suspendUser = useSuspendUser();
  const unsuspendUser = useUnsuspendUser();
  const createGuestFacilitator = useCreateGuestFacilitator();
  const extendGuestAccess = useExtendGuestAccess();
  const [searchQuery, setSearchQuery] = useState("");
  /** `datetime-local` value for guest facilitator access window (admin extend). */
  const [guestAccessExpiryInput, setGuestAccessExpiryInput] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isUnsuspendDialogOpen, setIsUnsuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendPreset, setSuspendPreset] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract users from API response
  const users = usersResponse?.users || [];
  const totalUsers = usersResponse?.pagination?.total || 0;
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  // Form state for add/edit user
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "FELLOW" as "FELLOW" | "FACILITATOR" | "ADMIN" | "GUEST_FACILITATOR",
    cohortId: "",
    isFacilitator: false,
  });

  // Guest facilitator form state
  const [guestForm, setGuestForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    cohortId: "",
    sessionIds: [] as string[],
  });
  const { data: guestSessionsData } = useSessions(guestForm.cohortId || undefined);
  const guestSessions = Array.isArray(guestSessionsData) ? guestSessionsData : [];

  // Generate auto-password for Fellows and Facilitators
  // Must satisfy backend PASSWORD_REGEX: uppercase + lowercase + digit + special char, min 8 chars
  const generatePassword = (
    name: string,
    role: "FELLOW" | "FACILITATOR" | "ADMIN" | "GUEST_FACILITATOR",
  ): string => {
    if (role === "ADMIN") {
      return ""; // Admins set their own password
    }

    // e.g. "Marvellous Egbeleke" → "Marve@2026"
    const firstName = name.split(' ')[0] || name;
    const namePrefix = firstName.substring(0, Math.min(5, firstName.length));
    // Ensure first char is uppercase, rest lowercase
    const prefix = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1).toLowerCase();
    const year = new Date().getFullYear();

    return `${prefix}@${year}`;
  };

  const handleAddUser = async () => {
    setIsSubmitting(true);
    try {
      // Generate password if not set (for Fellows/Facilitators)
      const passwordToUse = formData.password || generatePassword(formData.name, formData.role);
      
      // Validate password length (backend requires min 8)
      if (!passwordToUse || passwordToUse.length < 8) {
        toast.error('Password must be at least 8 characters');
        setIsSubmitting(false);
        return;
      }

      const userData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: passwordToUse,
        role: formData.role,
      };
      
      // Add cohortId for Fellows and Facilitators
      if ((formData.role === "FELLOW" || formData.role === "FACILITATOR") && formData.cohortId) {
        userData.cohortId = formData.cohortId;
      }
      
      console.log('Creating user with data:', { ...userData, password: '[REDACTED]' });

      await createUser.mutateAsync(userData);
      
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      // Parse name into first/last
      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const currentFullName = `${selectedUser.firstName} ${selectedUser.lastName}`.trim();
      const nameChanged = formData.name.trim() !== currentFullName;
      const emailChanged = formData.email !== selectedUser.email;
      const passwordChanged = !!formData.password;

      // Update name, email, or password if any changed
      if (nameChanged || emailChanged || passwordChanged) {
        await updateUserDetails.mutateAsync({
          userId: selectedUser.id,
          ...(nameChanged ? { firstName, lastName } : {}),
          ...(emailChanged ? { email: formData.email } : {}),
          ...(passwordChanged ? { password: formData.password } : {}),
        });
      }

      const roleChanged = formData.role !== selectedUser.role;
      const facilitatorCohortUpdated = roleChanged && formData.role === 'FACILITATOR' && !!formData.cohortId;

      if (facilitatorCohortUpdated) {
        await updateUserCohort.mutateAsync({
          userId: selectedUser.id,
          cohortId: formData.cohortId,
        });
      }

      // Update role if changed
      if (roleChanged) {
        await updateUserRole.mutateAsync({
          userId: selectedUser.id,
          role: formData.role,
        });
      }

      // Update isFacilitator for ADMIN users
      if (formData.role === 'ADMIN' && formData.isFacilitator !== (selectedUser.isFacilitator ?? false)) {
        await updateUserFacilitator.mutateAsync({
          userId: selectedUser.id,
          isFacilitator: formData.isFacilitator,
        });
      }
      
      // Update cohort if changed (for Fellows and Facilitators)
      if (!facilitatorCohortUpdated && (formData.role === 'FELLOW' || formData.role === 'FACILITATOR') && formData.cohortId !== selectedUser.cohortId) {
        await updateUserCohort.mutateAsync({
          userId: selectedUser.id,
          cohortId: formData.cohortId || null,
        });
      }
      
      // If role changed away from cohort-based roles, remove from cohort
      if (formData.role !== 'FELLOW' && formData.role !== 'FACILITATOR' && selectedUser.cohortId) {
        await updateUserCohort.mutateAsync({
          userId: selectedUser.id,
          cohortId: null,
        });
      }
      
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      password: "",
      role: user.role,
      cohortId: user.cohortId || "",
      isFacilitator: user.isFacilitator ?? false,
    });
    setGuestAccessExpiryInput(
      user.guestAccessExpiresAt
        ? formatDateForDatetimeLocal(new Date(user.guestAccessExpiresAt))
        : "",
    );
    setIsEditDialogOpen(true);
  };

  const handleExtendGuestAccessSubmit = async () => {
    if (!selectedUser || formData.role !== "GUEST_FACILITATOR" || !guestAccessExpiryInput) return;
    try {
      await extendGuestAccess.mutateAsync({
        userId: selectedUser.id,
        guestAccessExpiresAt: new Date(guestAccessExpiryInput).toISOString(),
      });
    } catch {
      /* toast from hook */
    }
  };

  const openDeleteDialog = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openSuspendDialog = (user: any) => {
    setSelectedUser(user);
    setSuspendReason("");
    setSuspendPreset("");
    setIsSuspendDialogOpen(true);
  };

  const openUnsuspendDialog = (user: any) => {
    setSelectedUser(user);
    setIsUnsuspendDialogOpen(true);
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    const reason = suspendReason.trim() || suspendPreset || undefined;
    await suspendUser.mutateAsync({ userId: selectedUser.id, reason });
    setIsSuspendDialogOpen(false);
    setSelectedUser(null);
  };

  const handleUnsuspend = async () => {
    if (!selectedUser) return;
    await unsuspendUser.mutateAsync(selectedUser.id);
    setIsUnsuspendDialogOpen(false);
    setSelectedUser(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "FELLOW",
      cohortId: "",
      isFacilitator: false,
    });
    setShowPassword(false);
    setGuestAccessExpiryInput("");
  };

  const filteredUsers = users.filter((user: any) =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FACILITATOR":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "FELLOW":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "GUEST_FACILITATOR":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN": return "Admin";
      case "FACILITATOR": return "Facilitator";
      case "FELLOW": return "Fellow";
      case "GUEST_FACILITATOR": return "Guest Facilitator";
      default: return role;
    }
  };

  const formatLastActive = (user: any) => {
    if (!user.lastActiveAt) return 'Never';

    const seconds = typeof user.lastActiveSeconds === 'number'
      ? user.lastActiveSeconds
      : Math.max(0, Math.floor((Date.now() - new Date(user.lastActiveAt).getTime()) / 1000));

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const stats = {
    totalUsers: users.length,
    fellows: users.filter((u: any) => u.role === "FELLOW").length,
    facilitators: users.filter((u: any) => u.role === "FACILITATOR").length,
    admins: users.filter((u: any) => u.role === "ADMIN").length,
    activeUsers: users.filter((u: any) => u.isActive).length,
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading users...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all platform users and their roles</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm"
              onClick={() => {
                setGuestForm({ firstName: "", lastName: "", email: "", password: "", cohortId: "", sessionIds: [] });
                setIsGuestDialogOpen(true);
              }}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Invite Guest Facilitator
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Fellows</CardTitle>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.fellows}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Facilitators</CardTitle>
                <Users className="h-4 w-4 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.facilitators}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.admins}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">All Users</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Full Name</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Cohort</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Points (all-time)
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider" title="Time on platform (dashboard heartbeat)">
                      App time (min)
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Active</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{`${user.firstName} ${user.lastName}`}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600">{user.email}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} font-medium`}>
                            {getRoleLabel(user.role)}
                          </Badge>
                          {user.role === "ADMIN" && user.isFacilitator && (
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-xs">
                              Facilitator
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {user.role === 'FELLOW' || user.role === 'FACILITATOR' ? (
                          user.cohort ? (
                            <span className="text-sm text-gray-900 font-medium">{user.cohort.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400">No cohort</span>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {user.isSuspended ? (
                            <>
                              <Ban className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-600">Suspended</span>
                            </>
                          ) : user.isActive ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-400">Inactive</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {user.role === "FELLOW" ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-amber-500" />
                              <span className="text-sm text-gray-900 font-semibold">
                                {user.statistics?.totalPoints ?? 0}
                              </span>
                            </div>
                            {(() => {
                              const cm = (
                                user.statistics as
                                  | { totalPoints?: number; currentMonthPoints?: number }
                                  | undefined
                              )?.currentMonthPoints;
                              return typeof cm === "number" && cm > 0 ? (
                                <span className="text-xs text-gray-500 pl-6">{cm} this month</span>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-700 tabular-nums">
                          {typeof user.statistics?.totalPlatformTimeMinutes === "number"
                            ? user.statistics.totalPlatformTimeMinutes
                            : "—"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600">
                          {formatLastActive(user)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.isSuspended ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUnsuspendDialog(user)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                              title="Unsuspend user"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSuspendDialog(user)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-amber-600 hover:bg-amber-50"
                              title="Suspend user"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No users found matching your search</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Add New User</DialogTitle>
              <DialogDescription className="text-gray-600">
                Create a new user account with login credentials. User will be able to sign in immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-900">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-900">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-900">User Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as "FELLOW" | "FACILITATOR" | "ADMIN";
                    setFormData({
                      ...formData,
                      role: newRole,
                      password: newRole === "ADMIN" ? "" : formData.password,
                      cohortId: newRole === "FELLOW" || newRole === "FACILITATOR" ? formData.cohortId : "",
                    });
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="FELLOW">Fellow</option>
                  <option value="FACILITATOR">Facilitator</option>
                  <option value="ADMIN">Admin</option>
                  <option value="GUEST_FACILITATOR">Guest Facilitator</option>
                </select>
              </div>
              
              {/* Facilitator privilege - Admins only */}
              {formData.role === "ADMIN" && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <input
                    type="checkbox"
                    id="isFacilitator"
                    checked={formData.isFacilitator}
                    onChange={(e) => setFormData({ ...formData, isFacilitator: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <Label htmlFor="isFacilitator" className="text-sm font-medium text-gray-900 cursor-pointer">Can Facilitate Cohorts</Label>
                    <p className="text-xs text-gray-500">Grants facilitator-level access to be assigned to cohorts</p>
                  </div>
                </div>
              )}

              {/* Cohort selector - Fellows and Facilitators */}
              {(formData.role === "FELLOW" || formData.role === "FACILITATOR") && (
                <div className="space-y-2">
                  <Label htmlFor="cohort" className="text-sm font-medium text-gray-900">
                    Cohort (Optional)
                  </Label>
                  <select
                    id="cohort"
                    value={formData.cohortId}
                    onChange={(e) => setFormData({ ...formData, cohortId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No cohort assigned</option>
                    {cohorts.map((cohort: any) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort._count?.fellows || 0} members)
                      </option>
                    ))}
                  </select>
                  {formData.role === "FELLOW" && cohorts.length > 0 && (
                    <p className="text-xs text-gray-500">
                      If no cohort is selected and a "2026" cohort exists, the user will be auto-assigned to it.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-900">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      formData.role === "ADMIN" 
                        ? "Create a secure password" 
                        : `Auto-generated: ${formData.name ? generatePassword(formData.name, formData.role) : "Enter name first"}`
                    }
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-gray-50 border-gray-300 text-gray-900 pr-10"
                    disabled={formData.role !== "ADMIN" && !formData.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {formData.role === "ADMIN" 
                    ? "Admin must set a secure password (min 6 characters)" 
                    : "Password will be auto-generated from name + year (e.g., john2026). You can override it if needed."}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)} 
                disabled={isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddUser} 
                disabled={
                  !formData.name ||
                  !formData.email ||
                  (formData.role === "ADMIN" && !formData.password) ||
                  isSubmitting
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Edit User</DialogTitle>
              <DialogDescription className="text-gray-600">
                Update user information and role assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-900">Full Name</Label>
                <Input
                  id="edit-name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-900">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password" className="text-sm font-medium text-gray-900">New Password (optional)</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Leave blank to keep current password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-gray-50 border-gray-300 text-gray-900 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-medium text-gray-900">User Role</Label>
                <select
                  id="edit-role"
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as "FELLOW" | "FACILITATOR" | "ADMIN" | "GUEST_FACILITATOR";
                    setFormData({
                      ...formData,
                      role: newRole,
                      cohortId: newRole === "FELLOW" || newRole === "FACILITATOR" ? formData.cohortId : ""
                    });
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="FELLOW">Fellow</option>
                  <option value="FACILITATOR">Facilitator</option>
                  <option value="ADMIN">Admin</option>
                  <option value="GUEST_FACILITATOR">Guest Facilitator</option>
                </select>
              </div>
              
              {/* Facilitator privilege - Admins only */}
              {formData.role === "ADMIN" && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <input
                    type="checkbox"
                    id="edit-isFacilitator"
                    checked={formData.isFacilitator}
                    onChange={(e) => setFormData({ ...formData, isFacilitator: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <Label htmlFor="edit-isFacilitator" className="text-sm font-medium text-gray-900 cursor-pointer">Can Facilitate Cohorts</Label>
                    <p className="text-xs text-gray-500">Grants facilitator-level access to be assigned to cohorts</p>
                  </div>
                </div>
              )}

              {/* Cohort selector - Fellows and Facilitators */}
              {(formData.role === "FELLOW" || formData.role === "FACILITATOR") && (
                <div className="space-y-2">
                  <Label htmlFor="edit-cohort" className="text-sm font-medium text-gray-900">Cohort</Label>
                  <select
                    id="edit-cohort"
                    value={formData.cohortId}
                    onChange={(e) => setFormData({ ...formData, cohortId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{formData.role === "FACILITATOR" ? "Select a cohort" : "No cohort"}</option>
                    {cohorts.map((cohort: any) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort._count?.fellows || 0} members)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.role === "GUEST_FACILITATOR" && (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                  <Label className="text-sm font-medium text-gray-900">Guest access window</Label>
                  <p className="text-xs text-gray-600">
                    After this date and time they cannot sign in until you set a new end date here (unlock by extending the window).
                  </p>
                  <Input
                    type="datetime-local"
                    value={guestAccessExpiryInput}
                    onChange={(e) => setGuestAccessExpiryInput(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={extendGuestAccess.isPending || !guestAccessExpiryInput}
                    onClick={handleExtendGuestAccessSubmit}
                  >
                    {extendGuestAccess.isPending ? "Updating…" : "Update access window"}
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)} 
                disabled={isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditUser} 
                disabled={!formData.name || !formData.email || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend User Dialog */}
        <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
          <DialogContent className="sm:max-w-[450px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Suspend User</DialogTitle>
              <DialogDescription className="text-gray-600">
                Suspend <strong className="text-gray-900">{selectedUser?.firstName} {selectedUser?.lastName}</strong>. They will not be able to log in until unsuspended.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Reason (select or type)</Label>
                <select
                  value={suspendPreset}
                  onChange={(e) => { setSuspendPreset(e.target.value); setSuspendReason(""); }}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select a preset reason...</option>
                  <option value="Violation of community guidelines">Violation of community guidelines</option>
                  <option value="Academic dishonesty">Academic dishonesty</option>
                  <option value="Inappropriate behavior">Inappropriate behavior</option>
                  <option value="Repeated policy violations">Repeated policy violations</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Custom reason (optional)</Label>
                <Textarea
                  placeholder="Provide additional details..."
                  value={suspendReason}
                  onChange={(e) => { setSuspendReason(e.target.value); setSuspendPreset(""); }}
                  className="bg-gray-50 border-gray-300 text-gray-900 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)} disabled={suspendUser.isPending} className="border-gray-300">
                Cancel
              </Button>
              <Button onClick={handleSuspend} disabled={suspendUser.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                {suspendUser.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Suspending...</> : <><Ban className="h-4 w-4 mr-2" />Suspend User</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsuspend Confirmation Dialog */}
        <Dialog open={isUnsuspendDialogOpen} onOpenChange={setIsUnsuspendDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Unsuspend User</DialogTitle>
              <DialogDescription className="text-gray-600">
                Restore access for <strong className="text-gray-900">{selectedUser?.firstName} {selectedUser?.lastName}</strong>. They will be able to log in immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsUnsuspendDialogOpen(false)} disabled={unsuspendUser.isPending} className="border-gray-300">
                Cancel
              </Button>
              <Button onClick={handleUnsuspend} disabled={unsuspendUser.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {unsuspendUser.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Unsuspending...</> : <><ShieldCheck className="h-4 w-4 mr-2" />Unsuspend User</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Delete User</DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to delete <strong className="text-gray-900">{selectedUser?.name}</strong>? 
                This action cannot be undone. All user data including progress, points, and submissions will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)} 
                disabled={isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      {/* Invite Guest Facilitator Dialog */}
      <Dialog open={isGuestDialogOpen} onOpenChange={setIsGuestDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Invite Guest Facilitator
            </DialogTitle>
            <DialogDescription>
              Create a guest account for an external facilitator. They will receive a welcome email with login credentials and session details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="guest-firstName">First Name</Label>
                <Input
                  id="guest-firstName"
                  value={guestForm.firstName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guest-lastName">Last Name</Label>
                <Input
                  id="guest-lastName"
                  value={guestForm.lastName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guest-email">Email Address</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestForm.email}
                onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="guest@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guest-password">
                Temporary Password{" "}
                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:underline ml-1"
                  onClick={() => {
                    const name = guestForm.firstName || "Guest";
                    const firstName = name.substring(0, Math.min(5, name.length));
                    const prefix = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                    setGuestForm((f) => ({ ...f, password: `${prefix}@${new Date().getFullYear()}` }));
                  }}
                >
                  Auto-generate
                </button>
              </Label>
              <div className="relative">
                <Input
                  id="guest-password"
                  type={showPassword ? "text" : "password"}
                  value={guestForm.password}
                  onChange={(e) => setGuestForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guest-cohort">Cohort <span className="text-red-500">*</span></Label>
              <select
                id="guest-cohort"
                value={guestForm.cohortId}
                onChange={(e) => setGuestForm((f) => ({ ...f, cohortId: e.target.value, sessionIds: [] }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a cohort</option>
                {cohorts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {guestForm.cohortId && (
              <div className="space-y-1.5">
                <Label>
                  Sessions{" "}
                  <span className="text-xs text-gray-500 font-normal">(optional — can be assigned later)</span>
                </Label>
                {guestSessions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No sessions found for this cohort.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {guestSessions.map((s: any) => (
                      <label
                        key={s.id}
                        className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={guestForm.sessionIds.includes(s.id)}
                          onChange={(e) => {
                            setGuestForm((f) => ({
                              ...f,
                              sessionIds: e.target.checked
                                ? [...f.sessionIds, s.id]
                                : f.sessionIds.filter((id) => id !== s.id),
                            }));
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Session {s.sessionNumber}: {s.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(s.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {guestForm.sessionIds.length > 0 && (
                  <p className="text-xs text-indigo-600">
                    {guestForm.sessionIds.length} session{guestForm.sessionIds.length !== 1 ? "s" : ""} selected — access expires 8 days after the last session.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGuestDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={createGuestFacilitator.isPending || !guestForm.firstName || !guestForm.lastName || !guestForm.email || !guestForm.password || !guestForm.cohortId}
              onClick={() => {
                createGuestFacilitator.mutate(
                  {
                    firstName: guestForm.firstName.trim(),
                    lastName: guestForm.lastName.trim(),
                    email: guestForm.email.trim().toLowerCase(),
                    password: guestForm.password,
                    cohortId: guestForm.cohortId,
                    ...(guestForm.sessionIds.length > 0 && { sessionIds: guestForm.sessionIds }),
                  },
                  {
                    onSuccess: () => setIsGuestDialogOpen(false),
                  }
                );
              }}
            >
              {createGuestFacilitator.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <><UserCheck className="h-4 w-4 mr-2" />Send Invitation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </DashboardLayout>
  );
}
