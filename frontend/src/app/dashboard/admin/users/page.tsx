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
  Users, Search, Download, Plus, Edit, Trash2,
  Eye, EyeOff, Loader2, CheckCircle, XCircle, Award, BookOpen
} from "lucide-react";
import { useAdminUsers, useCreateUser, useUpdateUserRole, useDeleteUser, useCohorts, useUpdateUserCohort } from "@/hooks/api/useAdmin";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: usersResponse, isLoading } = useAdminUsers();
  const { data: cohortsData } = useCohorts();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const updateUserCohort = useUpdateUserCohort();
  const deleteUser = useDeleteUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
    role: "FELLOW" as "FELLOW" | "FACILITATOR" | "ADMIN",
    cohortId: "",
  });

  // Generate auto-password for Fellows and Facilitators
  const generatePassword = (name: string, role: "FELLOW" | "FACILITATOR" | "ADMIN"): string => {
    if (role === "ADMIN") {
      return ""; // Admins set their own password
    }
    
    // Get first name (first 4-5 letters) + current year
    const firstName = name.split(' ')[0] || name;
    const namePrefix = firstName.substring(0, Math.min(5, firstName.length)).toLowerCase();
    const year = new Date().getFullYear();
    
    return `${namePrefix}${year}`;
  };

  const handleAddUser = async () => {
    setIsSubmitting(true);
    try {
      // Generate password if not set (for Fellows/Facilitators)
      const passwordToUse = formData.password || generatePassword(formData.name, formData.role);
      
      // Validate password length
      if (!passwordToUse || passwordToUse.length < 6) {
        toast.error('Password must be at least 6 characters');
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
      // Update role if changed
      if (formData.role !== selectedUser.role) {
        await updateUserRole.mutateAsync({
          userId: selectedUser.id,
          role: formData.role,
        });
      }
      
      // Update cohort if changed (for Fellows and Facilitators)
      if ((formData.role === 'FELLOW' || formData.role === 'FACILITATOR') && formData.cohortId !== selectedUser.cohortId) {
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
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "FELLOW",
      cohortId: "",
    });
    setShowPassword(false);
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
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
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
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
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
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all platform users and their roles</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Export
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
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-700 uppercase tracking-wider">Points</th>
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
                        <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} font-medium`}>
                          {user.role}
                        </Badge>
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
                          {user.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className={`text-sm font-medium capitalize ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {user.isActive ? 'active' : 'inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {user.role === "FELLOW" ? (
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-500" />
                            <span className="text-sm text-gray-900 font-semibold">{user.statistics?.totalPoints ?? 0}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600">
                          {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openDeleteDialog(user)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
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
                </select>
              </div>
              
              {/* Cohort selector - Fellows and Facilitators */}
              {(formData.role === "FELLOW" || formData.role === "FACILITATOR") && (
                <div className="space-y-2">
                  <Label htmlFor="cohort" className="text-sm font-medium text-gray-900">
                    {formData.role === "FACILITATOR" ? "Cohort (Required)" : `Cohort ${formData.cohortId ? "" : "(Optional - will default to 2026)"}`}
                  </Label>
                  <select
                    id="cohort"
                    value={formData.cohortId}
                    onChange={(e) => setFormData({ ...formData, cohortId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      {formData.role === "FACILITATOR" ? "Select a cohort" : "Auto-assign to 2026 cohort"}
                    </option>
                    {cohorts.map((cohort: any) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort._count?.fellows || 0} members)
                      </option>
                    ))}
                  </select>
                  {formData.role === "FELLOW" && (
                    <p className="text-xs text-gray-500">
                      If no cohort is selected, the user will be automatically assigned to the "2026" cohort
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
                  (formData.role === "FACILITATOR" && !formData.cohortId) ||
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
                    const newRole = e.target.value as "FELLOW" | "FACILITATOR" | "ADMIN";
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
                </select>
              </div>
              
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
                disabled={!formData.name || !formData.email || (formData.role === "FACILITATOR" && !formData.cohortId) || isSubmitting}
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
      </div>
    </DashboardLayout>
  );
}
