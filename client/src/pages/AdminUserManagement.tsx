import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  UserCircle,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'FELLOW' | 'FACILITATOR' | 'ADMIN';
  cohort?: {
    id: string;
    name: string;
  };
  totalPoints: number;
  createdAt: string;
  _count: {
    resourceProgress: number;
    discussions: number;
    quizSubmissions: number;
  };
}

interface Cohort {
  id: string;
  name: string;
}

export function AdminUserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchCohorts();
  }, [search, roleFilter, cohortFilter, pagination.page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (cohortFilter !== 'all') params.append('cohortId', cohortFilter);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCohorts = async () => {
    try {
      const response = await fetch('/api/cohorts', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCohorts(data);
      }
    } catch (error) {
      console.error('Failed to fetch cohorts:', error);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        toast({
          title: 'Role updated',
          description: 'User role has been successfully updated',
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: 'Failed to update role',
        description: 'An error occurred while updating the user role',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCohort = async (userId: string, cohortId: string | null) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/cohort`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ cohortId }),
      });

      if (response.ok) {
        toast({
          title: 'Cohort updated',
          description: 'User cohort assignment has been successfully updated',
        });
        fetchUsers();
        setEditingUser(null);
      }
    } catch (error) {
      toast({
        title: 'Failed to update cohort',
        description: 'An error occurred while updating the user cohort',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAssignCohort = async (cohortId: string | null) => {
    if (selectedUsers.size === 0) return;

    try {
      const response = await fetch('/api/admin/users/bulk/assign-cohort', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          cohortId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Bulk update successful',
          description: `${selectedUsers.size} user(s) assigned to cohort`,
        });
        setSelectedUsers(new Set());
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: 'Bulk update failed',
        description: 'An error occurred while updating users',
        variant: 'destructive',
      });
    }
  };

  const handleResetPoints = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-points`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Points reset',
          description: 'User points have been reset to zero',
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: 'Failed to reset points',
        description: 'An error occurred while resetting points',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: { bg: 'bg-red-100', text: 'text-red-800', icon: <Crown className="h-3 w-3" /> },
      FACILITATOR: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        icon: <Shield className="h-3 w-3" />,
      },
      FELLOW: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <UserCircle className="h-3 w-3" />,
      },
    };

    const style = styles[role as keyof typeof styles] || styles.FELLOW;

    return (
      <Badge variant="outline" className={cn('flex items-center gap-1', style.bg, style.text)}>
        {style.icon}
        {role}
      </Badge>
    );
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-gray-700" />
            User Management
          </CardTitle>
          <CardDescription>Manage users, roles, and cohort assignments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="FELLOW">Fellow</SelectItem>
                <SelectItem value="FACILITATOR">Facilitator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Cohorts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.size} user(s) selected
              </span>
              <div className="flex gap-2">
                <Select onValueChange={handleBulkAssignCohort}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Assign to Cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Remove from Cohort</SelectItem>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSelectedUsers(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Users Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(new Set(users.map((u) => u.id)));
                          } else {
                            setSelectedUsers(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.cohort ? (
                          <Badge variant="outline">{user.cohort.name}</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">No cohort</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-sm">{user.totalPoints}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                          <span>{user._count.resourceProgress} resources</span>
                          <span>•</span>
                          <span>{user._count.discussions} discussions</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total users)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user role, cohort assignment, or reset points
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">User</label>
                <p className="text-sm text-gray-600">
                  {editingUser.firstName} {editingUser.lastName} ({editingUser.email})
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <Select
                  value={editingUser.role}
                  onValueChange={(role) => handleUpdateRole(editingUser.id, role)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FELLOW">Fellow</SelectItem>
                    <SelectItem value="FACILITATOR">Facilitator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cohort</label>
                <Select
                  value={editingUser.cohort?.id || 'none'}
                  onValueChange={(cohortId) =>
                    handleUpdateCohort(editingUser.id, cohortId === 'none' ? null : cohortId)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Cohort</SelectItem>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleResetPoints(editingUser.id)}
                  className="w-full"
                >
                  Reset Points to Zero
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
