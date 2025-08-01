import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;

interface Profile {
  id: string;
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  roles: string[];
  organizer_name: string | null;
  organizer_description: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isOrganizer: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 清理认证状态的工具函数
const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchUnreadNotificationCount = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching notification count:', error);
        return;
      }

      setUnreadNotificationCount(count || 0);
    } catch (error) {
      console.error('Error in fetchUnreadNotificationCount:', error);
    }
  };

  const refreshNotifications = async () => {
    if (user) {
      await fetchUnreadNotificationCount(user.id);
    }
  };

  useEffect(() => {
    // 设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // 延迟获取profile数据和通知数据避免死锁
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchUnreadNotificationCount(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUnreadNotificationCount(0);
        }
        
        setLoading(false);
      }
    );

    // 检查现有会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchUnreadNotificationCount(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 设置通知实时订阅
  useEffect(() => {
    if (!user) return;

    const notificationSubscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('收到新通知:', payload);
          // 刷新通知计数
          fetchUnreadNotificationCount(user.id);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('通知状态更新:', payload);
          // 刷新通知计数
          fetchUnreadNotificationCount(user.id);
        }
      )
      .subscribe();

    return () => {
      notificationSubscription.unsubscribe();
    };
  }, [user]);

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // 忽略错误继续
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: name ? { name } : undefined,
        }
      });

      if (error) {
        let errorMessage = "注册失败";
        
        // 检查是否为邮箱已注册的错误
        if (error.message.includes("User already registered") || 
            error.message.includes("already registered") ||
            error.message.includes("already been registered") ||
            error.message.includes("Email address is already registered")) {
          errorMessage = "该邮箱已注册账号，请直接登录或换个邮箱注册";
        } else {
          errorMessage = error.message;
        }
        
        toast({
          title: "注册失败",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "注册成功",
          description: "请检查您的邮箱完成验证",
          duration: 5000,
        });
      }

      return { error };
    } catch (error) {
      console.error('Registration error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // 忽略错误继续
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = "登录失败";
        
        // 检查是否为无效凭据错误
        if (error.message === "Invalid login credentials") {
          // 检查邮箱是否存在于profiles表中
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('contact_email', email)
            .single();
          
          if (!profileData) {
            errorMessage = "账号不存在，请先注册账号";
          } else {
            errorMessage = "密码错误，请重试";
          }
        } else {
          errorMessage = error.message;
        }
        
        toast({
          title: "登录失败",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      } else if (data.user) {
        toast({
          title: "登录成功",
          description: "欢迎回来！",
          duration: 5000,
        });
        // 强制页面刷新以确保干净的状态
        window.location.href = '/';
      }

      return { error };
    } catch (error) {
      console.error('Login error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // 忽略错误
      }
      
      // 强制页面刷新
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isOrganizer = profile?.roles?.includes('organizer') || false;
  const isAdmin = profile?.roles?.includes('admin') || false;

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isOrganizer,
    isAdmin,
    refreshProfile,
    unreadNotificationCount,
    refreshNotifications,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};