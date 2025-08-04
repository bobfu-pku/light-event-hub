import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'registration_approved'    // 报名通过
  | 'registration_rejected'    // 报名被拒
  | 'event_reminder'           // 活动提醒  
  | 'event_registration'       // 有人报名活动（主办方收到）
  | 'organizer_application'    // 主办方申请（管理员收到）
  | 'organizer_approved'       // 主办方申请通过（申请者收到）
  | 'organizer_rejected'       // 主办方申请被拒（申请者收到）
  | 'discussion_reply'         // 讨论回复
  | 'event_review'             // 活动评价（主办方收到）
  | 'event_review_reminder'    // 活动评价提醒
  | 'event_updated'            // 活动信息更新
  | 'event_cancelled';         // 活动被取消

interface CreateNotificationOptions {
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  relatedEventId?: string;
}

/**
 * 创建通知
 */
export const createNotification = async (options: CreateNotificationOptions) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: options.userId,
        title: options.title,
        content: options.content,
        type: options.type,
        related_event_id: options.relatedEventId || null,
        is_read: false
      });

    if (error) {
      console.error('创建通知失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('创建通知失败:', error);
    throw error;
  }
};

/**
 * 创建报名审核结果通知
 */
export const createRegistrationStatusNotification = async (
  userId: string,
  eventTitle: string,
  approved: boolean,
  eventId?: string
) => {
  await createNotification({
    userId,
    title: approved ? '报名通过' : '报名被拒',
    content: `您报名的活动"${eventTitle}"${approved ? '已通过审核' : '报名申请被拒绝'}`,
    type: approved ? 'registration_approved' : 'registration_rejected',
    relatedEventId: eventId
  });
};

/**
 * 创建活动报名通知（发送给主办方）
 */
export const createEventRegistrationNotification = async (
  organizerId: string,
  eventTitle: string,
  participantName: string,
  eventId?: string
) => {
  await createNotification({
    userId: organizerId,
    title: '新的报名申请',
    content: `${participantName} 报名了您的活动"${eventTitle}"`,
    type: 'event_registration',
    relatedEventId: eventId
  });
};

/**
 * 创建主办方申请通知（发送给管理员）
 */
export const createOrganizerApplicationNotification = async (
  adminId: string,
  applicantName: string,
  organizerName: string
) => {
  await createNotification({
    userId: adminId,
    title: '新的主办方申请',
    content: `${applicantName} 申请成为主办方（${organizerName}）`,
    type: 'organizer_application'
  });
};

/**
 * 创建主办方申请审核结果通知（发送给申请者）
 */
export const createOrganizerApprovalNotification = async (
  applicantId: string,
  organizerName: string,
  approved: boolean,
  adminNotes?: string
) => {
  const title = approved ? '主办方申请通过' : '主办方申请未通过';
  let content = `您的主办方申请（${organizerName}）${approved ? '已通过审核，您现在可以创建和管理活动了' : '未通过审核'}`;
  
  if (adminNotes) {
    content += `。管理员备注：${adminNotes}`;
  }

  await createNotification({
    userId: applicantId,
    title,
    content,
    type: approved ? 'organizer_approved' : 'organizer_rejected'
  });
};

/**
 * 创建讨论回复通知
 */
export const createDiscussionReplyNotification = async (
  userId: string,
  eventTitle: string,
  replierName: string,
  eventId?: string
) => {
  await createNotification({
    userId,
    title: '讨论区新回复',
    content: `${replierName} 回复了您在活动"${eventTitle}"中的讨论`,
    type: 'discussion_reply',
    relatedEventId: eventId
  });
};

/**
 * 创建活动提醒通知
 */
export const createEventReminderNotification = async (
  userId: string,
  eventTitle: string,
  startTime: string,
  eventId?: string
) => {
  const eventDate = new Date(startTime);
  const formattedDate = eventDate.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  await createNotification({
    userId,
    title: '活动提醒',
    content: `您报名的活动"${eventTitle}"将于明天（${formattedDate}）开始`,
    type: 'event_reminder',
    relatedEventId: eventId
  });
};

/**
 * 创建活动评价提醒通知
 */
export const createEventReviewReminderNotification = async (
  userId: string,
  eventTitle: string,
  eventId?: string
) => {
  await createNotification({
    userId,
    title: '活动评价提醒',
    content: `您参加的活动"${eventTitle}"已结束，邀请您分享参与体验和感受`,
    type: 'event_review_reminder',
    relatedEventId: eventId
  });
};

