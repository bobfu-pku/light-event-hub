import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Plus, User, Settings, LogOut, Bell, Search, Shield } from 'lucide-react';
import logoImage from '@/assets/lightevent-logo.png';
const Header = () => {
  const {
    user,
    profile,
    signOut,
    isOrganizer,
    isAdmin,
    unreadNotificationCount,
    refreshNotifications
  } = useAuth();
  const navigate = useNavigate();
  
  // 添加调试信息
  console.log('Header - 当前未读通知数量:', unreadNotificationCount);
  const handleSignOut = async () => {
    await signOut();
  };
  return <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <img src={logoImage} alt="LightEvent" className="h-8 w-8 rounded-md" />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LightEvent
          </span>
        </Link>

        {/* Navigation */}
        

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {user ? <>
              {/* Search */}
              

              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden sm:flex relative"
                onClick={async () => {
                  console.log('点击刷新通知');
                  await refreshNotifications();
                  navigate('/notifications');
                }}
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  </div>
                )}
              </Button>



              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.nickname || ''} />
                      <AvatarFallback>
                        {profile?.nickname?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                        </span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.nickname || '用户'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {isAdmin && <p className="text-xs leading-none text-red-600 font-medium">
                          管理员
                        </p>}
                      {isOrganizer && !isAdmin && <p className="text-xs leading-none text-secondary">
                          主办方
                        </p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>管理员后台</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isOrganizer ? (
                    <DropdownMenuItem onClick={() => navigate('/events/create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>发布活动</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate('/become-organizer')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>成为主办方</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/my-events')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>我的活动</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    console.log('点击通知中心，当前通知数量:', unreadNotificationCount);
                    await refreshNotifications();
                    navigate('/notifications');
                  }}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>通知中心</span>
                      </div>
                      {unreadNotificationCount > 0 && (
                        <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-medium">
                            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>账户设置</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </> : <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                登录
              </Button>
              <Button variant="hero" onClick={() => navigate('/auth?tab=signup')}>
                注册
              </Button>
            </div>}
        </div>
      </div>
    </header>;
};
export default Header;