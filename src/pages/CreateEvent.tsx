import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { timeUtils } from '@/lib/utils';
import { createEventUpdateNotification } from '@/lib/notifications';
import { Mail, Phone, Settings } from 'lucide-react';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'conference',
    start_time: '',
    end_time: '',
    location_type: 'offline', // 'online' or 'offline'
    online_link: '',
    city: '',
    detailed_address: '',
    cover_image: null as File | null,
    max_participants: '',
    registration_deadline: '',
    requires_approval: false,
    is_paid: false,
    price: '',
    price_description: '',

  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      
      // 检查是否为编辑模式
      const eventId = searchParams.get('id');
      if (eventId) {
        setEditingEventId(eventId);
        setIsEditMode(true);
        loadEventForEdit(eventId);
      }
    }
  }, [user, searchParams]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('organizer_name, organizer_description, contact_email, contact_phone, roles')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const loadEventForEdit = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('organizer_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading event:', error);
        toast({
          title: "错误",
          description: "无法加载活动信息",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        // 填充表单数据
        setFormData({
          title: data.title || '',
          description: data.description || '',
          event_type: data.event_type || 'conference',
          start_time: data.start_time ? timeUtils.beijingISOToLocal(data.start_time) : '',
          end_time: data.end_time ? timeUtils.beijingISOToLocal(data.end_time) : '',
          location_type: data.location === '线上活动' ? 'online' : 'offline',
          online_link: data.location === '线上活动' ? (data.detailed_address || '') : '',
          city: data.location === '线上活动' ? '' : (data.location || ''),
          detailed_address: data.location === '线上活动' ? '' : (data.detailed_address || ''),
          cover_image: null,
          max_participants: data.max_participants ? data.max_participants.toString() : '',
          registration_deadline: data.registration_deadline ? timeUtils.beijingISOToLocal(data.registration_deadline) : '',
          requires_approval: data.requires_approval || false,
          is_paid: data.is_paid || false,
          price: data.price ? data.price.toString() : '',
          price_description: data.price_description || ''
        });

        // 保存现有的封面图片URL
        if (data.cover_image_url) {
          setExistingCoverImageUrl(data.cover_image_url);
        }
      }
    } catch (error) {
      console.error('Error loading draft event:', error);
      toast({
        title: "错误",
        description: "加载草稿失败",
        variant: "destructive"
      });
    }
  };

  const supportedCities = ['北京', '上海', '广州', '深圳', '杭州'];

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
      // 使用用户ID作为文件夹名，符合存储策略要求
      const filePath = `${user?.id}/event-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

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

    // Check if user is organizer and has complete contact info
    if (!userProfile || !userProfile.roles?.includes('organizer')) {
      toast({
        title: "错误",
        description: "只有主办方才能创建活动",
        variant: "destructive"
      });
      return;
    }

    if (!userProfile.organizer_name || !userProfile.contact_email) {
      toast({
        title: "错误",
        description: "请先完善主办方信息（组织名称、联系邮箱）",
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

    if (formData.location_type === 'offline' && (!formData.city || !formData.detailed_address.trim())) {
      toast({
        title: "错误",
        description: "请选择城市并填写详细地址",
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
      let coverImageUrl = existingCoverImageUrl; // 保留现有图片URL
      if (formData.cover_image) {
        const newImageUrl = await uploadCoverImage(formData.cover_image);
        if (newImageUrl) {
          coverImageUrl = newImageUrl;
        } else {
          if (saveAsDraft) {
            // 草稿模式：图片上传失败时给出提示但继续保存
            toast({
              title: "提示",
              description: "封面图片上传失败，已保存草稿但保留原有封面图片",
              variant: "default"
            });
          } else {
            // 发布模式：图片上传失败时阻止发布
            toast({
              title: "错误",
              description: "封面图片上传失败",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }
      }

      // Build location string based on type
      let location = '';
      let detailed_address = null;
      
      if (formData.location_type === 'online') {
        location = '线上活动';
        detailed_address = formData.online_link.trim();
      } else {
        location = formData.city;
        detailed_address = formData.detailed_address.trim();
      }

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_type: formData.event_type as 'conference' | 'training' | 'social' | 'sports' | 'performance' | 'workshop' | 'meetup' | 'other',
        start_time: timeUtils.localToBeijingISO(formData.start_time),
        end_time: timeUtils.localToBeijingISO(formData.end_time),
        location: location,
        detailed_address: detailed_address,
        cover_image_url: coverImageUrl,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        registration_deadline: formData.registration_deadline ? timeUtils.localToBeijingISO(formData.registration_deadline) : null,
        requires_approval: formData.requires_approval,
        is_paid: false, // Always false since payment is under development
        price: null,
        price_description: null,

        tags: null, // Removed tags functionality
        organizer_id: user.id,
        status: (saveAsDraft ? 'draft' : 'published') as 'draft' | 'published'
      };

      let data, error;
      
      if (isEditMode && editingEventId) {
        // 编辑模式：更新现有活动
        const { data: updateData, error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEventId)
          .select()
          .single();
        
        data = updateData;
        error = updateError;
      } else {
        // 创建模式：插入新活动
        const { data: insertData, error: insertError } = await supabase
          .from('events')
          .insert([eventData])
          .select()
          .single();
        
        data = insertData;
        error = insertError;
      }

      if (error) throw error;

      // 如果是编辑模式且已发布（不是草稿），发送更新通知给所有报名者
      if (isEditMode && editingEventId && !saveAsDraft) {
        try {
          const notificationCount = await createEventUpdateNotification(
            editingEventId,
            eventData.title,
            '主办方更新了活动信息，请查看最新详情'
          );
          console.log(`已向 ${notificationCount} 位报名者发送活动更新通知`);
        } catch (notificationError) {
          console.error('发送更新通知失败:', notificationError);
          // 不中断主流程，仅记录错误
        }
      }

      toast({
        title: "成功",
        description: isEditMode 
          ? (saveAsDraft ? "草稿已更新" : "活动已更新，已通知所有报名者") 
          : (saveAsDraft ? "活动已保存为草稿" : "活动已发布")
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
        <h1 className="text-3xl font-bold gradient-text">
          {isEditMode ? '编辑活动' : '创建活动'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isEditMode ? '修改活动信息并重新发布' : '填写活动信息并发布给所有用户'}
        </p>
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
              <Label>上传封面图片</Label>
              <div className="flex flex-col md:flex-row gap-4 mt-2">
                {/* Image placeholder/preview */}
                <div 
                  className="w-full md:w-80 aspect-video border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50 relative overflow-hidden cursor-pointer"
                  onClick={() => document.getElementById('cover_image')?.click()}
                >
                  {formData.cover_image || existingCoverImageUrl ? (
                    <>
                      <img
                        src={formData.cover_image 
                          ? URL.createObjectURL(formData.cover_image)
                          : existingCoverImageUrl || ''}
                        alt="封面预览"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('cover_image')?.click();
                          }}
                        >
                          替换
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, cover_image: null }));
                            setExistingCoverImageUrl(null);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl mb-1">📷</div>
                      <div className="text-xs text-muted-foreground">点击上传图片</div>
                      <div className="text-xs text-muted-foreground mt-1">建议比例 16:9</div>
                    </div>
                  )}
                </div>
                
                {/* Upload suggestions */}
                <div className="flex-1 text-sm text-muted-foreground">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="font-medium mb-2">活动海报建议：</div>
                    <div className="space-y-1">
                      <div>1、尺寸：1080*640px 或其他 16:9 比例，jpg或png格式，不超过4M</div>
                      <div>2、精美的图片，能有效提升报名率，并有机会被小编推荐</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hidden file input */}
              <Input
                id="cover_image"
                name="cover_image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
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
                <div className="relative">
                  <Input
                    id="start_time"
                    name="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                    className="[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer pr-12"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="end_time">结束时间 *</Label>
                <div className="relative">
                  <Input
                    id="end_time"
                    name="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                    className="[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer pr-12"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="location_type">活动方式 *</Label>
              <select
                id="location_type"
                name="location_type"
                value={formData.location_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                required
              >
                <option value="offline">线下活动</option>
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
                <div>
                  <Label htmlFor="city">城市 *</Label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    required
                  >
                    <option value="">请选择城市</option>
                    {supportedCities.map(city => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    暂不支持「北上广深杭」以外其他城市
                  </p>
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
              <div className="relative">
                <Input
                  id="registration_deadline"
                  name="registration_deadline"
                  type="datetime-local"
                  value={formData.registration_deadline}
                  onChange={handleInputChange}
                  className="[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer pr-12"
                />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
              </div>
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
            <CardTitle className="flex items-center justify-between">
              主办方联系信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userProfile && userProfile.roles?.includes('organizer') ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{userProfile.organizer_name || '未设置组织名称'}</p>
                  {userProfile.organizer_description && (
                    <p className="text-sm text-muted-foreground mt-1">{userProfile.organizer_description}</p>
                  )}
                </div>
                
                {userProfile.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{userProfile.contact_email}</span>
                  </div>
                )}
                
                {userProfile.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{userProfile.contact_phone}</span>
                  </div>
                )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/profile?tab=organizer')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                修改联系方式
              </Button>
                
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">您还不是主办方，无法创建活动。</p>
                <Button onClick={() => navigate('/become-organizer')} className="bg-gradient-primary hover:opacity-90">
                  申请成为主办方
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {isEditMode ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border">
              💡 活动更新会通知所有报名者
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/events/${editingEventId}/manage`)}
                disabled={loading}
                className="flex-1"
              >
                取消编辑
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {loading ? "更新中..." : "更新活动"}
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </form>
    </div>
  );
};

export default CreateEvent;