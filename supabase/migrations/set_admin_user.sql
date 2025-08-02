-- 设置指定用户为管理员
-- 注意：请在数据库迁移应用后执行此脚本

-- 为指定邮箱用户添加管理员角色
UPDATE public.profiles 
SET roles = CASE 
  WHEN 'admin' = ANY(roles) THEN roles
  ELSE array_append(roles, 'admin'::user_role)
END
WHERE contact_email = 'bomingfu@foxmail.com';

-- 确保管理员用户也有主办方权限（因为管理员也是主办方）
UPDATE public.profiles 
SET roles = CASE 
  WHEN 'organizer' = ANY(roles) THEN roles
  ELSE array_append(roles, 'organizer'::user_role)
END
WHERE contact_email = 'bomingfu@foxmail.com' 
  AND NOT ('organizer' = ANY(roles));

-- 验证设置结果
SELECT 
  user_id,
  nickname,
  contact_email,
  roles,
  organizer_name
FROM public.profiles 
WHERE contact_email = 'bomingfu@foxmail.com';