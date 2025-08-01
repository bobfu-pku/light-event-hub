import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import EventCard from '@/components/EventCard';

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
  const { user, isOrganizer } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFinishedEvents, setShowFinishedEvents] = useState(false);

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

  const now = new Date();
  
  // 分离即将开始和已结束的活动
  const upcomingEvents = events.filter(event => {
    const startTime = new Date(event.start_time);
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || event.event_type === selectedType;
    return startTime > now && matchesSearch && matchesType;
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()); // 按开始时间由近到远

  const finishedEvents = events.filter(event => {
    const endTime = new Date(event.end_time);
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || event.event_type === selectedType;
    return endTime <= now && matchesSearch && matchesType;
  }).sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime()); // 按结束时间从最近到最远

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
        {isOrganizer && (
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
      </div>

      {/* 即将开始的活动 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">即将开始的活动</h2>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">暂无即将开始的活动</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* 已结束的活动 */}
      {finishedEvents.length > 0 && (
        <Collapsible open={showFinishedEvents} onOpenChange={setShowFinishedEvents}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-6">
                  <CardTitle className="flex items-center gap-2">
                    已结束活动 ({finishedEvents.length})
                  </CardTitle>
                  {showFinishedEvents ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finishedEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default Events;