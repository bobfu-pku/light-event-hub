import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCircle, Clock, Calendar, UserPlus, MessageCircle, Shield, Star } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;

const NotificationCenter = () => {
  const { user, refreshNotifications } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('获取通知失败:', error);
      toast({
        title: "获取通知失败",
        description: "请刷新页面重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      ));
      
      // 刷新头像上的通知计数
      await refreshNotifications();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(notifications.map(notification => ({
        ...notification,
        is_read: true
      })));

      // 刷新头像上的通知计数
      await refreshNotifications();

      toast({
        title: "已全部标记为已读",
        description: "所有通知已标记为已读",
      });
    } catch (error) {
      console.error('全部标记已读失败:', error);
      toast({
        title: "操作失败",
        description: "请重试",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'registration_approved':
      case 'registration_rejected':
        return <CheckCircle className="h-4 w-4" />;
      case 'event_reminder':
        return <Calendar className="h-4 w-4" />;
      case 'event_registration':
        return <UserPlus className="h-4 w-4" />;
      case 'organizer_application':
      case 'organizer_approved':
      case 'organizer_rejected':
        return <Shield className="h-4 w-4" />;
      case 'discussion_reply':
        return <MessageCircle className="h-4 w-4" />;
      case 'event_review':
        return <Star className="h-4 w-4" />;
      case 'event_updated':
      case 'event_cancelled':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'registration_approved':
      case 'organizer_approved':
        return 'bg-green-500';
      case 'registration_rejected':
      case 'organizer_rejected':
        return 'bg-red-500';
      case 'event_reminder':
        return 'bg-blue-500';
      case 'event_registration':
        return 'bg-orange-500';
      case 'organizer_application':
        return 'bg-purple-500';
      case 'discussion_reply':
        return 'bg-cyan-500';
      case 'event_review':
        return 'bg-yellow-500';
      case 'event_updated':
        return 'bg-blue-500';
      case 'event_cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 3600 * 24));
    const hours = Math.floor(diff / (1000 * 3600));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {/* <Bell className="h-6 w-6" /> */}
            <h1 className="text-3xl font-bold gradient-text">通知中心</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} 条未读
              </Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              全部已读
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无通知</h3>
              <p className="text-muted-foreground text-center">
                当有新的活动报名、审核结果或活动提醒时，会在这里显示
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`cursor-pointer transition-all ${
                  !notification.is_read 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id);
                  }
                  
                  // 处理跳转逻辑
                  if (notification.type === 'organizer_approved' || notification.type === 'organizer_rejected') {
                    navigate('/become-organizer');
                  } else if (notification.type === 'organizer_application') {
                    navigate('/admin?tab=applications');
                  } else if (notification.type === 'event_registration' && notification.related_event_id) {
                    navigate(`/events/${notification.related_event_id}/manage`);
                  } else if (notification.type === 'discussion_reply' && notification.related_event_id) {
                    navigate(`/events/${notification.related_event_id}?tab=discussion`);
                  } else if (notification.type === 'event_review' && notification.related_event_id) {
                    navigate(`/events/${notification.related_event_id}?tab=reviews`);
                  } else if ((notification.type === 'registration_approved' || notification.type === 'registration_rejected') && notification.related_event_id) {
                    navigate(`/events/${notification.related_event_id}`);
                  } else if ((notification.type === 'event_updated' || notification.type === 'event_cancelled') && notification.related_event_id) {
                    navigate(`/events/${notification.related_event_id}`);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)} text-white flex-shrink-0`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(notification.created_at)}
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;