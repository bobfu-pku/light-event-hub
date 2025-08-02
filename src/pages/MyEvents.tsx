import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Users, Settings, Eye, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  location: string;
  status: string;
  max_participants?: number;
  is_paid: boolean;
  price?: number;
  cover_image_url?: string;
}

interface Registration {
  id: string;
  event_id: string;
  status: string;
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  created_at: string;
  payment_amount?: number;
  verification_code?: string;
  events: {
    title: string;
    start_time: string;
    location: string;
    cover_image_url?: string;
  };
}

const MyEvents = () => {
  const { user, isOrganizer } = useAuth();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('organized');
  const [statusFilter, setStatusFilter] = useState('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchMyEvents();
      fetchMyRegistrations();
    }
  }, [user]);

  const fetchMyEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyEvents(data || []);
    } catch (error) {
      console.error('Error fetching my events:', error);
    }
  };

  const fetchMyRegistrations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events (
            title,
            start_time,
            location,
            cover_image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching my registrations:', error);
    } finally {
      setLoading(false);
    }
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
      payment_pending: '待付款',
      paid: '已报名',
      checked_in: '已签到'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'secondary',
      published: 'default',
      registration_open: 'default',
      registration_closed: 'secondary',
      ongoing: 'default',
      ended: 'secondary',
      cancelled: 'destructive',
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      payment_pending: 'secondary',
      paid: 'default',
      checked_in: 'default'
    };
    return colorMap[status] || 'secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取活动的实际状态（基于时间判断）
  const getActualEventStatus = (event: Event) => {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.start_time);
    endTime.setHours(endTime.getHours() + 2); // 假设活动持续2小时

    if (event.status === 'draft') return 'draft';
    if (endTime < now) return 'ended';
    return 'published';
  };

  // 排序活动
  const sortEvents = (events: Event[], filter: string) => {
    const eventsWithStatus = events.map(event => ({
      ...event,
      actualStatus: getActualEventStatus(event)
    }));

    if (filter === 'all') {
      // 全部活动：已发布（早到晚）> 草稿（早到晚）> 已结束（晚到早）
      return eventsWithStatus.sort((a, b) => {
        const statusOrder = { published: 1, draft: 2, ended: 3 };
        const statusA = statusOrder[a.actualStatus as keyof typeof statusOrder];
        const statusB = statusOrder[b.actualStatus as keyof typeof statusOrder];
        
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        // 相同状态内的排序
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        
        if (a.actualStatus === 'ended') {
          return timeB - timeA; // 已结束：晚到早
        } else {
          return timeA - timeB; // 已发布和草稿：早到晚
        }
      });
    } else {
      // 单一状态筛选
      return eventsWithStatus.sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        
        if (filter === 'ended') {
          return timeB - timeA; // 已结束：晚到早
        } else {
          return timeA - timeB; // 已发布和草稿：早到晚
        }
      });
    }
  };

  // 筛选活动
  const getFilteredEvents = () => {
    let filtered = myEvents;
    
    if (statusFilter !== 'all') {
      filtered = myEvents.filter(event => {
        const actualStatus = getActualEventStatus(event);
        return actualStatus === statusFilter;
      });
    }
    
    return sortEvents(filtered, statusFilter);
  };

  // 获取报名活动的实际状态（基于时间和报名状态判断）
  const getActualRegistrationStatus = (registration: Registration) => {
    const now = new Date();
    const startTime = new Date(registration.events.start_time);
    const endTime = new Date(registration.events.start_time);
    endTime.setHours(endTime.getHours() + 2); // 假设活动持续2小时

    // 如果活动已结束，状态为已结束
    if (endTime < now) return 'ended';
    
    // 否则返回原始报名状态
    return registration.status;
  };

  // 排序报名活动
  const sortRegistrations = (registrations: Registration[], filter: string) => {
    const registrationsWithStatus = registrations.map(registration => ({
      ...registration,
      actualStatus: getActualRegistrationStatus(registration)
    }));

    if (filter === 'all') {
      // 全部活动：已结束排最后（晚到早），其他活动排前面（早到晚）
      return registrationsWithStatus.sort((a, b) => {
        const aIsEnded = a.actualStatus === 'ended';
        const bIsEnded = b.actualStatus === 'ended';
        
        if (aIsEnded !== bIsEnded) {
          return aIsEnded ? 1 : -1; // 已结束排后面
        }
        
        const timeA = new Date(a.events.start_time).getTime();
        const timeB = new Date(b.events.start_time).getTime();
        
        if (aIsEnded && bIsEnded) {
          return timeB - timeA; // 已结束：晚到早
        } else {
          return timeA - timeB; // 其他：早到晚
        }
      });
    } else {
      // 单一状态筛选
      return registrationsWithStatus.sort((a, b) => {
        const timeA = new Date(a.events.start_time).getTime();
        const timeB = new Date(b.events.start_time).getTime();
        
        if (filter === 'ended') {
          return timeB - timeA; // 已结束：晚到早
        } else {
          return timeA - timeB; // 其他类型：早到晚
        }
      });
    }
  };

  // 筛选报名活动
  const getFilteredRegistrations = () => {
    let filtered = myRegistrations;
    
    if (registrationStatusFilter !== 'all') {
      filtered = myRegistrations.filter(registration => {
        const actualStatus = getActualRegistrationStatus(registration);
        return actualStatus === registrationStatusFilter;
      });
    }
    
    return sortRegistrations(filtered, registrationStatusFilter);
  };

  const filteredEvents = getFilteredEvents();
  const filteredRegistrations = getFilteredRegistrations();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Link to="/auth">
            <Button>去登录</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">我的活动</h1>
          <p className="text-muted-foreground mt-2">管理您主办和参与的活动</p>
        </div>
        {/* {isOrganizer ? (
          <Link to="/events/create">
            <Button className="bg-gradient-primary hover:opacity-90">
              创建新活动
            </Button>
          </Link>
        ) : (
          <Link to="/become-organizer">
            <Button className="bg-gradient-primary hover:opacity-90">
              成为主办方
            </Button>
          </Link>
        )} */}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="organized">我主办的 ({myEvents.length})</TabsTrigger>
          <TabsTrigger value="registered">我参与的 ({myRegistrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="organized" className="mt-6">
          {!isOrganizer ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">您还不是活动主办方，成为主办方后可以发布活动</p>
              <Link to="/become-organizer">
                <Button className="bg-gradient-primary hover:opacity-90">
                  成为主办方
                </Button>
              </Link>
            </div>
          ) : myEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">您还没有主办过任何活动</p>
              <Link to="/events/create">
                <Button className="bg-gradient-primary hover:opacity-90">
                  创建第一个活动
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="筛选活动状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部活动</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                    <SelectItem value="ended">已结束</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  共{filteredEvents.length}个活动
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="group hover:shadow-lg transition-all duration-300">
                  {event.cover_image_url ? (
                    <img
                      src={event.cover_image_url}
                      alt={event.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-subtle rounded-t-lg flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge 
                        variant={getStatusColor(getActualEventStatus(event)) as any}
                        className="text-xs"
                      >
                        {getStatusLabel(getActualEventStatus(event))}
                      </Badge>
                      {event.is_paid ? (
                        <Badge variant="outline" className="text-xs">
                          ¥{event.price}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                          免费
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                      {event.max_participants && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>限{event.max_participants}人</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link to={`/events/${event.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          查看
                        </Button>
                      </Link>
                      <Link to={`/events/${event.id}/manage`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Settings className="h-4 w-4 mr-2" />
                          管理
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="registered" className="mt-6">
          {myRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">您还没有报名任何活动</p>
              <Link to="/events">
                <Button className="bg-gradient-primary hover:opacity-90">
                  去发现活动
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={registrationStatusFilter} onValueChange={setRegistrationStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="筛选报名状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部活动</SelectItem>
                    <SelectItem value="pending">待审核</SelectItem>
                    <SelectItem value="payment_pending">待付款</SelectItem>
                    <SelectItem value="paid">已报名</SelectItem>
                    <SelectItem value="checked_in">已签到</SelectItem>
                    <SelectItem value="ended">已结束</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  共{filteredRegistrations.length}个活动
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRegistrations.map((registration) => (
                <Card key={registration.id} className="group hover:shadow-lg transition-all duration-300">
                  {registration.events.cover_image_url ? (
                    <img
                      src={registration.events.cover_image_url}
                      alt={registration.events.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-subtle rounded-t-lg flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge 
                        variant={getStatusColor(getActualRegistrationStatus(registration)) as any}
                        className="text-xs"
                      >
                        {getStatusLabel(getActualRegistrationStatus(registration))}
                      </Badge>
                      {registration.payment_amount && registration.payment_amount > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          ¥{registration.payment_amount}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                          免费
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {registration.events.title}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(registration.events.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{registration.events.location}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-4">
                      报名时间: {formatDate(registration.created_at)}
                    </div>
                    
                    {registration.verification_code && registration.status === 'paid' && (
                      <div className="p-2 mb-4 bg-green-50 border border-green-200 rounded text-center">
                        <p className="text-xs font-medium text-green-800">核验码</p>
                        <p className="text-sm font-mono font-bold text-green-900">
                          {registration.verification_code}
                        </p>
                      </div>
                    )}
                    
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/events/${registration.event_id}`}>
                        查看活动详情
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyEvents;