import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'conference',
    start_time: '',
    end_time: '',
    location: '',
    detailed_address: '',
    cover_image_url: '',
    max_participants: '',
    registration_deadline: '',
    requires_approval: false,
    is_paid: false,
    price: '',
    price_description: '',
    contact_info: '',
    tags: ''
  });

  const eventTypes = [
    { value: 'conference', label: '会议' },
    { value: 'training', label: '培训' },
    { value: 'social', label: '社交' },
    { value: 'sports', label: '运动' },
    { value: 'performance', label: '演出' },
    { value: 'workshop', label: '工作坊' },
    { value: 'meetup', label: '聚会' },
    { value: 'other', label: '其他' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "错误",
        description: "请先登录",
        variant: "destructive"
      });
      return;
    }

    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      toast({
        title: "错误",
        description: "请填写所有必填字段",
        variant: "destructive"
      });
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      toast({
        title: "错误",
        description: "请设置活动开始和结束时间",
        variant: "destructive"
      });
      return;
    }

    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      toast({
        title: "错误",
        description: "结束时间必须晚于开始时间",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_type: formData.event_type as 'conference' | 'training' | 'social' | 'sports' | 'performance' | 'workshop' | 'meetup' | 'other',
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location.trim(),
        detailed_address: formData.detailed_address.trim() || null,
        cover_image_url: formData.cover_image_url.trim() || null,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        registration_deadline: formData.registration_deadline || null,
        requires_approval: formData.requires_approval,
        is_paid: formData.is_paid,
        price: formData.is_paid && formData.price ? parseFloat(formData.price) : null,
        price_description: formData.is_paid ? formData.price_description.trim() || null : null,
        contact_info: formData.contact_info.trim() || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
        organizer_id: user.id,
        status: (saveAsDraft ? 'draft' : 'published') as 'draft' | 'published'
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "成功",
        description: saveAsDraft ? "活动已保存为草稿" : "活动已发布"
      });

      navigate(`/events/${data.id}`);
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: "错误",
        description: error.message || "创建活动失败，请稍后重试",
        variant: "destructive"
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
          <p className="text-muted-foreground mb-6">您需要登录后才能创建活动</p>
          <Button onClick={() => navigate('/auth')}>去登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">创建活动</h1>
        <p className="text-muted-foreground mt-2">填写活动信息并发布给所有用户</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">活动标题 *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="输入活动标题"
                required
              />
            </div>

            <div>
              <Label htmlFor="event_type">活动类型 *</Label>
              <select
                id="event_type"
                name="event_type"
                value={formData.event_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                required
              >
                {eventTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description">活动描述 *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="详细描述您的活动内容、日程安排、注意事项等"
                rows={6}
                required
              />
            </div>

            <div>
              <Label htmlFor="cover_image_url">封面图片链接</Label>
              <Input
                id="cover_image_url"
                name="cover_image_url"
                value={formData.cover_image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>

            <div>
              <Label htmlFor="tags">活动标签</Label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="用逗号分隔，如：技术,互联网,创业"
              />
            </div>
          </CardContent>
        </Card>

        {/* Time and Location */}
        <Card>
          <CardHeader>
            <CardTitle>时间地点</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">开始时间 *</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time">结束时间 *</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">活动地点 *</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="城市或场馆名称"
                required
              />
            </div>

            <div>
              <Label htmlFor="detailed_address">详细地址</Label>
              <Input
                id="detailed_address"
                name="detailed_address"
                value={formData.detailed_address}
                onChange={handleInputChange}
                placeholder="具体地址，方便参与者找到"
              />
            </div>
          </CardContent>
        </Card>

        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>报名设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="registration_deadline">报名截止时间</Label>
              <Input
                id="registration_deadline"
                name="registration_deadline"
                type="datetime-local"
                value={formData.registration_deadline}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                留空则默认为活动开始时间
              </p>
            </div>

            <div>
              <Label htmlFor="max_participants">最大参与人数</Label>
              <Input
                id="max_participants"
                name="max_participants"
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={handleInputChange}
                placeholder="留空表示不限制人数"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requires_approval"
                checked={formData.requires_approval}
                onCheckedChange={(checked) => handleSwitchChange('requires_approval', checked)}
              />
              <Label htmlFor="requires_approval">需要审核报名</Label>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>费用设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_paid"
                checked={formData.is_paid}
                onCheckedChange={(checked) => handleSwitchChange('is_paid', checked)}
              />
              <Label htmlFor="is_paid">收费活动</Label>
            </div>

            {formData.is_paid && (
              <>
                <div>
                  <Label htmlFor="price">活动费用 (元) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required={formData.is_paid}
                  />
                </div>

                <div>
                  <Label htmlFor="price_description">费用说明</Label>
                  <Textarea
                    id="price_description"
                    name="price_description"
                    value={formData.price_description}
                    onChange={handleInputChange}
                    placeholder="说明费用包含的内容，如材料费、餐费等"
                    rows={3}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>联系信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="contact_info">联系方式</Label>
              <Textarea
                id="contact_info"
                name="contact_info"
                value={formData.contact_info}
                onChange={handleInputChange}
                placeholder="提供参与者可以联系您的方式，如微信群、QQ群、电话等"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "保存中..." : "保存为草稿"}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            {loading ? "发布中..." : "立即发布"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;