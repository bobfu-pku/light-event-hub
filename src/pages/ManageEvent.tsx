import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, ArrowLeft, Edit, Trash2, Eye, Check, X, UserCheck, QrCode, Scan } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { timeUtils } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import QRCodeScanner from '@/components/QRCodeScanner';
import { createRegistrationStatusNotification, createEventRegistrationNotification, createEventCancelledNotification, createNotification } from '@/lib/notifications';

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
  checked_in_at?: string;
  verification_code?: string;
}

const ManageEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState('');
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

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
    if (!event || !confirm('确定要删除这个活动吗？此操作不可撤销。所有报名者将收到活动取消通知。')) return;

    try {
      // 先获取所有需要通知的用户，避免级联删除影响
      const { data: registrations, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event.id)
        .in('status', ['pending', 'approved', 'payment_pending', 'paid', 'checked_in']);

      if (registrationsError) {
        console.error('获取报名用户失败:', registrationsError);
      }

      const userIds = registrations?.map(r => r.user_id) || [];
      
      // 先创建通知记录（在删除活动前）
      if (userIds.length > 0) {
        try {
          // 使用 createNotification 函数（通过 RPC）为每个用户创建通知
          const notificationPromises = userIds.map(userId => 
            createNotification({
              userId,
              title: '活动已取消',
              content: `很抱歉，您报名的活动"${event.title}"已被取消。取消原因：主办方取消了此活动`,
              type: 'event_cancelled',
              relatedEventId: event.id
            })
          );

          await Promise.all(notificationPromises);
          console.log(`已向 ${userIds.length} 位用户发送活动取消通知`);
        } catch (notificationError) {
          console.error('发送取消通知失败:', notificationError);
        }
      }

      // 删除活动（级联删除会删除所有相关记录）
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: '成功',
        description: userIds.length > 0 
          ? `活动已删除，已通知所有 ${userIds.length} 位报名者`
          : '活动已删除'
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




  const handleRejectRegistration = async (registrationId: string) => {
    try {
      // 获取注册记录信息
      const registration = registrations.find(r => r.id === registrationId);
      if (!registration) {
        throw new Error('注册记录不存在');
      }

      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'rejected' })
        .eq('id', registrationId);

      if (error) throw error;

      // 获取用户ID
      const { data: userRegistration } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('id', registrationId)
        .single();

      // 创建拒绝通知
      if (userRegistration && event) {
        try {
          await createRegistrationStatusNotification(
            userRegistration.user_id,
            event.title,
            false,
            event.id
          );
        } catch (notificationError) {
          console.error('创建通知失败:', notificationError);
        }
      }

      toast({
        title: '成功',
        description: '已拒绝报名申请'
      });
      fetchRegistrations();
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast({
        title: '错误',
        description: '审核失败',
        variant: 'destructive'
      });
    }
  };

  const handleCheckIn = async (registrationId: string) => {
    try {
      // 使用当前UTC时间作为签到时间
      const currentUTCTime = new Date().toISOString();
      
      const { error } = await supabase
        .from('event_registrations')
        .update({ 
          status: 'checked_in',
          checked_in_at: currentUTCTime,
          checked_in_by: user?.id
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: '成功',
        description: '签到成功'
      });
      fetchRegistrations();
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: '错误',
        description: '签到失败',
        variant: 'destructive'
      });
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode.trim()) {
      toast({
        title: '错误',
        description: '请输入核验码',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Find registration with this verification code
      const registration = registrations.find(r => r.verification_code === verifyCode.trim());
      
      if (!registration) {
        toast({
          title: '错误',
          description: '核验码无效或已被使用',
          variant: 'destructive'
        });
        return;
      }

      if (registration.status === 'checked_in') {
        toast({
          title: '提示',
          description: '该核验码已被使用过',
          variant: 'destructive'
        });
        return;
      }

      // Update registration status to checked_in
      await handleCheckIn(registration.id);
      setVerifyCode('');
      setShowVerifyDialog(false);
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: '错误',
        description: '核验码验证失败',
        variant: 'destructive'
      });
    }
  };

  const handleQRScanSuccess = async (scannedCode: string) => {
    setVerifyCode(scannedCode);
    await handleVerifyCodeWithValue(scannedCode);
  };

  const handleVerifyCodeWithValue = async (code?: string) => {
    const codeToVerify = code || verifyCode.trim();
    
    if (!codeToVerify) {
      toast({
        title: '错误',
        description: '请输入核验码',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Find registration with this verification code
      const registration = registrations.find(r => r.verification_code === codeToVerify);
      
      if (!registration) {
        toast({
          title: '错误',
          description: '核验码无效或已被使用',
          variant: 'destructive'
        });
        return;
      }

      if (registration.status === 'checked_in') {
        toast({
          title: '提示',
          description: '该核验码已被使用过',
          variant: 'destructive'
        });
        return;
      }

      // Update registration status to checked_in
      await handleCheckIn(registration.id);
      setVerifyCode('');
      setShowVerifyDialog(false);
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: '错误',
        description: '核验码验证失败',
        variant: 'destructive'
      });
    }
  };

  // 客户端生成核验码函数
  const generateVerificationCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleApproveAndPayment = async (registrationId: string) => {
    try {
      const registration = registrations.find(r => r.id === registrationId);
      const isPaymentEvent = event?.is_paid;
      
      // 检查人数限制
      if (event?.max_participants && event.max_participants > 0) {
        // 计算当前已通过审核的人数（approved, payment_pending, paid, checked_in）
        const approvedRegistrations = registrations.filter(r => 
          r.id !== registrationId && // 排除当前正在审核的报名
          ['approved', 'payment_pending', 'paid', 'checked_in'].includes(r.status)
        );

        const currentApprovedCount = approvedRegistrations.length;
        
        if (currentApprovedCount >= event.max_participants) {
          toast({
            title: '人数已满',
            description: `该活动限制${event.max_participants}人，目前已审核通过${currentApprovedCount}人`,
            variant: 'destructive'
          });
          return;
        }
      }
      
      // 对于免费活动，生成核验码（使用客户端生成）
      let verificationCode = null;
      if (!isPaymentEvent) {
        verificationCode = generateVerificationCode();
      }

      const { error } = await supabase
        .from('event_registrations')
        .update({ 
          status: isPaymentEvent ? 'payment_pending' : 'approved',
          verification_code: verificationCode
        })
        .eq('id', registrationId);

      if (error) throw error;

      // 获取用户ID
      const { data: userRegistration } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('id', registrationId)
        .single();

      // 创建通过通知
      if (userRegistration && event) {
        try {
          await createRegistrationStatusNotification(
            userRegistration.user_id,
            event.title,
            true,
            event.id
          );
        } catch (notificationError) {
          console.error('创建通知失败:', notificationError);
        }
      }

      toast({
        title: '成功',
        description: isPaymentEvent ? '已通过审核，等待用户支付' : '已通过报名申请'
      });
      fetchRegistrations();
    } catch (error) {
      console.error('Error approving registration:', error);
      toast({
        title: '错误',
        description: '审核失败',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return timeUtils.formatBeijingTime(dateString);
  };

  // 计算活动的实际状态（考虑时间）
  const getActualEventStatus = (event: Event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    
    // 如果当前时间超过活动结束时间，状态应为已结束
    if (now > endTime) {
      return 'ended';
    }
    
    return event.status;
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
              <Badge>{getStatusLabel(getActualEventStatus(event))}</Badge>
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
            {getActualEventStatus(event) === 'ended' ? (
              <div className="text-center py-6 text-muted-foreground">
                <div className="text-sm">活动已结束，不支持操作活动</div>
              </div>
            ) : (
              <>
                <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <QrCode className="h-4 w-4 mr-2" />
                      手动核验
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>输入核验码</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="请输入8位核验码"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        className="text-center font-mono text-lg"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setVerifyCode('');
                            setShowVerifyDialog(false);
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleVerifyCode}
                        >
                          验证核验码
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {/* <QRCodeScanner onScanSuccess={handleQRScanSuccess}>
                  <Button variant="outline" className="w-full">
                    <Scan className="h-4 w-4 mr-2" />
                    二维码核验
                  </Button>
                </QRCodeScanner> */}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/events/create?id=${event.id}`)}
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
              </>
            )}
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
                      <div className="flex-1">
                        <h3 className="font-semibold">{registration.participant_name}</h3>
                        <p className="text-sm text-muted-foreground">{registration.participant_email}</p>
                        <p className="text-sm text-muted-foreground">{registration.participant_phone}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          报名时间: {formatDate(registration.created_at)}
                        </p>
                        {registration.checked_in_at && (
                          <p className="text-xs text-green-600 mt-1">
                            签到时间: {formatDate(registration.checked_in_at)}
                          </p>
                        )}
                        {registration.verification_code && (
                          <p className="text-xs text-blue-600 mt-1 font-mono">
                            核验码: {registration.verification_code}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-3">

                        {/* Action buttons based on status */}
                        <div className="flex flex-col gap-2">
                          {registration.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveAndPayment(registration.id)}
                                className="text-green-600 hover:bg-green-50 min-w-[80px]"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                通过
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectRegistration(registration.id)}
                                className="text-red-600 hover:bg-red-50 min-w-[80px]"
                              >
                                <X className="h-4 w-4 mr-1" />
                                拒绝
                              </Button>
                            </>
                          )}
                          
                          {(registration.status === 'approved' || registration.status === 'paid') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckIn(registration.id)}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              签到
                            </Button>
                          )}
                          
                          {registration.status === 'checked_in' && (
                            <Badge variant="secondary" className="text-green-600 bg-green-50">
                              已签到
                            </Badge>
                          )}
                        </div>
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