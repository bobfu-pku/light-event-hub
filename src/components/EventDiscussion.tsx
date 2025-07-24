import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Reply, Pin, MoreHorizontal, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
        .order('is_pinned', { ascending: false })
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

      // 添加回复到对应的讨论
      data?.forEach(item => {
        if (item.parent_id) {
          const parent = discussionMap.get(item.parent_id);
          if (parent) {
            parent.replies.push(discussionMap.get(item.id));
          }
        }
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
          title: newTitle.trim() || null,
          content: newContent.trim()
        });

      if (error) throw error;

      toast({
        title: "发布成功",
        description: "您的讨论已发布"
      });

      setNewContent('');
      setNewTitle('');
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

  const handleReply = async (parentId: string) => {
    if (!user || !replyContent[parentId]?.trim()) return;

    try {
      const { error } = await supabase
        .from('event_discussions')
        .insert({
          event_id: eventId,
          author_id: user.id,
          content: replyContent[parentId].trim(),
          parent_id: parentId
        });

      if (error) throw error;

      toast({
        title: "回复成功",
        description: "您的回复已发布"
      });

      setReplyContent(prev => ({ ...prev, [parentId]: '' }));
      setShowReplyForm(prev => ({ ...prev, [parentId]: false }));
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
    return new Date(dateString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <Input
              placeholder="讨论标题（可选）"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
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
      <div className="space-y-4">
        {discussions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">还没有讨论，成为第一个发起讨论的人吧！</p>
            </CardContent>
          </Card>
        ) : (
          discussions.map((discussion) => (
            <Card key={discussion.id} className={discussion.is_pinned ? "border-primary/50" : ""}>
              <CardContent className="pt-6">
                {/* 主讨论 */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {discussion.profiles?.nickname || '匿名用户'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(discussion.created_at)}
                        </p>
                      </div>
                      {discussion.is_pinned && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Pin className="h-3 w-3" />
                          置顶
                        </Badge>
                      )}
                    </div>
                    
                    {canModerate && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
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
                  
                  {discussion.title && (
                    <h4 className="font-medium">{discussion.title}</h4>
                  )}
                  
                  <p className="text-sm whitespace-pre-wrap">{discussion.content}</p>
                  
                  <div className="flex items-center gap-4 pt-2">
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReplyForm(prev => ({
                          ...prev,
                          [discussion.id]: !prev[discussion.id]
                        }))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Reply className="h-4 w-4 mr-1" />
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
                  <div className="mt-4 pl-11 space-y-3">
                    <Textarea
                      placeholder="写下您的回复..."
                      value={replyContent[discussion.id] || ''}
                      onChange={(e) => setReplyContent(prev => ({
                        ...prev,
                        [discussion.id]: e.target.value
                      }))}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(discussion.id)}
                        disabled={!replyContent[discussion.id]?.trim()}
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        发布回复
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowReplyForm(prev => ({
                          ...prev,
                          [discussion.id]: false
                        }))}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}

                {/* 回复列表 */}
                {discussion.replies && discussion.replies.length > 0 && (
                  <div className="mt-4 pl-11 space-y-4">
                    {discussion.replies.map((reply) => (
                      <div key={reply.id} className="border-l-2 border-muted pl-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full bg-gradient-subtle flex items-center justify-center">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {reply.profiles?.nickname || '匿名用户'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(reply.created_at)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap pl-9">{reply.content}</p>
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