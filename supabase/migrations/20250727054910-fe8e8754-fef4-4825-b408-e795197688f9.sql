-- Create organizer_applications table for secure approval workflow
CREATE TABLE public.organizer_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_description TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;

-- Users can create their own applications
CREATE POLICY "Users can create their own organizer applications" 
ON public.organizer_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own applications
CREATE POLICY "Users can view their own organizer applications" 
ON public.organizer_applications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their pending applications
CREATE POLICY "Users can update their pending organizer applications" 
ON public.organizer_applications 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

-- Create trigger for updated_at
CREATE TRIGGER update_organizer_applications_updated_at
BEFORE UPDATE ON public.organizer_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = has_role.user_id 
    AND role_name = ANY(profiles.roles)
  );
$$;

-- Create security definer function to safely grant organizer role
CREATE OR REPLACE FUNCTION public.approve_organizer_application(application_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record RECORD;
BEGIN
  -- Get application details
  SELECT * INTO app_record 
  FROM public.organizer_applications 
  WHERE id = application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update profile with organizer role and info
  UPDATE public.profiles 
  SET 
    roles = CASE 
      WHEN 'organizer' = ANY(roles) THEN roles 
      ELSE array_append(roles, 'organizer'::user_role)
    END,
    organizer_name = app_record.organizer_name,
    organizer_description = app_record.organizer_description,
    contact_email = COALESCE(app_record.contact_email, contact_email),
    contact_phone = COALESCE(app_record.contact_phone, contact_phone),
    updated_at = now()
  WHERE user_id = app_record.user_id;
  
  -- Mark application as approved
  UPDATE public.organizer_applications 
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = application_id;
  
  RETURN TRUE;
END;
$$;

-- Fix search path vulnerabilities in existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nickname, contact_email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN upper(substring(encode(gen_random_bytes(6), 'base64'), 1, 8));
END;
$$;