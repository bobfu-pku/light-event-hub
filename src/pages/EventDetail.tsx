import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Phone, Mail, Star, MessageSquare, CreditCard, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { timeUtils } from '@/lib/utils';
import EventDiscussion from '@/components/EventDiscussion';
import EventReviews from '@/components/EventReviews';
import { createEventRegistrationNotification } from '@/lib/notifications';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  detailed_address?: string;
  cover_image_url?: string;
  max_participants?: number;
  price?: number;
  is_paid: boolean;
  requires_approval: boolean;
  registration_deadline?: string;
  organizer_id: string;
  status: string;
  profiles: {
    organizer_name?: string;
    nickname?: string;
    organizer_description?: string;
    contact_email?: string;
    contact_phone?: string;
  };
}

interface Registration {
  id: string;
  status: string;
  payment_amount?: number;
  verification_code?: string;
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (id) {
      fetchEvent();
      if (user) {
        checkRegistration();
      }
    }
  }, [id, user]);

  // 处理URL参数设置默认tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['details', 'discussion', 'reviews'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_organizer_id_fkey (
            organizer_name,
            nickname,
            organizer_description,
            contact_email,
            contact_phone
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: "错误",
        description: "无法加载活动信息",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('id, status, payment_amount, verification_code')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setRegistration(data);
      }
    } catch (error) {
      // No registration found, which is fine
    }
  };

  const handleRegister = async () => {
    if (!user || !event) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能报名活动",
        variant: "destructive"
      });
      return;
    }

    setRegistering(true);
    try {
      // 检查人数限制
      if (event.max_participants && event.max_participants > 0) {
        // 对于不需要审核的活动，检查已有效报名的人数（approved, paid, checked_in）
        // 对于需要审核的活动，可以暂时允许pending状态，由管理员控制
        const statusesToCheck = event.requires_approval 
          ? ['approved', 'paid', 'checked_in'] as const  // 需要审核的活动，只计算已通过的人数
          : ['approved', 'payment_pending', 'paid', 'checked_in'] as const; // 不需要审核的活动，计算所有有效状态

        const { data: existingRegistrations, error: countError } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('event_id', event.id)
          .in('status', statusesToCheck);

        if (countError) throw countError;

        const currentParticipants = existingRegistrations?.length || 0;
        
        if (currentParticipants >= event.max_participants) {
          toast({
            title: "报名已满",
            description: `该活动限制${event.max_participants}人，目前已有${currentParticipants}人报名`,
            variant: "destructive"
          });
          return;
        }
      }

      // Get user profile for registration info
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, contact_email, contact_phone')
        .eq('user_id', user.id)
        .single();

      // 对于免费活动且不需要审核的情况，直接生成核验码
      let verificationCode = null;
      if (!event.requires_approval && !event.is_paid) {
        verificationCode = generateVerificationCode();
      }

      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: user.id,
          participant_name: profile?.nickname || 'Unknown',
          participant_email: profile?.contact_email || user.email,
          participant_phone: profile?.contact_phone || '',
          status: event.requires_approval ? 'pending' : (event.is_paid ? 'payment_pending' : 'approved'),
          payment_amount: event.is_paid ? event.price : 0,
          verification_code: verificationCode
        });

      if (error) throw error;

      // 创建报名通知发送给主办方
      try {
        await createEventRegistrationNotification(
          event.organizer_id,
          event.title,
          profile?.nickname || 'Unknown',
          event.id
        );
      } catch (notificationError) {
        console.error('创建通知失败:', notificationError);
      }

      toast({
        title: "报名成功",
        description: event.requires_approval ? "请等待主办方审核" : "您已成功报名此活动"
      });

      checkRegistration();
    } catch (error: any) {
      console.error('Error registering:', error);
      toast({
        title: "报名失败",
        description: error.message || "请稍后重试",
        variant: "destructive"
      });
    } finally {
      setRegistering(false);
    }
  };

  const simulatePayment = async () => {
    if (!registration || !event) return;

    try {
      // Generate verification code and update status to paid
      const verificationCode = generateVerificationCode();
      const { error } = await supabase
        .from('event_registrations')
        .update({ 
          status: 'paid',
          verification_code: verificationCode
        })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: "支付成功",
        description: `模拟支付完成！您的核验码是: ${verificationCode}`
      });

      checkRegistration();
    } catch (error: any) {
      toast({
        title: "支付失败",
        description: error.message || "请稍后重试",
        variant: "destructive"
      });
    }
  };

  const generateVerificationCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const getEventTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      conference: '会议',
      training: '培训',
      social: '社交',
      sports: '运动',
      performance: '演出',
      workshop: '工作坊',
      meetup: '聚会',
      other: '其他'
    };
    return typeMap[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      payment_pending: '待支付',
      paid: '已支付',
      checked_in: '已签到',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    return timeUtils.formatBeijingTime(dateString);
  };

  const canRegister = () => {
    if (!event || !user || registration) return false;
    
    // 草稿状态下无法报名
    if (event.status === 'draft') return false;
    
    const now = new Date();
    const registrationDeadline = event.registration_deadline ? new Date(event.registration_deadline) : new Date(event.start_time);
    
    return now < registrationDeadline;
  };

  const getRegistrationButtonText = () => {
    if (!user) return "登录后报名";
    if (event?.status === 'draft') return "草稿无法报名";
    if (registration) {
      if (registration.status === 'payment_pending') return "待支付";
      return `已报名 (${getStatusLabel(registration.status)})`;
    }
    if (!canRegister()) return "报名已截止";
    return "立即报名";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-64 bg-muted rounded-lg mb-6"></div>
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">活动未找到</h1>
          <Link to="/events">
            <Button>返回活动列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="relative mb-8">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full aspect-video object-cover rounded-lg"
          />
        ) : (
          <div className="w-full aspect-video bg-gradient-primary rounded-lg flex items-center justify-center">
            <Calendar className="h-20 w-20 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 rounded-lg"></div>
        <div className="absolute bottom-6 left-6 text-white">
          {event.status === 'draft' && (
            <div className="mb-2">
              <Badge className="bg-orange-500/80 text-white border-orange-300">
                草稿
              </Badge>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
          <p className="text-lg opacity-90">
            主办方: {event.profiles?.organizer_name || event.profiles?.nickname}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">活动详情</TabsTrigger>
              <TabsTrigger value="discussion">讨论区</TabsTrigger>
              <TabsTrigger value="reviews">活动评价</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>活动介绍</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{event.description}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="discussion" className="mt-6">
              {event.status === 'draft' ? (
                <Card>
                  <CardContent className="text-center p-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">草稿活动讨论区暂不可用</h3>

                  </CardContent>
                </Card>
              ) : (
                <EventDiscussion eventId={event.id} organizerId={event.organizer_id} />
              )}
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              {event.status === 'draft' ? (
                <Card>
                  <CardContent className="text-center p-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">草稿活动评价功能暂不可用</h3>

                  </CardContent>
                </Card>
              ) : (
                <EventReviews eventId={event.id} eventEndTime={event.end_time} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - 仅在详情页显示 */}
        {activeTab === 'details' && (
          <div className="space-y-6">
          {/* Registration Card */}
          <Card>
            <CardHeader>
              <CardTitle>活动报名</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.is_paid && event.status !== 'draft' && (
                <div className="text-center p-4 bg-gradient-subtle rounded-lg">
                  <p className="text-2xl font-bold gradient-text">¥{event.price}</p>
                  <p className="text-sm text-muted-foreground">活动费用</p>
                </div>
              )}
              
              {registration ? (
                <>
                  {registration.status === 'payment_pending' && event.is_paid ? (
                    <Button 
                      onClick={simulatePayment}
                      className="w-full bg-gradient-primary hover:opacity-90"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      模拟支付 ¥{event.price}
                    </Button>
                  ) : registration.status === 'pending' ? (
                    <Button disabled className="w-full opacity-50">
                      <Clock className="h-4 w-4 mr-2" />
                      等待审核中...
                    </Button>
                  ) : registration.status === 'paid' ? (
                    <Button disabled className="w-full bg-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      已支付完成
                    </Button>
                  ) : registration.status === 'approved' ? (
                    <Button disabled className="w-full bg-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      报名成功
                    </Button>
                  ) : registration.status === 'checked_in' ? (
                    <Button disabled className="w-full bg-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      已签到
                    </Button>
                  ) : (
                    <Button disabled className="w-full opacity-50">
                      {getRegistrationButtonText()}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={handleRegister}
                  disabled={!canRegister() || registering}
                  className="w-full bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                >
                  {registering ? "报名中..." : getRegistrationButtonText()}
                </Button>
              )}
              
              {registration && (
                <div className="text-center text-sm text-muted-foreground space-y-2">
                  <div>报名状态: {getStatusLabel(registration.status)}</div>
                  {registration.verification_code && ['approved', 'paid', 'checked_in'].includes(registration.status) && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">签到核验码</p>
                      <p className="text-lg font-mono font-bold text-green-900">
                        {registration.verification_code}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        请在活动现场出示此核验码进行签到
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {event.requires_approval && (
                <p className="text-xs text-muted-foreground text-center">
                  * 此活动需要主办方审核
                </p>
              )}
            </CardContent>
          </Card>

          {/* Event Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>活动信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">开始时间</p>
                  <p className="text-sm text-muted-foreground">{formatDate(event.start_time)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">结束时间</p>
                  <p className="text-sm text-muted-foreground">{formatDate(event.end_time)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">活动地点</p>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                  {event.detailed_address && (
                    <p className="text-xs text-muted-foreground mt-1">{event.detailed_address}</p>
                  )}
                </div>
              </div>
              
              {event.max_participants && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">参与人数</p>
                    <p className="text-sm text-muted-foreground">限制 {event.max_participants} 人</p>
                  </div>
                </div>
              )}
              
              {event.registration_deadline && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">报名截止</p>
                    <p className="text-sm text-muted-foreground">{formatDate(event.registration_deadline)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organizer Card */}
          <Card>
            <CardHeader>
              <CardTitle>主办方信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{event.profiles?.organizer_name || event.profiles?.nickname}</p>
              
              {event.profiles?.organizer_description && (
                <p className="text-sm text-muted-foreground">{event.profiles.organizer_description}</p>
              )}
              
              {event.profiles?.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{event.profiles.contact_email}</span>
                </div>
              )}
              
              {event.profiles?.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{event.profiles.contact_phone}</span>
                </div>
              )}

            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;