import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Building, User } from 'lucide-react';

const BecomeOrganizer = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizerName: '',
    organizerDescription: '',
    contactEmail: profile?.contact_email || '',
    contactPhone: profile?.contact_phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 更新用户角色为包含 organizer
      const { error } = await supabase
        .from('profiles')
        .update({
          roles: ['user', 'organizer'],
          organizer_name: formData.organizerName,
          organizer_description: formData.organizerDescription,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "申请成功",
        description: "您已成功成为主办方！",
      });

      // 刷新页面以更新角色状态
      window.location.href = '/';
    } catch (error) {
      console.error('Error becoming organizer:', error);
      toast({
        title: "申请失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Button onClick={() => navigate('/auth')}>去登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-full">
              <Building className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">成为主办方</h1>
          <p className="text-muted-foreground">
            成为主办方后，您可以创建和管理自己的活动
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              主办方信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organizerName">主办方名称 *</Label>
                <Input
                  id="organizerName"
                  placeholder="请输入您的组织或个人名称"
                  value={formData.organizerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizerName: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizerDescription">主办方介绍</Label>
                <Textarea
                  id="organizerDescription"
                  placeholder="简单介绍一下您的组织或个人背景"
                  value={formData.organizerDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizerDescription: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">联系邮箱 *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">联系电话</Label>
                  <Input
                    id="contactPhone"
                    placeholder="请输入您的联系电话"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">主办方权限</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 创建和发布活动</li>
                  <li>• 管理活动报名</li>
                  <li>• 审核参与者</li>
                  <li>• 现场核验签到</li>
                  <li>• 查看活动数据统计</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.organizerName || !formData.contactEmail}
                  className="flex-1"
                >
                  {loading ? '申请中...' : '申请成为主办方'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomeOrganizer;