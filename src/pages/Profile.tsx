import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { User, Settings, Bell, Shield, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
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
        const oldPath = formData.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // 上传新头像
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 获取公开URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));

      toast({
        title: "成功",
        description: "头像上传成功"
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

    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        nickname: formData.nickname.trim() || null,
        bio: formData.bio.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        organizer_name: formData.organizer_name.trim() || null,
        organizer_description: formData.organizer_description.trim() || null
      };

      const { error } = await supabase
        .from('profiles')
        .upsert([profileData], { 
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "成功",
        description: "用户资料已更新"
      });

      fetchProfile();
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


  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-muted-foreground">您需要登录后才能查看个人资料</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const isOrganizer = profile?.roles?.includes('organizer');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">个人中心</h1>
        <p className="text-muted-foreground mt-2">管理您的个人资料和账户设置</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">个人资料</span>
          </TabsTrigger>
          <TabsTrigger value="organizer" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">主办方</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">通知</span>
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
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    value={user.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    邮箱地址无法修改
                  </p>
                </div>

                <div>
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    placeholder="输入您的昵称"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">个人简介</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="简单介绍一下自己"
                  rows={3}
                />
              </div>

              <div>
                <Label>头像</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage 
                      src={formData.avatar_url} 
                      alt="用户头像" 
                    />
                    <AvatarFallback className="text-2xl">
                      {formData.nickname ? formData.nickname.charAt(0).toUpperCase() : 
                       user.email ? user.email.charAt(0).toUpperCase() : '用'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full md:w-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "上传中..." : "上传头像"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      支持 JPG、PNG 格式，最大 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">联系邮箱</Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                    placeholder="用于活动联系的邮箱"
                    type="email"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_phone">联系电话</Label>
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                    placeholder="用于活动联系的电话"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  {saving ? "保存中..." : "保存更改"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                主办方信息
                {isOrganizer && (
                  <Badge className="bg-gradient-primary text-white">
                    已认证主办方
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isOrganizer && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">申请成为主办方</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    成为主办方后，您可以创建和管理活动，审核报名，管理现场核验等。
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="organizer_name">组织/机构名称 *</Label>
                <Input
                  id="organizer_name"
                  name="organizer_name"
                  value={formData.organizer_name}
                  onChange={handleInputChange}
                  placeholder="输入您的组织或机构名称"
                />
              </div>

              <div>
                <Label htmlFor="organizer_description">组织介绍</Label>
                <Textarea
                  id="organizer_description"
                  name="organizer_description"
                  value={formData.organizer_description}
                  onChange={handleInputChange}
                  placeholder="介绍您的组织背景、主要业务等"
                  rows={4}
                />
              </div>

              <div className="pt-4">
                {isOrganizer ? (
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {saving ? "保存中..." : "更新主办方信息"}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/become-organizer')}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    申请成为主办方
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">活动报名通知</h4>
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
                      在活动开始前收到提醒
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">讨论区互动</h4>
                    <p className="text-sm text-muted-foreground">
                      接收@我和回复通知
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">活动推荐</h4>
                    <p className="text-sm text-muted-foreground">
                      根据兴趣推荐相关活动
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>账户设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">账户信息</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">用户ID:</span> {user.id}</p>
                    <p><span className="text-muted-foreground">注册时间:</span> {new Date(user.created_at || '').toLocaleDateString('zh-CN')}</p>
                    <p><span className="text-muted-foreground">角色:</span> 
                      {profile?.roles?.map(role => (
                        <Badge key={role} variant="secondary" className="ml-2">
                          {role === 'user' ? '用户' : role === 'organizer' ? '主办方' : role}
                        </Badge>
                      ))}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2 text-destructive">危险操作</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    这些操作无法撤销，请谨慎操作。
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" disabled>
                      更改密码
                    </Button>
                    <Button variant="destructive" size="sm" disabled>
                      删除账户
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * 这些功能正在开发中
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;