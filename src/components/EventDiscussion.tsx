import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Reply, Pin, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { timeUtils } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createDiscussionReplyNotification } from '@/lib/notifications';

interface Discussion {
  id: string;
  title?: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  is_pinned: boolean;
  is_deleted: boolean;
  profiles: {
    nickname?: string;
    avatar_url?: string;
  };
  replies?: Discussion[];
  reply_to_nickname?: string; // 用于显示"回复 XX"
}

interface EventDiscussionProps {
  eventId: string;
  organizerId: string;
}

const EventDiscussion: React.FC<EventDiscussionProps> = ({ eventId, organizerId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [showReplyForm, setShowReplyForm] = useState<{ [key: string]: boolean }>({});
  const [replyToReply, setReplyToReply] = useState<{ [key: string]: { parentId: string, nickname: string } }>({});
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [eventId]);

  const fetchDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from('event_discussions')
        .select(`
          id,
          title,
          content,
          author_id,
          created_at,
          updated_at,
          parent_id,
          is_pinned,
          is_deleted,
          profiles!event_discussions_author_id_fkey (
            nickname,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // 组织数据结构，处理回复
      const discussionMap = new Map();
      const topLevel: Discussion[] = [];

      data?.forEach(item => {
        const discussion = {
          ...item,
          replies: []
        };
        discussionMap.set(item.id, discussion);

        if (!item.parent_id) {
          topLevel.push(discussion);
        }
      });

      // 添加回复到对应的讨论，所有回复都扁平化显示在主讨论下
      data?.forEach(item => {
        if (item.parent_id) {
          const parent = discussionMap.get(item.parent_id);
          if (parent) {
            // 找到最顶级的主讨论
            let topLevelDiscussion = parent;
            while (topLevelDiscussion.parent_id) {
              topLevelDiscussion = discussionMap.get(topLevelDiscussion.parent_id);
              if (!topLevelDiscussion) break;
            }
            
            if (topLevelDiscussion) {
              // 判断是否是一级回复（直接回复主讨论）
              const isFirstLevelReply = !parent.parent_id;
              
              const replyWithTarget = {
                ...discussionMap.get(item.id),
                reply_to_nickname: isFirstLevelReply ? 
                  undefined : // 一级回复不显示"回复 xx："
                  (parent.author_id !== item.author_id ? (parent.profiles?.nickname || '匿名用户') : undefined) // 二级及以上回复显示"回复 xx："
              };
              
              topLevelDiscussion.replies.push(replyWithTarget);
            }
          }
        }
      });

      // 对每个讨论的回复按时间排序
      topLevel.forEach(discussion => {
        if (discussion.replies) {
          discussion.replies.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
      });

      // 按最新活动时间排序（置顶讨论优先，然后按最新回复或创建时间排序）
      topLevel.sort((a, b) => {
        // 置顶讨论优先
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1;
        }
        
        // 计算最新活动时间
        const getLatestTime = (discussion: Discussion) => {
          const times = [discussion.created_at];
          if (discussion.replies) {
            times.push(...discussion.replies.map(r => r.created_at));
          }
          return Math.max(...times.map(t => new Date(t).getTime()));
        };
        
        return getLatestTime(b) - getLatestTime(a);
      });

      setDiscussions(topLevel);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast({
        title: "错误",
        description: "无法加载讨论内容",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostDiscussion = async () => {
    if (!user || !newContent.trim()) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('event_discussions')
        .insert({
          event_id: eventId,
          author_id: user.id,
          content: newContent.trim()
        });

      if (error) throw error;

      toast({
        title: "发布成功",
        description: "您的讨论已发布"
      });

      setNewContent('');
      fetchDiscussions();
    } catch (error: any) {
      console.error('Error posting discussion:', error);
      toast({
        title: "发布失败",
        description: error.message || "请稍后重试",
        variant: "destructive"
      });
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (replyId: string) => {
    if (!user || !replyContent[replyId]?.trim()) return;

    try {
      // 确定回复的目标ID（可能是讨论ID或回复ID）
      const targetParentId = replyToReply[replyId]?.parentId || replyId;
      
      const { error } = await supabase
        .from('event_discussions')
        .insert({
          event_id: eventId,
          author_id: user.id,
          content: replyContent[replyId].trim(),
          parent_id: targetParentId
        });

      if (error) throw error;

      // 查找回复目标的作者，发送通知
      let targetAuthorId = null;
      
      if (replyToReply[replyId]) {
        // 回复的是二级回复
        const targetDiscussion = discussions.find(d => d.id === replyToReply[replyId].parentId);
        if (targetDiscussion) {
          const targetReply = targetDiscussion.replies?.find(r => r.id === replyId);
          targetAuthorId = targetReply?.author_id;
        }
      } else {
        // 回复的是主讨论
        const originalDiscussion = discussions.find(d => d.id === replyId);
        targetAuthorId = originalDiscussion?.author_id;
      }

      if (targetAuthorId && targetAuthorId !== user.id) {
        try {
          // 获取活动信息
          const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

          // 获取当前用户的昵称
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('user_id', user.id)
            .single();

          if (event) {
            await createDiscussionReplyNotification(
              targetAuthorId,
              event.title,
              profile?.nickname || 'Someone',
              eventId
            );
          }
        } catch (notificationError) {
          console.error('创建通知失败:', notificationError);
        }
      }

      toast({
        title: "回复成功",
        description: "您的回复已发布"
      });

      setReplyContent(prev => ({ ...prev, [replyId]: '' }));
      setShowReplyForm(prev => ({ ...prev, [replyId]: false }));
      setReplyToReply(prev => ({ ...prev, [replyId]: undefined }));
      fetchDiscussions();
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast({
        title: "回复失败",
        description: error.message || "请稍后重试",
        variant: "destructive"
      });
    }
  };

  const handleTogglePin = async (discussionId: string, currentPinned: boolean) => {
    if (!user || user.id !== organizerId) return;

    try {
      const { error } = await supabase
        .from('event_discussions')
        .update({ is_pinned: !currentPinned })
        .eq('id', discussionId);

      if (error) throw error;

      toast({
        title: currentPinned ? "取消置顶" : "置顶成功",
        description: currentPinned ? "讨论已取消置顶" : "讨论已置顶"
      });

      fetchDiscussions();
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast({
        title: "操作失败",
        description: error.message || "请稍后重试",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return timeUtils.formatBeijingTimeShort(dateString);
  };

  const canModerate = user?.id === organizerId;

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
      {/* 发布新讨论 */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">发起讨论</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="分享您的想法..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handlePostDiscussion}
              disabled={!newContent.trim() || posting}
              className="bg-gradient-primary hover:opacity-90"
            >
              {posting ? "发布中..." : "发布讨论"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 讨论列表 */}
      <div className="space-y-3">
        {discussions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">还没有讨论，成为第一个发起讨论的人吧！</p>
            </CardContent>
          </Card>
        ) : (
          discussions.map((discussion) => (
            <Card key={discussion.id} className={`${discussion.is_pinned ? "border-primary/50" : ""} overflow-hidden`}>
              <CardContent className="p-4">
                {/* 主讨论 */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={discussion.profiles?.avatar_url || ''} alt={discussion.profiles?.nickname || ''} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                          {discussion.profiles?.nickname?.charAt(0) || '匿'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {discussion.profiles?.nickname || '匿名用户'}
                          </p>
                          <p className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(discussion.created_at)}
                          </p>
                          {discussion.is_pinned && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
                              <Pin className="h-2.5 w-2.5" />
                              置顶
                            </Badge>
                          )}
                        </div>
                        {discussion.title && (
                          <h4 className="font-medium text-sm mt-1">{discussion.title}</h4>
                        )}
                        <p className="text-sm whitespace-pre-wrap mt-1 leading-relaxed">{discussion.content}</p>
                      </div>
                    </div>
                    
                    {canModerate && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTogglePin(discussion.id, discussion.is_pinned)}
                          >
                            {discussion.is_pinned ? "取消置顶" : "置顶讨论"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 pl-11">
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReplyForm(prev => ({
                          ...prev,
                          [discussion.id]: !prev[discussion.id]
                        }))}
                        className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs"
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        回复
                      </Button>
                    )}
                    {discussion.replies && discussion.replies.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {discussion.replies.length} 条回复
                      </span>
                    )}
                  </div>
                </div>

                {/* 回复表单 */}
                {showReplyForm[discussion.id] && user && (
                  <div className="mt-3 pl-11 space-y-2">
                    {replyToReply[discussion.id] && (
                      <p className="text-xs text-muted-foreground">
                        回复 {replyToReply[discussion.id].nickname}
                      </p>
                    )}
                    <Textarea
                      placeholder="写下您的回复..."
                      value={replyContent[discussion.id] || ''}
                      onChange={(e) => setReplyContent(prev => ({
                        ...prev,
                        [discussion.id]: e.target.value
                      }))}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(discussion.id)}
                        disabled={!replyContent[discussion.id]?.trim()}
                        className="bg-gradient-primary hover:opacity-90 h-7 px-3 text-xs"
                      >
                        发布回复
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowReplyForm(prev => ({ ...prev, [discussion.id]: false }));
                          setReplyToReply(prev => ({ ...prev, [discussion.id]: undefined }));
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}

                {/* 回复列表 */}
                {discussion.replies && discussion.replies.length > 0 && (
                  <div className="mt-3 pl-11 space-y-3">
                    {discussion.replies.map((reply) => (
                      <div key={reply.id} className="border-l-2 border-muted pl-3">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarImage src={reply.profiles?.avatar_url || ''} alt={reply.profiles?.nickname || ''} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {reply.profiles?.nickname?.charAt(0) || '匿'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-xs truncate">
                                {reply.profiles?.nickname || '匿名用户'}
                              </p>
                              <p className="text-xs text-muted-foreground flex-shrink-0">
                                {formatDate(reply.created_at)}
                              </p>
                            </div>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {reply.reply_to_nickname && (
                                <span className="text-muted-foreground">回复 {reply.reply_to_nickname}：</span>
                              )}
                              {reply.content}
                            </p>
                            {user && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowReplyForm(prev => ({ ...prev, [reply.id]: !prev[reply.id] }));
                                  setReplyToReply(prev => ({
                                    ...prev,
                                    [reply.id]: {
                                      parentId: discussion.id,
                                      nickname: reply.profiles?.nickname || '匿名用户'
                                    }
                                  }));
                                }}
                                className="text-muted-foreground hover:text-foreground h-5 px-2 text-xs mt-1"
                              >
                                <Reply className="h-2.5 w-2.5 mr-1" />
                                回复
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* 二级回复表单 */}
                        {showReplyForm[reply.id] && user && (
                          <div className="mt-2 pl-8 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              回复 {reply.profiles?.nickname || '匿名用户'}
                            </p>
                            <Textarea
                              placeholder="写下您的回复..."
                              value={replyContent[reply.id] || ''}
                              onChange={(e) => setReplyContent(prev => ({
                                ...prev,
                                [reply.id]: e.target.value
                              }))}
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReply(reply.id)}
                                disabled={!replyContent[reply.id]?.trim()}
                                className="bg-gradient-primary hover:opacity-90 h-7 px-3 text-xs"
                              >
                                发布回复
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowReplyForm(prev => ({ ...prev, [reply.id]: false }));
                                  setReplyToReply(prev => ({ ...prev, [reply.id]: undefined }));
                                }}
                                className="h-7 px-3 text-xs"
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EventDiscussion;