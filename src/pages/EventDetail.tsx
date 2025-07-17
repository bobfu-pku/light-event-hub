import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Phone, Mail, Star, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  contact_info?: string;
  organizer_id: string;
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
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
      if (user) {
        checkRegistration();
      }
    }
  }, [id, user]);

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
        .select('id, status, payment_amount')
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
      // Get user profile for registration info
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, contact_email, contact_phone')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: user.id,
          participant_name: profile?.nickname || 'Unknown',
          participant_email: profile?.contact_email || user.email,
          participant_phone: profile?.contact_phone || '',
          status: event.requires_approval ? 'pending' : 'approved',
          payment_amount: event.is_paid ? event.price : 0
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'paid' })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: "支付成功",
        description: "模拟支付完成，您已成功报名"
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
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canRegister = () => {
    if (!event || !user || registration) return false;
    
    const now = new Date();
    const registrationDeadline = event.registration_deadline ? new Date(event.registration_deadline) : new Date(event.start_time);
    
    return now < registrationDeadline;
  };

  const getRegistrationButtonText = () => {
    if (!user) return "登录后报名";
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
            className="w-full h-64 md:h-80 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-64 md:h-80 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Calendar className="h-20 w-20 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 rounded-lg"></div>
        <div className="absolute bottom-6 left-6 text-white">
          <Badge className="mb-2 bg-white/20 text-white border-white/30">
            {getEventTypeLabel(event.event_type)}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
          <p className="text-lg opacity-90">
            主办方: {event.profiles?.organizer_name || event.profiles?.nickname}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">活动详情</TabsTrigger>
              <TabsTrigger value="discussion">讨论区</TabsTrigger>
              <TabsTrigger value="reviews">活动回顾</TabsTrigger>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    活动讨论
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">讨论功能开发中...</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    活动回顾
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">暂无活动回顾</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registration Card */}
          <Card>
            <CardHeader>
              <CardTitle>活动报名</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.is_paid && (
                <div className="text-center p-4 bg-gradient-subtle rounded-lg">
                  <p className="text-2xl font-bold gradient-text">¥{event.price}</p>
                  <p className="text-sm text-muted-foreground">活动费用</p>
                </div>
              )}
              
              {registration?.status === 'payment_pending' && event.is_paid ? (
                <Button 
                  onClick={simulatePayment}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  模拟支付 ¥{event.price}
                </Button>
              ) : (
                <Button
                  onClick={handleRegister}
                  disabled={!canRegister() || !!registration || registering}
                  className="w-full bg-gradient-primary hover:opacity-90 disabled:opacity-50"
                >
                  {registering ? "报名中..." : getRegistrationButtonText()}
                </Button>
              )}
              
              {registration && (
                <div className="text-center text-sm text-muted-foreground">
                  报名状态: {getStatusLabel(registration.status)}
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
              
              {event.contact_info && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{event.contact_info}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;