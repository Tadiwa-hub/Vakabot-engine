import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, Users, Bot, MessageSquare, Edit2, Check, X, ShieldAlert, Gift } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { api } from '../services/api';

const ADMIN_UUIDS = [
  "user_3EyzCfcKC4ja4chzLVL7dSdl20g",
  "user_3EAVXOo4i0Tb1YWy0TaYzpQzMSn"
];

const AdminPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Guard check: Redirect non-admins instantly to dashboard
  useEffect(() => {
    if (user && !ADMIN_UUIDS.includes(user.id)) {
      console.warn("Non-admin user blocked from Admin Panel:", user.id);
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ plan: '', aiLimit: 25, aiUsageCount: 0, aiExpiryDate: '' });

  // 2. Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/api/admin/stats', user.id),
    enabled: !!user && ADMIN_UUIDS.includes(user.id),
  });

  // 3. Fetch all platform users
  const { data: usersList = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/api/admin/users', user.id),
    enabled: !!user && ADMIN_UUIDS.includes(user.id),
  });

  // 4. Update user mutation (Optimistic updates!)
  const { mutateAsync: updateUser, isPending: isSaving } = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/api/admin/users/${id}`, data, user.id),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
      const previous = queryClient.getQueryData(['admin', 'users']);
      queryClient.setQueryData(['admin', 'users'], old => old?.map(u => u.id === id ? { ...u, ...data } : u));
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'users'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const handleEditClick = (u) => {
    setEditingUserId(u.id);
    setEditForm({
      plan: u.plan || 'TRIAL',
      aiLimit: u.aiLimit || 25,
      aiUsageCount: u.aiUsageCount || 0,
      aiExpiryDate: u.aiExpiryDate ? u.aiExpiryDate.split('T')[0] : ''
    });
  };

  const handleSaveClick = async (id) => {
    try {
      await updateUser({
        id,
        data: {
          plan: editForm.plan,
          aiLimit: Number(editForm.aiLimit),
          aiUsageCount: Number(editForm.aiUsageCount),
          aiExpiryDate: editForm.aiExpiryDate ? new Date(editForm.aiExpiryDate).toISOString() : null
        }
      });
      setEditingUserId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Grant 100 free messages instantly
  const handleGrantFreeMessages = async (u) => {
    const confirmGrant = confirm(`Grant +100 free monthly AI messages to ${u.businessName || u.email}?`);
    if (!confirmGrant) return;

    try {
      await updateUser({
        id: u.id,
        data: {
          aiLimit: (u.aiLimit || 25) + 100,
          aiUsageCount: Math.max(0, (u.aiUsageCount || 0) - 100) // also credit back up to 100 messages!
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || !ADMIN_UUIDS.includes(user.id)) return null;

  const loading = statsLoading || usersLoading;

  return (
    <div className="space-y-6 animate-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-accent/10 rounded-lg text-accent border border-accent/20">
          <ShieldAlert size={20} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-[18px] sm:text-24 font-bold tracking-tight">Admin Control Center</h1>
          <p className="text-[12px] sm:text-[14px] text-text-secondary mt-0.5">Manage users, adjust usage limits, and monitor bot connectivity</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-text-light font-mono text-[13px]">
          <Loader2 className="animate-spin mr-2" size={16} /> Loading platform stats...
        </div>
      ) : (
        <>
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-[12px] text-text-secondary font-bold uppercase tracking-wider">Total Users</span>
                <Users size={16} className="text-primary" />
              </div>
              <div className="text-[18px] sm:text-[28px] font-semibold font-mono text-text-primary">{stats?.totalUsers || 0}</div>
            </Card>
            
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-[12px] text-text-secondary font-bold uppercase tracking-wider">Total Bots</span>
                <Bot size={16} className="text-success" />
              </div>
              <div className="text-[18px] sm:text-[28px] font-semibold font-mono text-text-primary">{stats?.totalBots || 0}</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-[12px] text-text-secondary font-bold uppercase tracking-wider">Connected Bots</span>
                <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              </div>
              <div className="text-[18px] sm:text-[28px] font-semibold font-mono text-text-primary">{stats?.activeBots || 0}</div>
            </Card>

            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-[12px] text-text-secondary font-bold uppercase tracking-wider">Messages Sent</span>
                <MessageSquare size={16} className="text-accent" />
              </div>
              <div className="text-[18px] sm:text-[28px] font-semibold font-mono text-text-primary">{stats?.totalMessages || 0}</div>
            </Card>
          </div>

          {/* Users Table */}
          <Card className="overflow-hidden">
            <div className="bg-surface px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-text-secondary">Platform Users</h2>
              <span className="text-[10px] font-bold font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                Database Live
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[950px] text-[13px]">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="px-5 py-3 label-sm">User details</th>
                    <th className="px-5 py-3 label-sm">Bot status</th>
                    <th className="px-5 py-3 label-sm text-center">Plan</th>
                    <th className="px-5 py-3 label-sm text-center">AI limit</th>
                    <th className="px-5 py-3 label-sm text-center">AI used</th>
                    <th className="px-5 py-3 label-sm">Expiry date</th>
                    <th className="px-5 py-3 label-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersList.map(u => {
                    const isEditing = editingUserId === u.id;
                    const daysLeft = u.aiExpiryDate ? Math.ceil((new Date(u.aiExpiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <tr key={u.id} className="hover:bg-surface/50 transition-default">
                        {/* User Details */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5 max-w-[200px]">
                            <div className="font-semibold text-text-primary truncate" title={u.businessName || 'Unnamed Business'}>
                              {u.businessName || 'No business setup yet'}
                            </div>
                            <div className="text-[11px] text-text-secondary truncate">{u.email}</div>
                            <div className="text-[10px] text-text-light font-mono truncate">{u.id}</div>
                          </div>
                        </td>

                        {/* Bot Status */}
                        <td className="px-5 py-3.5">
                          {u.bot ? (
                            <div className="space-y-0.5">
                              <div className="font-medium text-text-primary text-[12px] truncate max-w-[150px]">{u.bot.instanceName}</div>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${u.bot.status === 'CONNECTED' ? 'bg-success' : 'bg-text-light'}`} />
                                <span className="text-[11px] text-text-secondary uppercase font-semibold tracking-wider text-[10px]">{u.bot.status}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-text-light text-[11px] italic">No bot connected</span>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-3.5 text-center">
                          {isEditing ? (
                            <select 
                              className="bg-background border border-border rounded px-2 py-0.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                              value={editForm.plan}
                              onChange={(e) => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                            >
                              <option value="TRIAL">TRIAL</option>
                              <option value="STARTER">STARTER</option>
                              <option value="BUSINESS">BUSINESS</option>
                              <option value="PRO">PRO</option>
                            </select>
                          ) : (
                            <Badge variant={u.plan === 'TRIAL' ? 'secondary' : 'connected'}>
                              {u.plan || 'TRIAL'}
                            </Badge>
                          )}
                        </td>

                        {/* AI Limit */}
                        <td className="px-5 py-3.5 text-center font-mono">
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="bg-background border border-border rounded px-2 py-0.5 text-[12px] w-16 text-center focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                              value={editForm.aiLimit}
                              onChange={(e) => setEditForm(prev => ({ ...prev, aiLimit: e.target.value }))}
                            />
                          ) : (
                            <span className="font-semibold">{u.aiLimit || 25}</span>
                          )}
                        </td>

                        {/* AI Used */}
                        <td className="px-5 py-3.5 text-center font-mono text-text-secondary font-medium">
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="bg-background border border-border rounded px-2 py-0.5 text-[12px] w-16 text-center focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                              value={editForm.aiUsageCount}
                              onChange={(e) => setEditForm(prev => ({ ...prev, aiUsageCount: e.target.value }))}
                            />
                          ) : (
                            u.aiUsageCount || 0
                          )}
                        </td>

                        {/* Expiry Date */}
                        <td className="px-5 py-3.5 text-[12px]">
                          {isEditing ? (
                            <input 
                              type="date" 
                              className="bg-background border border-border rounded px-2 py-0.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                              value={editForm.aiExpiryDate}
                              onChange={(e) => setEditForm(prev => ({ ...prev, aiExpiryDate: e.target.value }))}
                            />
                          ) : u.aiExpiryDate ? (
                            <div className="space-y-0.5">
                              <div className="font-medium text-text-primary">
                                {new Date(u.aiExpiryDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div className={`text-[10px] font-bold ${daysLeft > 0 ? 'text-success' : 'text-danger'}`}>
                                {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-text-light italic">No expiry</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button 
                                  onClick={() => handleSaveClick(u.id)}
                                  className="p-1 bg-success/15 text-success hover:bg-success hover:text-white transition-default rounded"
                                  title="Save changes"
                                  disabled={isSaving}
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1 bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-default rounded dark:bg-zinc-800"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleGrantFreeMessages(u)}
                                  className="p-1.5 text-success hover:bg-success/15 transition-default rounded"
                                  title="Grant +100 Free AI Messages"
                                >
                                  <Gift size={14} />
                                </button>
                                <button 
                                  onClick={() => handleEditClick(u)}
                                  className="p-1.5 text-text-light hover:text-primary transition-default rounded hover:bg-surface-2"
                                  title="Edit user plan & limits"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminPage;
