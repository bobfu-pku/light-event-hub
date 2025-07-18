import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, ArrowLeft, Edit, Trash2, Eye } from 'lucide-react';
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
  status: string;
  max_participants?: number;
  is_paid: boolean;
  price?: number;
  cover_image_url?: string;
  organizer_id: string;
}

interface Registration {
  id: string;
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  status: string;
  created_at: string;
  payment_amount?: number;
}

const ManageEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchEvent();
      fetchRegistrations();
    }
  }, [id, user]);

  const fetchEvent = async () => {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('organizer_id', user.id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: '错误',
        description: '无法加载活动信息',
        variant: 'destructive'
      });
      navigate('/my-events');
    }
  };

  const fetchRegistrations = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || !confirm('确定要删除这个活动吗？此操作不可撤销。')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: '成功',
        description: '活动已删除'
      });
      navigate('/my-events');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: '错误',
        description: '删除活动失败',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      published: '已发布',
      registration_open: '报名中',
      registration_closed: '报名截止',
      ongoing: '进行中',
      ended: '已结束',
      cancelled: '已取消',
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      payment_pending: '待支付',
      paid: '已支付',
      checked_in: '已签到'
    };
    return statusMap[status] || status;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">活动不存在</h1>
          <Button onClick={() => navigate('/my-events')}>
            返回我的活动
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/my-events')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <h1 className="text-3xl font-bold gradient-text">管理活动</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl">{event.title}</CardTitle>
              <Badge>{getStatusLabel(event.status)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{event.description}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.start_time)} - {formatDate(event.end_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
              {event.max_participants && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>限{event.max_participants}人</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              预览活动
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/events/${event.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              编辑活动
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteEvent}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除活动
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="registrations" className="w-full">
        <TabsList>
          <TabsTrigger value="registrations">报名管理 ({registrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="mt-6">
          {registrations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无报名信息</p>
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map((registration) => (
                <Card key={registration.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{registration.participant_name}</h3>
                        <p className="text-sm text-muted-foreground">{registration.participant_email}</p>
                        <p className="text-sm text-muted-foreground">{registration.participant_phone}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          报名时间: {formatDate(registration.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge>{getStatusLabel(registration.status)}</Badge>
                        {registration.payment_amount && registration.payment_amount > 0 && (
                          <p className="text-sm mt-2">¥{registration.payment_amount}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageEvent;