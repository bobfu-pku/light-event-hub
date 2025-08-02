-- 添加管理员角色支持
-- 步骤1: 添加admin角色到user_role枚举
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- 步骤2: 为管理员添加RLS策略 - 管理员可以查看所有主办方申请
CREATE POLICY "Admins can view all organizer applications" 
ON public.organizer_applications 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 步骤3: 管理员可以更新主办方申请状态
CREATE POLICY "Admins can update organizer applications" 
ON public.organizer_applications 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 步骤4: 管理员可以查看和管理所有活动
CREATE POLICY "Admins can view all events" 
ON public.events 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all events" 
ON public.events 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all events" 
ON public.events 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 步骤5: 管理员可以查看和管理所有报名记录
CREATE POLICY "Admins can view all registrations" 
ON public.event_registrations 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all registrations" 
ON public.event_registrations 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 步骤6: 创建管理员专用函数 - 获取所有待审核申请
CREATE OR REPLACE FUNCTION public.get_pending_organizer_applications()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  organizer_name TEXT,
  organizer_description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_nickname TEXT,
  user_avatar_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    oa.id,
    oa.user_id,
    oa.organizer_name,
    oa.organizer_description,
    oa.contact_email,
    oa.contact_phone,
    oa.status,
    oa.created_at,
    p.nickname as user_nickname,
    p.avatar_url as user_avatar_url
  FROM public.organizer_applications oa
  LEFT JOIN public.profiles p ON oa.user_id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY oa.created_at DESC;
$$;

-- 步骤7: 创建管理员专用函数 - 审核主办方申请
CREATE OR REPLACE FUNCTION public.admin_review_organizer_application(
  application_id UUID,
  new_status TEXT,
  admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record RECORD;
BEGIN
  -- 检查调用者是否为管理员
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can review organizer applications';
  END IF;
  
  -- 检查状态是否有效
  IF new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;
  
  -- 获取申请记录
  SELECT * INTO app_record FROM public.organizer_applications 
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already reviewed';
  END IF;
  
  -- 更新申请状态
  UPDATE public.organizer_applications 
  SET 
    status = new_status,
    admin_notes = COALESCE(admin_review_organizer_application.admin_notes, ''),
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = application_id;
  
  -- 如果通过，则更新用户角色
  IF new_status = 'approved' THEN
    UPDATE public.profiles 
    SET 
      roles = CASE 
        WHEN 'organizer'::user_role = ANY(roles) THEN roles
        ELSE array_append(roles, 'organizer'::user_role)
      END,
      organizer_name = app_record.organizer_name,
      organizer_description = app_record.organizer_description,
      updated_at = now()
    WHERE user_id = app_record.user_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 步骤8: 设置指定邮箱为管理员 (bomingfu@foxmail.com)
-- 注意：这个操作需要在部署后手动执行，或者通过管理界面执行
UPDATE public.profiles 
SET roles = array_append(roles, 'admin'::user_role)
WHERE contact_email = 'bomingfu@foxmail.com' 
  AND NOT ('admin' = ANY(roles));

-- 为管理员用户同时添加主办方权限（因为管理员也是主办方）
UPDATE public.profiles 
SET roles = array_append(roles, 'organizer'::user_role)
WHERE contact_email = 'bomingfu@foxmail.com' 
  AND NOT ('organizer' = ANY(roles));