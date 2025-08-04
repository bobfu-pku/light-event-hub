import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { timeUtils } from '@/lib/utils';
import { createEventReviewNotification } from '@/lib/notifications';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  profiles: {
    nickname?: string;
    avatar_url?: string;
  };
}

interface EventReviewsProps {
  eventId: string;
  eventEndTime: string;
}

const EventReviews: React.FC<EventReviewsProps> = ({ eventId, eventEndTime }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
    if (user) {
      checkRegistration();
    }
  }, [eventId, user]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('event_reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles!event_reviews_user_id_fkey (
            nickname,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async () => {
    if (!user) return;

    try {
      // 检查用户是否已报名
      const { data: registration, error } = await supabase
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (registration && ['approved', 'paid', 'checked_in'].includes(registration.status)) {
        setIsRegistered(true);
        
        // 检查用户是否已评价
        const { data: existingReview } = await supabase
          .from('event_reviews')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();

        if (existingReview) {
          setUserReview(existingReview);
          setRating(existingReview.rating);
          setComment(existingReview.comment || '');
        }
      }
    } catch (error) {
      // No registration or review found
    }
  };

  const isEventEnded = () => {
    return new Date() > new Date(eventEndTime);
  };

  const canReview = () => {
    return user && isRegistered && isEventEnded() && !userReview;
  };

  const handleSubmitReview = async () => {
    if (!user || !rating) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('event_reviews')
        .insert({
          event_id: eventId,
          user_id: user.id,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      // 获取活动信息和用户昵称，发送通知给主办方
      try {
        const [eventResponse, userProfileResponse] = await Promise.all([
          supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single(),
          supabase
            .from('profiles')
            .select('nickname')
            .eq('user_id', user.id)
            .single()
        ]);

        if (eventResponse.data && userProfileResponse.data) {
          const eventTitle = eventResponse.data.title;
          const reviewerName = userProfileResponse.data.nickname || '匿名用户';
          
          await createEventReviewNotification(
            eventId,
            eventTitle,
            reviewerName,
            rating
          );
        }
      } catch (notificationError) {
        console.error('发送主办方通知失败:', notificationError);
        // 通知失败不影响评价提交成功
      }

      toast({
        title: "评价成功",
        description: "感谢您的评价！"
      });

      setShowReviewForm(false);
      setRating(0);
      setComment('');
      checkRegistration();
      fetchReviews();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "评价失败",
        description: error.message || "请稍后重试",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return timeUtils.formatBeijingTimeShort(dateString);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 评价表单 */}
      {canReview() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">评价活动</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showReviewForm ? (
              <Button 
                onClick={() => setShowReviewForm(true)}
                className="bg-gradient-primary hover:opacity-90"
              >
                写一个评价
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">评分</label>
                  {renderStars(rating, true)}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">评价内容（可选）</label>
                  <Textarea
                    placeholder="分享您的活动体验..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitReview}
                    disabled={!rating || submitting}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {submitting ? "提交中..." : "提交评价"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowReviewForm(false);
                      setRating(0);
                      setComment('');
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 用户已评价显示 */}
      {userReview && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">您的评价</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderStars(userReview.rating)}
            {userReview.comment && (
              <p className="text-sm whitespace-pre-wrap">{userReview.comment}</p>
            )}
            <p className="text-xs text-muted-foreground">
              评价时间: {formatDate(userReview.created_at)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 评价列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          所有评价 ({reviews.length})
        </h3>
        
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">还没有评价，快来成为第一个评价的人吧！</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {review.profiles?.nickname || '匿名用户'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {renderStars(review.rating)}
                  
                  {review.comment && (
                    <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 提示信息 */}
      {!isEventEnded() && isRegistered && (
        <Card className="border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800">
              活动结束后您可以对此活动进行评价
            </p>
          </CardContent>
        </Card>
      )}

      {!isRegistered && user && (
        <Card className="border-yellow-200">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-800">
              只有报名参加活动的用户才能在活动结束后进行评价
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventReviews;