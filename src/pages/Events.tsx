import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  cover_image_url?: string;
  max_participants?: number;
  price?: number;
  is_paid: boolean;
  status: string;
  organizer_id: string;
  profiles: {
    organizer_name?: string;
    nickname?: string;
  };
}

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const eventTypes = [
    'conference', 'training', 'social', 'sports', 
    'performance', 'workshop', 'meetup', 'other'
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_organizer_id_fkey (
            organizer_name,
            nickname
          )
        `)
        .eq('status', 'published')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || event.event_type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-muted rounded"></div>
                  <div className="h-6 w-20 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">发现活动</h1>
          <p className="text-muted-foreground mt-2">找到您感兴趣的活动并立即报名</p>
        </div>
        {user && (
          <Link to="/events/create">
            <Button className="bg-gradient-primary hover:opacity-90">
              创建活动
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索活动名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 rounded-md border border-input bg-background text-sm"
        >
          <option value="">所有类型</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>
              {getEventTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无符合条件的活动</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
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
                    <Badge variant="secondary" className="text-xs">
                      {getEventTypeLabel(event.event_type)}
                    </Badge>
                    {event.is_paid && (
                      <Badge variant="outline" className="text-xs">
                        ¥{event.price}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {event.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
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
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      主办方: {event.profiles?.organizer_name || event.profiles?.nickname || '未知'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;