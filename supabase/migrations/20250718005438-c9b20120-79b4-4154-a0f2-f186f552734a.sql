-- Create new organizer profiles with realistic data using proper UUIDs
INSERT INTO public.profiles (user_id, nickname, contact_email, organizer_name, organizer_description, roles) VALUES
('11111111-1111-1111-1111-111111111111', '张文博', 'zhangwenbo@example.com', '创新科技教育', '专注于科技教育和技术培训，致力于推广最新的编程技术和创新思维', ARRAY['organizer'::user_role]),
('22222222-2222-2222-2222-222222222222', '李雅婷', 'liyating@example.com', '城市运动联盟', '组织各类户外运动和健身活动，倡导健康生活方式', ARRAY['organizer'::user_role]),
('33333333-3333-3333-3333-333333333333', '王晓明', 'wangxiaoming@example.com', '音乐现场工作室', '专业音乐活动策划，为独立音乐人提供演出平台', ARRAY['organizer'::user_role]),
('44444444-4444-4444-4444-444444444444', '陈思琪', 'chensiqi@example.com', '文化艺术中心', '举办各类文化艺术活动，传播优秀传统文化', ARRAY['organizer'::user_role]),
('55555555-5555-5555-5555-555555555555', '刘志强', 'liuzhiqiang@example.com', '商业创新学院', '专注商业培训和创业指导，帮助企业家成长', ARRAY['organizer'::user_role]);

-- Update events with new organizers and future dates
UPDATE public.events SET
  organizer_id = '11111111-1111-1111-1111-111111111111',
  start_time = '2025-07-20 14:00:00+00',
  end_time = '2025-07-20 17:00:00+00',
  registration_deadline = '2025-07-19 23:59:59+00'
WHERE title = '2024年科技创新峰会';

UPDATE public.events SET
  organizer_id = '11111111-1111-1111-1111-111111111111',
  start_time = '2025-07-25 09:00:00+00',
  end_time = '2025-07-25 16:00:00+00',
  registration_deadline = '2025-07-24 23:59:59+00'
WHERE title = 'React 开发实战工作坊';

UPDATE public.events SET
  organizer_id = '22222222-2222-2222-2222-222222222222',
  start_time = '2025-07-19 07:00:00+00',
  end_time = '2025-07-19 09:00:00+00',
  registration_deadline = '2025-07-18 23:59:59+00'
WHERE title = '城市马拉松跑团周末训练';

UPDATE public.events SET
  organizer_id = '33333333-3333-3333-3333-333333333333',
  start_time = '2025-07-26 19:30:00+00',
  end_time = '2025-07-26 22:00:00+00',
  registration_deadline = '2025-07-25 23:59:59+00'
WHERE title = '独立音乐现场演出';

-- Add some sample registrations for testing approval functionality
INSERT INTO public.event_registrations (event_id, user_id, participant_name, participant_phone, participant_email, status, payment_amount) VALUES
((SELECT id FROM events WHERE title = '2024年科技创新峰会'), '7d116ace-cffb-4afb-a62f-ec107537617b', '测试用户1', '13800138001', 'test1@example.com', 'pending', 0),
((SELECT id FROM events WHERE title = '2024年科技创新峰会'), '7d116ace-cffb-4afb-a62f-ec107537617b', '测试用户2', '13800138002', 'test2@example.com', 'pending', 0),
((SELECT id FROM events WHERE title = 'React 开发实战工作坊'), '7d116ace-cffb-4afb-a62f-ec107537617b', '张小明', '13800138003', 'zhangxiaoming@example.com', 'approved', 100);