-- 创建用户角色枚举
CREATE TYPE public.user_role AS ENUM ('user', 'organizer');

-- 创建活动状态枚举
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'ended', 'cancelled');

-- 创建活动类型枚举
CREATE TYPE public.event_type AS ENUM ('conference', 'training', 'social', 'sports', 'performance', 'workshop', 'meetup', 'other');

-- 创建报名状态枚举
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected', 'payment_pending', 'paid', 'checked_in', 'cancelled');

-- 创建用户资料表
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  roles user_role[] DEFAULT ARRAY['user'::user_role],
  organizer_name TEXT, -- 主办方名称（当角色包含organizer时使用）
  organizer_description TEXT, -- 主办方介绍
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建活动表
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  event_type event_type NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  detailed_address TEXT,
  max_participants INTEGER DEFAULT 0, -- 0表示不限制
  registration_deadline TIMESTAMP WITH TIME ZONE,
  requires_approval BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  price_description TEXT,
  tags TEXT[],
  contact_info TEXT,
  status event_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建活动报名表
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_phone TEXT NOT NULL,
  participant_email TEXT,
  additional_info JSONB DEFAULT '{}',
  status registration_status DEFAULT 'pending',
  payment_amount DECIMAL(10,2) DEFAULT 0,
  verification_code TEXT UNIQUE, -- 核验码
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 创建活动讨论表
CREATE TABLE public.event_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.event_discussions(id) ON DELETE CASCADE, -- 用于回复
  title TEXT, -- 主贴有标题，回复没有
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false, -- 置顶功能
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建活动评价/回顾表
CREATE TABLE public.event_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[], -- 图片URL数组
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 创建通知表
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- 通知类型: registration_approved, event_reminder, etc.
  related_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略

-- Profiles策略
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events策略
CREATE POLICY "Everyone can view published events" ON public.events FOR SELECT USING (status != 'draft');
CREATE POLICY "Organizers can view their own events" ON public.events FOR SELECT USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update their own events" ON public.events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete their own events" ON public.events FOR DELETE USING (auth.uid() = organizer_id);

-- Event Registrations策略
CREATE POLICY "Users can view their own registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Organizers can view registrations for their events" ON public.event_registrations FOR SELECT USING (
  auth.uid() IN (SELECT organizer_id FROM public.events WHERE id = event_id)
);
CREATE POLICY "Users can create registrations" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own registrations" ON public.event_registrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Organizers can update registrations for their events" ON public.event_registrations FOR UPDATE USING (
  auth.uid() IN (SELECT organizer_id FROM public.events WHERE id = event_id)
);

-- Event Discussions策略
CREATE POLICY "Everyone can view discussions for published events" ON public.event_discussions FOR SELECT USING (
  NOT is_deleted AND event_id IN (SELECT id FROM public.events WHERE status != 'draft')
);
CREATE POLICY "Authenticated users can create discussions" ON public.event_discussions FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their own discussions" ON public.event_discussions FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Event organizers can update discussions in their events" ON public.event_discussions FOR UPDATE USING (
  auth.uid() IN (SELECT organizer_id FROM public.events WHERE id = event_id)
);

-- Event Reviews策略
CREATE POLICY "Everyone can view public reviews" ON public.event_reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own reviews" ON public.event_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reviews for events they attended" ON public.event_reviews FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.event_registrations 
    WHERE event_id = event_reviews.event_id 
    AND user_id = auth.uid() 
    AND status = 'checked_in'
  )
);
CREATE POLICY "Users can update their own reviews" ON public.event_reviews FOR UPDATE USING (auth.uid() = user_id);

-- Notifications策略
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.event_discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.event_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 创建用户注册时自动创建profile的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nickname, contact_email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建生成核验码的函数
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(encode(gen_random_bytes(6), 'base64'), 1, 8));
END;
$$ LANGUAGE plpgsql;