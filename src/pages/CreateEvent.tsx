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
    location_type: 'offline', // 'online' or 'offline'
    online_link: '',
    province: '',
    city: '',
    district: '',
    detailed_address: '',
    cover_image: null as File | null,
    max_participants: '',
    registration_deadline: '',
    requires_approval: false,
    is_paid: false,
    price: '',
    price_description: '',
    contact_info: ''
  });

  const provinces = [
    '北京市', '天津市', '上海市', '重庆市', '河北省', '山西省', '辽宁省', '吉林省',
    '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省',
    '湖北省', '湖南省', '广东省', '海南省', '四川省', '贵州省', '云南省', '陕西省',
    '甘肃省', '青海省', '台湾省', '内蒙古自治区', '广西壮族自治区', '西藏自治区',
    '宁夏回族自治区', '新疆维吾尔自治区', '香港特别行政区', '澳门特别行政区'
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        cover_image: file
      }));
    }
  };

  const uploadCoverImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `event-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
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
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "错误",
        description: "请填写所有必填字段",
        variant: "destructive"
      });
      return;
    }

    if (formData.location_type === 'online' && !formData.online_link.trim()) {
      toast({
        title: "错误",
        description: "请填写线上活动链接",
        variant: "destructive"
      });
      return;
    }

    if (formData.location_type === 'offline' && (!formData.province || !formData.city || !formData.detailed_address.trim())) {
      toast({
        title: "错误",
        description: "请完整填写线下活动地址信息",
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
      // Upload cover image if provided
      let coverImageUrl = null;
      if (formData.cover_image) {
        coverImageUrl = await uploadCoverImage(formData.cover_image);
        if (!coverImageUrl) {
          toast({
            title: "错误",
            description: "封面图片上传失败",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      // Build location string based on type
      let location = '';
      let detailed_address = null;
      
      if (formData.location_type === 'online') {
        location = '线上活动';
        detailed_address = formData.online_link.trim();
      } else {
        location = `${formData.province}${formData.city}${formData.district || ''}`;
        detailed_address = formData.detailed_address.trim();
      }

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_type: formData.event_type as 'conference' | 'training' | 'social' | 'sports' | 'performance' | 'workshop' | 'meetup' | 'other',
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: location,
        detailed_address: detailed_address,
        cover_image_url: coverImageUrl,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        registration_deadline: formData.registration_deadline || null,
        requires_approval: formData.requires_approval,
        is_paid: false, // Always false since payment is under development
        price: null,
        price_description: null,
        contact_info: formData.contact_info.trim() || null,
        tags: null, // Removed tags functionality
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
              <Label htmlFor="cover_image">上传封面图片</Label>
              <Input
                id="cover_image"
                name="cover_image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {formData.cover_image && (
                <p className="text-xs text-muted-foreground mt-1">
                  已选择: {formData.cover_image.name}
                </p>
              )}
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
              <Label htmlFor="location_type">活动地点 *</Label>
              <select
                id="location_type"
                name="location_type"
                value={formData.location_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                required
              >
                <option value="offline">线下场地举办</option>
                <option value="online">线上活动</option>
              </select>
            </div>

            {formData.location_type === 'online' && (
              <div>
                <Label htmlFor="online_link">线上活动链接 *</Label>
                <Input
                  id="online_link"
                  name="online_link"
                  value={formData.online_link}
                  onChange={handleInputChange}
                  placeholder="请输入会议链接或直播链接"
                  required
                />
              </div>
            )}

            {formData.location_type === 'offline' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="province">省份 *</Label>
                    <select
                      id="province"
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      required
                    >
                      <option value="">请选择省份</option>
                      {provinces.map(province => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="city">城市 *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="请输入城市"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="district">区县</Label>
                    <Input
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="请输入区县"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="detailed_address">详细地址 *</Label>
                  <Input
                    id="detailed_address"
                    name="detailed_address"
                    value={formData.detailed_address}
                    onChange={handleInputChange}
                    placeholder="具体地址，方便参与者找到"
                    required
                  />
                </div>
              </>
            )}
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
                checked={false}
                disabled={true}
              />
              <Label htmlFor="is_paid" className="text-muted-foreground">收费活动</Label>
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              💡 支付功能开发中，暂时只支持免费活动
            </div>
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