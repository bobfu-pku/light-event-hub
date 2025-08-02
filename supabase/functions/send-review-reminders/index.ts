import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 计算昨天的日期范围
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 查找昨天结束的活动
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select(`
        id, 
        title, 
        end_time,
        organizer_id
      `)
      .gte('end_time', yesterday.toISOString())
      .lt('end_time', today.toISOString())
      .eq('status', 'published')

    if (eventsError) {
      throw eventsError
    }

    console.log(`找到 ${events?.length || 0} 个昨天结束的活动`)

    let notificationCount = 0

    // 为每个活动发送评价提醒
    for (const event of events || []) {
      // 获取已报名且状态为approved或paid或checked_in的用户
      const { data: registrations, error: regError } = await supabaseClient
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event.id)
        .in('status', ['approved', 'paid', 'checked_in'])

      if (regError) {
        console.error(`获取活动 ${event.id} 的报名记录失败:`, regError)
        continue
      }

      if (!registrations || registrations.length === 0) {
        console.log(`活动 ${event.title} 没有符合条件的报名用户`)
        continue
      }

      // 检查是否已经发送过评价提醒
      const { data: existingNotifications, error: notificationCheckError } = await supabaseClient
        .from('notifications')
        .select('user_id')
        .eq('related_event_id', event.id)
        .eq('type', 'event_review_reminder')

      if (notificationCheckError) {
        console.error(`检查已存在通知失败:`, notificationCheckError)
        continue
      }

      // 获取已经收到通知的用户ID
      const notifiedUserIds = new Set(existingNotifications?.map(n => n.user_id) || [])

      // 为尚未收到评价提醒的用户创建通知
      for (const registration of registrations) {
        if (notifiedUserIds.has(registration.user_id)) {
          console.log(`用户 ${registration.user_id} 已收到活动 ${event.title} 的评价提醒，跳过`)
          continue
        }

        try {
          const { error: notificationError } = await supabaseClient
            .from('notifications')
            .insert({
              user_id: registration.user_id,
              title: '活动评价提醒',
              content: `您参加的活动"${event.title}"已结束，邀请您分享参与体验和感受`,
              type: 'event_review_reminder',
              related_event_id: event.id,
              is_read: false
            })

          if (notificationError) {
            console.error(`为用户 ${registration.user_id} 创建评价提醒失败:`, notificationError)
          } else {
            notificationCount++
            console.log(`为用户 ${registration.user_id} 创建活动 ${event.title} 的评价提醒`)
          }
        } catch (error) {
          console.error(`创建评价提醒失败:`, error)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `成功发送 ${notificationCount} 条活动评价提醒通知`,
        eventsCount: events?.length || 0,
        notificationCount 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})