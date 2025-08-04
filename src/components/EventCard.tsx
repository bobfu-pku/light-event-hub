import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Users } from 'lucide-react';
import { timeUtils } from '@/lib/utils';

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

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const formatDate = (dateString: string) => {
    return timeUtils.formatBeijingTimeShort(dateString);
  };

  return (
    <Link to={`/events/${event.id}`}>
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
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors flex-1 min-w-0">
              {event.title}
            </h3>
            <div className="flex-shrink-0">
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
          </div>
          
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
  );
};

export default EventCard;