import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { createOrganizerApprovalNotification, getAdminUserIds } from '@/lib/notifications';

interface OrganizerApplication {
  id: string;
  user_id: string;
  organizer_name: string;
  organizer_description: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  created_at: string;
  user_nickname: string;
  user_avatar_url: string;
}

interface EventData {
  id: string;
  title: string;
  status: string;
  organizer_id: string;
  registration_count: number;
  created_at: string;
  start_time: string;
  end_time: string;
  organizer_name: string;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<OrganizerApplication[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<OrganizerApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    // 等待认证状态加载完成
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!isAdmin) {
      navigate('/');
      toast({
        title: "访问被拒绝",
        description: "您没有管理员权限",
        variant: "destructive",
      });
      return;
    }
    
    fetchData();
  }, [user, isAdmin, navigate, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取待审核申请 - 优先使用管理员函数，失败则使用直接查询
      try {
        const { data: applicationsData, error: appsError } = await supabase
          .rpc('get_pending_organizer_applications' as any);
        
        if (appsError) throw appsError;
        setApplications((applicationsData as OrganizerApplication[]) || []);
      } catch (rpcError) {
        console.warn('管理员函数不可用，使用直接查询:', rpcError);
        // 备用方案：直接查询申请表
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('organizer_applications')
          .select(`
            id,
            user_id,
            organizer_name,
            organizer_description,
            contact_email,
            contact_phone,
            status,
            created_at
          `)
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        
        // 获取用户信息
        const applicationsWithUserInfo = [];
        for (const app of fallbackData || []) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('user_id', app.user_id)
            .single();
          
          applicationsWithUserInfo.push({
            ...app,
            user_nickname: profileData?.nickname || null,
            user_avatar_url: profileData?.avatar_url || null
          });
        }
        
        const formattedApplications = applicationsWithUserInfo as OrganizerApplication[];
        
        setApplications(formattedApplications);
      }
      
      // 获取所有活动和相关统计 - 只显示已发布且未结束的活动
      const currentTime = new Date().toISOString();
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          status,
          organizer_id,
          created_at,
          start_time,
          end_time,
          profiles:organizer_id(organizer_name),
          event_registrations(count)
        `)
        .eq('status', 'published')
        .gt('end_time', currentTime)
        .order('start_time', { ascending: true });
      
      if (eventsError) throw eventsError;
      
      const formattedEvents = eventsData?.map(event => ({
        id: event.id,
        title: event.title,
        status: event.status,
        organizer_id: event.organizer_id,
        registration_count: event.event_registrations?.[0]?.count || 0,
        created_at: event.created_at,
        start_time: event.start_time,
        end_time: event.end_time,
        organizer_name: event.profiles?.organizer_name || '未知主办方'
      })) || [];
      
      setEvents(formattedEvents);
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "加载失败",
        description: "无法加载管理员数据",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (!selectedApplication) return;
    
    try {
      setReviewing(true);
      
      try {
        // 优先使用管理员函数
        const { data, error } = await supabase
          .rpc('admin_review_organizer_application' as any, {
            application_id: applicationId,
            new_status: status,
            admin_notes: adminNotes
          });
        
        if (error) throw error;
      } catch (rpcError) {
        console.warn('管理员审核函数不可用，使用备用方案:', rpcError);
        
        // 备用方案：手动更新申请状态
        const { error: updateError } = await supabase
          .from('organizer_applications')
          .update({
            status: status,
            admin_notes: adminNotes,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);
        
        if (updateError) throw updateError;
        
        // 如果审核通过，手动更新用户角色
        if (status === 'approved') {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              roles: ['user', 'organizer'],
              organizer_name: selectedApplication.organizer_name,
              organizer_description: selectedApplication.organizer_description,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', selectedApplication.user_id);
          
          if (profileError) throw profileError;
        }
      }
      
      // 发送审核结果通知给申请者
      try {
        await createOrganizerApprovalNotification(
          selectedApplication.user_id,
          selectedApplication.organizer_name,
          status === 'approved',
          adminNotes
        );
      } catch (notificationError) {
        console.error('发送通知失败:', notificationError);
        // 即使通知发送失败也不影响主要功能
      }
      
      toast({
        title: status === 'approved' ? "申请已通过" : "申请已拒绝",
        description: `主办方申请已${status === 'approved' ? '通过审核' : '被拒绝'}，通知已发送给申请者`,
      });
      
      setReviewDialogOpen(false);
      setSelectedApplication(null);
      setAdminNotes('');
      fetchData(); // 刷新数据
      
    } catch (error) {
      console.error('Error reviewing application:', error);
      toast({
        title: "操作失败",
        description: "无法处理申请，请重试",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  };

  const openReviewDialog = (application: OrganizerApplication) => {
    setSelectedApplication(application);
    setAdminNotes('');
    setReviewDialogOpen(true);
  };

  // 如果认证状态还在加载或者数据还在加载，显示加载状态
  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{authLoading ? '正在验证身份...' : '加载中...'}</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const publishedEvents = events; // 已经只获取了已发布的活动
  const totalRegistrations = events.reduce((sum, event) => sum + event.registration_count, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">管理员后台</h1>
            <p className="text-muted-foreground">管理主办方申请和活动</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">待审核申请</span>
              </div>
              <div className="text-xl font-bold">{pendingApplications.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">进行中活动</span>
              </div>
              <div className="text-xl font-bold">{publishedEvents.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">总报名数</span>
              </div>
              <div className="text-xl font-bold">{totalRegistrations}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList>
          <TabsTrigger value="events">活动管理</TabsTrigger>
          <TabsTrigger value="applications">主办方申请</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          <div className="text-sm text-muted-foreground mb-4">
            仅显示进行中的活动（已发布且未结束）
          </div>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无进行中的活动
            </div>
          ) : (
            <>
              {/* 桌面端表格布局 */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>活动名称</TableHead>
                      <TableHead>主办方</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>报名人数</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{event.organizer_name}</TableCell>
                        <TableCell>
                          <Badge variant={event.status === 'published' ? 'default' : 'outline'}>
                            {event.status === 'published' ? '已发布' : event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.registration_count}</TableCell>
                        <TableCell>{new Date(event.start_time).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/events/${event.id}`)}
                            >
                              查看
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/events/${event.id}/manage`)}
                            >
                              管理
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 移动端卡片布局 */}
              <div className="md:hidden space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* 活动标题和状态 */}
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="font-medium text-base leading-tight flex-1 min-w-0">
                            {event.title}
                          </h3>
                          <Badge 
                            variant={event.status === 'published' ? 'default' : 'outline'}
                            className="flex-shrink-0"
                          >
                            {event.status === 'published' ? '已发布' : event.status}
                          </Badge>
                        </div>
                        
                        {/* 活动信息 */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">主办方：</span>
                            <span className="text-foreground">{event.organizer_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">报名：</span>
                            <span className="text-foreground">{event.registration_count}人</span>
                          </div>
                        </div>
                        
                        {/* 开始时间 */}
                        <div className="text-sm">
                          <span className="text-muted-foreground">开始时间：</span>
                          <span className="text-foreground">{new Date(event.start_time).toLocaleDateString()}</span>
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/events/${event.id}`)}
                          >
                            查看
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/events/${event.id}/manage`)}
                          >
                            管理
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          {pendingApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无待审核申请
            </div>
          ) : (
            <>
              {/* 桌面端表格布局 */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申请人</TableHead>
                      <TableHead>主办方名称</TableHead>
                      <TableHead>联系邮箱</TableHead>
                      <TableHead>申请时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>{application.user_nickname || '未设置昵称'}</TableCell>
                        <TableCell className="font-medium">{application.organizer_name}</TableCell>
                        <TableCell>{application.contact_email}</TableCell>
                        <TableCell>{new Date(application.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-yellow-600">
                            <Clock className="w-3 h-3 mr-1" />
                            待审核
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReviewDialog(application)}
                          >
                            审核
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 移动端卡片布局 */}
              <div className="md:hidden space-y-4">
                {pendingApplications.map((application) => (
                  <Card key={application.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* 主办方名称和状态 */}
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="font-medium text-base leading-tight flex-1 min-w-0">
                            {application.organizer_name}
                          </h3>
                          <Badge variant="outline" className="text-yellow-600 flex-shrink-0">
                            <Clock className="w-3 h-3 mr-1" />
                            待审核
                          </Badge>
                        </div>
                        
                        {/* 申请人信息 */}
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">申请人：</span>
                            <span className="text-foreground">{application.user_nickname || '未设置昵称'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">联系邮箱：</span>
                            <span className="text-foreground break-all">{application.contact_email}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">申请时间：</span>
                            <span className="text-foreground">{new Date(application.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => openReviewDialog(application)}
                          >
                            审核申请
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 审核对话框 */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>审核主办方申请</DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">申请人</label>
                  <p className="text-sm text-muted-foreground">{selectedApplication.user_nickname || '未设置昵称'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">联系邮箱</label>
                  <p className="text-sm text-muted-foreground">{selectedApplication.contact_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">主办方名称</label>
                  <p className="text-sm text-muted-foreground">{selectedApplication.organizer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">联系电话</label>
                  <p className="text-sm text-muted-foreground">{selectedApplication.contact_phone || '未提供'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">主办方介绍</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedApplication.organizer_description || '未提供'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">审核备注</label>
                <Textarea
                  placeholder="请输入审核备注（可选）"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setReviewDialogOpen(false)}
                  disabled={reviewing}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReviewApplication(selectedApplication.id, 'rejected')}
                  disabled={reviewing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {reviewing ? '处理中...' : '拒绝'}
                </Button>
                <Button
                  onClick={() => handleReviewApplication(selectedApplication.id, 'approved')}
                  disabled={reviewing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {reviewing ? '处理中...' : '通过'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;