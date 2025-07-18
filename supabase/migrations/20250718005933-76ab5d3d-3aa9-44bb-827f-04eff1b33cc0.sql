-- Update existing user to be an organizer with better profile info
UPDATE public.profiles SET
  nickname = '张文博',
  organizer_name = '创新科技教育',
  organizer_description = '专注于科技教育和技术培训，致力于推广最新的编程技术和创新思维',
  roles = ARRAY['organizer'::user_role]
WHERE user_id = '7d116ace-cffb-4afb-a62f-ec107537617b';

-- Update all events with future dates so users can register
UPDATE public.events SET
  start_time = '2025-07-20 14:00:00+00',
  end_time = '2025-07-20 17:00:00+00',
  registration_deadline = '2025-07-19 23:59:59+00'
WHERE title = '2024年科技创新峰会';

UPDATE public.events SET
  start_time = '2025-07-25 09:00:00+00',
  end_time = '2025-07-25 16:00:00+00',
  registration_deadline = '2025-07-24 23:59:59+00'
WHERE title = 'React 开发实战工作坊';

UPDATE public.events SET
  start_time = '2025-07-19 07:00:00+00',
  end_time = '2025-07-19 09:00:00+00',
  registration_deadline = '2025-07-18 23:59:59+00'
WHERE title = '城市马拉松跑团周末训练';

UPDATE public.events SET
  start_time = '2025-07-26 19:30:00+00',
  end_time = '2025-07-26 22:00:00+00',
  registration_deadline = '2025-07-25 23:59:59+00'
WHERE title = '独立音乐现场演出';