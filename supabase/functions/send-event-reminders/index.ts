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

    // 计算明天的日期范围
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    // 查找明天开始的活动
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select(`
        id, 
        title, 
        start_time,
        organizer_id
      `)
      .gte('start_time', tomorrow.toISOString())
      .lt('start_time', dayAfterTomorrow.toISOString())
      .eq('status', 'published')

    if (eventsError) {
      throw eventsError
    }

    console.log(`找到 ${events?.length || 0} 个明天开始的活动`)

    let notificationCount = 0

    // 为每个活动发送提醒
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

      // 为每个用户创建提醒通知
      for (const registration of registrations || []) {
        try {
          const { error: notificationError } = await supabaseClient
            .from('notifications')
            .insert({
              user_id: registration.user_id,
              title: '活动提醒',
              content: `您报名的活动"${event.title}"将于明天开始`,
              type: 'event_reminder',
              related_event_id: event.id,
              is_read: false
            })

          if (notificationError) {
            console.error(`为用户 ${registration.user_id} 创建通知失败:`, notificationError)
          } else {
            notificationCount++
          }
        } catch (error) {
          console.error(`创建通知失败:`, error)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `成功发送 ${notificationCount} 条活动提醒通知`,
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