/**
 * 批量发送活动评价提醒通知给所有已报名用户
 */
export const sendEventReviewReminders = async (eventId: string, eventTitle: string) => {
  try {
    // 获取所有已报名且状态为approved, paid, checked_in的用户
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select('user_id')
      .eq('event_id', eventId)
      .in('status', ['approved', 'paid', 'checked_in']);

    if (error) throw error;

    if (registrations && registrations.length > 0) {
      // 批量创建通知
      const notifications = registrations.map(registration => ({
        user_id: registration.user_id,
        title: '活动评价提醒',
        content: `您参加的活动"${eventTitle}"已结束，邀请您分享参与体验和感受`,
        type: 'event_review_reminder',
        related_event_id: eventId,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      console.log(`已向 ${registrations.length} 位用户发送活动评价提醒`);
    }
  } catch (error) {
    console.error('发送活动评价提醒失败:', error);
    throw error;
  }
};

/**
 * 创建活动更新通知（发送给所有报名者）
 */
export const createEventUpdateNotification = async (
  eventId: string,
  eventTitle: string,
  updateMessage?: string
) => {
  try {
    // 获取所有已报名的用户（包括待审核的用户）
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select('user_id')
      .eq('event_id', eventId)
      .in('status', ['pending', 'approved', 'payment_pending', 'paid', 'checked_in']);

    if (error) throw error;

    if (registrations && registrations.length > 0) {
      // 批量创建通知
      const notifications = registrations.map(registration => ({
        user_id: registration.user_id,
        title: '活动信息更新',
        content: updateMessage || `您报名的活动"${eventTitle}"的信息已更新，请查看最新详情`,
        type: 'event_updated' as NotificationType,
        related_event_id: eventId,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      console.log(`已向 ${registrations.length} 位用户发送活动更新通知`);
      return registrations.length;
    }
    return 0;
  } catch (error) {
    console.error('发送活动更新通知失败:', error);
    throw error;
  }
};

/**
 * 创建活动取消通知（发送给所有报名者）
 */
export const createEventCancelledNotification = async (
  eventId: string,
  eventTitle: string,
  cancelReason?: string
) => {
  try {
    // 获取所有已报名的用户（包括待审核的用户）
    const { data: registrations, error } = await supabase
      .from('event_registrations')
      .select('user_id')
      .eq('event_id', eventId)
      .in('status', ['pending', 'approved', 'payment_pending', 'paid', 'checked_in']);

    if (error) throw error;

    if (registrations && registrations.length > 0) {
      // 批量创建通知
      const notifications = registrations.map(registration => ({
        user_id: registration.user_id,
        title: '活动已取消',
        content: cancelReason 
          ? `很抱歉，您报名的活动"${eventTitle}"已被取消。取消原因：${cancelReason}`
          : `很抱歉，您报名的活动"${eventTitle}"已被取消`,
        type: 'event_cancelled' as NotificationType,
        related_event_id: eventId,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      console.log(`已向 ${registrations.length} 位用户发送活动取消通知`);
      return registrations.length;
    }
    return 0;
  } catch (error) {
    console.error('发送活动取消通知失败:', error);
    throw error;
  }
};

/**
 * 批量获取管理员用户ID
 * 注意：这个函数需要根据实际的管理员定义方式来实现
 */
export const getAdminUserIds = async (): Promise<string[]> => {
  try {
    // 如果管理员是通过特定用户ID或其他字段定义的，需要相应调整查询
    // 这里暂时返回空数组，需要根据具体的管理员定义方式来实现
    console.log('获取管理员列表：暂时返回空数组，需要根据实际管理员定义方式实现');
    return [];
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    return [];
  }
};

/**
 * 创建活动评价通知（发送给主办方）
 */
export const createEventReviewNotification = async (
  eventId: string,
  eventTitle: string,
  reviewerName: string,
  rating: number
) => {
  try {
    // 获取活动主办方信息
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    if (event?.organizer_id) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: event.organizer_id,
          title: '收到新的活动评价',
          content: `${reviewerName} 对您的活动"${eventTitle}"给出了 ${rating} 星评价`,
          type: 'event_review' as NotificationType,
          related_event_id: eventId,
          is_read: false
        });

      if (insertError) throw insertError;

      console.log(`已向主办方发送活动评价通知`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('发送活动评价通知失败:', error);
    throw error;
  }
};