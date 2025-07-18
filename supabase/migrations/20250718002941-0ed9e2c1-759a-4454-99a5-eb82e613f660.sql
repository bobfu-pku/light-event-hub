-- Update sample events with better organizer names and future dates
UPDATE events SET 
  start_time = '2025-07-25 14:00:00+00',
  end_time = '2025-07-25 17:00:00+00',
  registration_deadline = '2025-07-24 23:59:59+00'
WHERE title = '技术交流会';

UPDATE events SET 
  start_time = '2025-07-26 09:00:00+00',
  end_time = '2025-07-26 17:00:00+00',
  registration_deadline = '2025-07-25 23:59:59+00'
WHERE title = 'React 开发工作坊';

UPDATE events SET 
  start_time = '2025-07-27 19:00:00+00',
  end_time = '2025-07-27 22:00:00+00',
  registration_deadline = '2025-07-27 18:00:00+00'
WHERE title = '创业者聚会';

UPDATE events SET 
  start_time = '2025-07-28 15:00:00+00',
  end_time = '2025-07-28 18:00:00+00',
  registration_deadline = '2025-07-28 14:00:00+00'
WHERE title = '设计思维训练营';

UPDATE events SET 
  start_time = '2025-07-29 18:30:00+00',
  end_time = '2025-07-29 21:30:00+00',
  registration_deadline = '2025-07-29 17:00:00+00'
WHERE title = '产品经理沙龙';

-- Update organizer names in profiles
UPDATE profiles SET 
  nickname = 'TechHub团队',
  organizer_name = 'TechHub',
  organizer_description = '专注于技术交流与创新的社区组织'
WHERE user_id = (SELECT organizer_id FROM events WHERE title = '技术交流会' LIMIT 1);

UPDATE profiles SET 
  nickname = 'React中文社区',
  organizer_name = 'React中文社区',
  organizer_description = '致力于推广React技术的开发者社区'
WHERE user_id = (SELECT organizer_id FROM events WHERE title = 'React 开发工作坊' LIMIT 1);

UPDATE profiles SET 
  nickname = '创新工场',
  organizer_name = '创新工场',
  organizer_description = '支持创业者成长的孵化平台'
WHERE user_id = (SELECT organizer_id FROM events WHERE title = '创业者聚会' LIMIT 1);

UPDATE profiles SET 
  nickname = '设计师联盟',
  organizer_name = '设计师联盟',
  organizer_description = '连接设计师与创意思维的专业组织'
WHERE user_id = (SELECT organizer_id FROM events WHERE title = '设计思维训练营' LIMIT 1);

UPDATE profiles SET 
  nickname = '产品人社区',
  organizer_name = '产品人社区',
  organizer_description = '产品经理学习交流的专业平台'
WHERE user_id = (SELECT organizer_id FROM events WHERE title = '产品经理沙龙' LIMIT 1);