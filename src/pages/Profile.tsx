import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Settings, Bell, Shield, Upload, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { timeUtils } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
interface Profile {
  id: string;
  user_id: string;
  nickname?: string;
  bio?: string;
  avatar_url?: string;
  contact_email?: string;
  contact_phone?: string;
  organizer_name?: string;
  organizer_description?: string;
  roles: string[];
}
const Profile = () => {
  const {
    user,
    refreshProfile
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointsTotals, setPointsTotals] = useState<{ participation_points: number; organizer_points: number; total_points: number } | null>(null);
  const [pointsDetail, setPointsDetail] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nickname: '',
    bio: '',
    avatar_url: '',
    contact_email: '',
    contact_phone: '',
    organizer_name: '',
    organizer_description: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPoints();
    }
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'organizer', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const fetchProfile = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (data) {
        setProfile(data);
        setFormData({
          nickname: data.nickname || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          organizer_name: data.organizer_name || '',
          organizer_description: data.organizer_description || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "错误",
        description: "无法加载用户资料",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPoints = async () => {
    try {
      const { data: totals, error: totalsError } = await supabase.rpc('get_my_points_totals' as any);
      if (totalsError) throw totalsError;
      if (Array.isArray(totals) && totals.length > 0) {
        setPointsTotals({
          participation_points: totals[0].participation_points,
          organizer_points: totals[0].organizer_points,
          total_points: totals[0].total_points,
        });
      } else {
        setPointsTotals({ participation_points: 0, organizer_points: 0, total_points: 0 });
      }

      const { data: detail, error: detailError } = await supabase
        .from('user_points')
        .select('kind, points, event_id, created_at, earned_reason')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (detailError) throw detailError;
      setPointsDetail(detail || []);
    } catch (e) {
      console.error('Error loading points', e);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "错误",
        description: "请选择图片文件",
        variant: "destructive"
      });
      return;
    }

    // 检查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "错误",
        description: "图片大小不能超过5MB",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    try {
      // 生成文件名
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // 删除旧头像
      if (formData.avatar_url) {
        // 从完整URL中提取存储路径
        const urlParts = formData.avatar_url.split('/avatars/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          await supabase.storage.from('avatars').remove([storagePath]);
        }
      }

      // 上传新头像
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(fileName, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;

      // 获取公开URL
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));
      
      // 立即保存头像到数据库
      const profileData = {
        user_id: user.id,
        nickname: formData.nickname.trim() || null,
        bio: formData.bio.trim() || null,
        avatar_url: publicUrl,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        organizer_name: formData.organizer_name.trim() || null,
        organizer_description: formData.organizer_description.trim() || null
      };
      
      const { error: saveError } = await supabase.from('profiles').upsert([profileData], {
        onConflict: 'user_id'
      });
      
      if (saveError) {
        console.error('Error saving avatar:', saveError);
        toast({
          title: "错误",
          description: "头像保存失败，请稍后重试",
          variant: "destructive"
        });
        return;
      }
      
      // 刷新本地和全局profile数据
      await fetchProfile();
      await refreshProfile();
      
      toast({
        title: "成功",
        description: "头像上传并保存成功"
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "错误",
        description: error.message || "上传失败，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  const handleSaveProfile = async () => {
    if (!user) return;
    
    // 如果是主办方，验证必填字段
    if (isOrganizer) {
      if (!formData.organizer_name.trim() || !formData.contact_email.trim()) {
        toast({
          title: "错误",
          description: "请填写所有主办方必填信息",
          variant: "destructive"
        });
        return;
      }
    }
    
    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        nickname: formData.nickname.trim() || null,
        bio: formData.bio.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
        contact_email: isOrganizer ? formData.contact_email.trim() : null,
        contact_phone: isOrganizer ? formData.contact_phone.trim() : null,
        organizer_name: formData.organizer_name.trim() || null,
        organizer_description: formData.organizer_description.trim() || null
      };
      const {
        error
      } = await supabase.from('profiles').upsert([profileData], {
        onConflict: 'user_id'
      });
      if (error) throw error;
      toast({
        title: "成功",
        description: "用户资料已更新"
      });
      await fetchProfile();
      await refreshProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "错误",
        description: error.message || "保存失败，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "错误",
        description: "请填写所有密码字段",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "错误",
        description: "新密码与确认密码不一致",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "错误",
        description: "新密码长度至少为6位",
        variant: "destructive"
      });
      return;
    }

    setChangingPassword(true);
    try {
      // First reauthenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      });

      if (signInError) {
        throw new Error('当前密码错误');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "成功",
        description: "密码修改成功"
      });

      // Clear password form and close dialog
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordDialog(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "错误",
        description: error.message || "密码修改失败，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setDeletingAccount(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the Edge Function to delete the user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "账户已删除",
        description: "您的账户已被永久删除，感谢您的使用"
      });

      // 清理所有认证状态，包括localStorage、sessionStorage等
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });

      // 清除所有其他缓存数据
      localStorage.clear();
      
      // 强制登出并跳转到首页
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // 忽略错误
      }
      
      // 强制跳转到首页并刷新页面，确保恢复未登录状态
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除账户时发生错误",
        variant: "destructive"
      });
    } finally {
      setDeletingAccount(false);
    }
  };
  if (!user) {
    return <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-muted-foreground">您需要登录后才能查看个人资料</p>
        </div>
      </div>;
  }
  if (loading) {
    return <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>;
  }
  const isOrganizer = profile?.roles?.includes('organizer');
  return <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">账户设置</h1>
        <p className="text-muted-foreground mt-2">管理您的个人资料和账户设置</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">个人资料</span>
          </TabsTrigger>
          <TabsTrigger value="organizer" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">主办方资料</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">设置</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <Label>头像</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={formData.avatar_url} alt="用户头像" />
                    <AvatarFallback className="text-2xl">
                      {formData.nickname ? formData.nickname.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : '用'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full md:w-auto">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "上传中..." : "上传头像"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      支持 JPG、PNG 格式，最大 5MB
                    </p>
                  </div>
                </div>
              </div>

                <div>
                  <Label htmlFor="nickname">昵称</Label>
                  <Input id="nickname" name="nickname" value={formData.nickname} onChange={handleInputChange} placeholder="输入您的昵称" />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">个人简介</Label>
                <Textarea id="bio" name="bio" value={formData.bio} onChange={handleInputChange} placeholder="简单介绍一下自己" rows={3} />
              </div>

              <div>
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input id="email" value={user.email || ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">
                    邮箱地址无法修改
                  </p>
                </div>

              <div className="pt-4">
                <Button onClick={handleSaveProfile} disabled={saving} className="bg-gradient-primary hover:opacity-90">
                  {saving ? "保存中..." : "保存更改"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>积分统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground">参与积分</div>
                  <div className="text-2xl font-bold">{pointsTotals?.participation_points ?? 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground">组织积分</div>
                  <div className="text-2xl font-bold">{pointsTotals?.organizer_points ?? 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground">总积分</div>
                  <div className="text-2xl font-bold">{pointsTotals?.total_points ?? 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                主办方信息
                {isOrganizer && <Badge className="bg-gradient-primary text-white">
                    已认证主办方
                  </Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isOrganizer ? (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">暂无主办方信息</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    您还不是主办方；成为主办方后，您可以创建和管理活动。
                  </p>
                  <Button onClick={() => navigate('/become-organizer')} className="bg-gradient-primary hover:opacity-90">
                    申请成为主办方
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="organizer_name">组织/机构名称 *</Label>
                    <Input id="organizer_name" name="organizer_name" value={formData.organizer_name} onChange={handleInputChange} placeholder="输入您的组织或机构名称" required />
                  </div>

                  <div>
                    <Label htmlFor="organizer_description">组织介绍</Label>
                    <Textarea id="organizer_description" name="organizer_description" value={formData.organizer_description} onChange={handleInputChange} placeholder="介绍您的组织背景、主要业务等" rows={4} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contact_email">联系邮箱 *</Label>
                      <Input id="contact_email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} placeholder="用于活动联系的邮箱" type="email" required />
                    </div>

                    <div>
                      <Label htmlFor="contact_phone">联系电话</Label>
                      <Input id="contact_phone" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} placeholder="用于活动联系的电话" />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSaveProfile} disabled={saving} className="bg-gradient-primary hover:opacity-90">
                      {saving ? "保存中..." : "更新主办方信息"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>我的积分明细</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {pointsDetail.length === 0 ? (
                  <div className="text-muted-foreground">暂无积分记录</div>
                ) : (
                  pointsDetail.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="text-muted-foreground">
                        {p.kind === 'participation' ? '参与积分' : '组织积分'}
                        {p.earned_reason ? ` · ${p.earned_reason}` : ''}
                      </div>
                      <div className="font-medium">+{p.points}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>通知设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-6">
                  {/* 管理员通知设置 */}
                  {profile?.roles?.includes('admin') && (
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h4 className="font-medium text-primary">管理员通知</h4>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">主办方申请提醒</h4>
                          <p className="text-sm text-muted-foreground">
                            提醒有人申请成为主办方
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  )}

                  {/* 主办方通知设置 */}
                  {isOrganizer && (
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h4 className="font-medium text-primary">主办方通知</h4>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">活动管理提醒</h4>
                          <p className="text-sm text-muted-foreground">
                            提醒有人报名、提醒审核报名
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  )}

                  {/* 普通用户通知设置 */}
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h4 className="font-medium text-primary">用户通知</h4>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">报名通知</h4>
                        <p className="text-sm text-muted-foreground">
                          接收报名审核结果和活动变更通知
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">活动提醒</h4>
                        <p className="text-sm text-muted-foreground">
                          在活动开始前1天收到提醒
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">讨论区互动</h4>
                        <p className="text-sm text-muted-foreground">
                          接收回复通知
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>账户设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">账户信息</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">用户ID:</span> {user.id}</p>
                    <p><span className="text-muted-foreground">注册邮箱:</span> {user.email}</p>
                    <p><span className="text-muted-foreground">注册时间:</span> {timeUtils.formatBeijingTimeShort(user.created_at || '')}</p>
                    <p><span className="text-muted-foreground">角色:</span> 
                      {profile?.roles?.map(role => (
                        <Badge key={role} variant="secondary" className="ml-2">
                          {role === 'user' ? '用户' : role === 'organizer' ? '主办方' : role}
                        </Badge>
                      ))}
                    </p>
                  </div>
                </div>

                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-primary hover:opacity-90">
                        修改密码
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>修改密码</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currentPassword">当前密码</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              name="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={handlePasswordInputChange}
                              placeholder="输入当前密码"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="newPassword">新密码</Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              name="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={handlePasswordInputChange}
                              placeholder="输入新密码（至少6位）"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="confirmPassword">确认新密码</Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordInputChange}
                              placeholder="再次输入新密码"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowPasswordDialog(false)}
                            className="flex-1"
                          >
                            取消
                          </Button>
                          <Button 
                            onClick={handleChangePassword} 
                            disabled={changingPassword}
                            className="bg-gradient-primary hover:opacity-90 flex-1"
                          >
                            {changingPassword ? "修改中..." : "修改密码"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2 text-destructive">危险操作</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    这些操作无法撤销，请谨慎操作。
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        删除账户
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除账户</AlertDialogTitle>
                        <AlertDialogDescription>
                          此操作无法撤销。删除账户将永久删除您的所有数据，包括个人资料、活动记录和相关信息。
                          <br />
                          <br />
                          确定要删除您的账户吗？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingAccount ? "删除中..." : "确认删除"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>;
};
export default Profile;