import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Plus, 
  User, 
  Settings, 
  LogOut, 
  Bell,
  Search
} from 'lucide-react';
import logoImage from '@/assets/lightevent-logo.png';

const Header = () => {
  const { user, profile, signOut, isOrganizer } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <img 
            src={logoImage} 
            alt="LightEvent" 
            className="h-8 w-8 rounded-md"
          />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LightEvent
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            to="/events" 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1"
          >
            <Calendar className="h-4 w-4" />
            <span>活动</span>
          </Link>
          
          {isOrganizer && (
            <Link 
              to="/organizer" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1"
            >
              <Settings className="h-4 w-4" />
              <span>主办管理</span>
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {/* Search */}
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Search className="h-4 w-4" />
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Bell className="h-4 w-4" />
              </Button>

              {/* Create Event Button (for organizers) */}
              {isOrganizer && (
                <Button 
                  variant="premium" 
                  size="sm" 
                  onClick={() => navigate('/create-event')}
                  className="hidden sm:flex"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  创建活动
                </Button>
              )}

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
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.nickname || '用户'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {isOrganizer && (
                        <p className="text-xs leading-none text-secondary">
                          主办方
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>个人资料</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/my-events')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>我的报名</span>
                  </DropdownMenuItem>
                  {!isOrganizer && (
                    <DropdownMenuItem onClick={() => navigate('/become-organizer')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>成为主办方</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                登录
              </Button>
              <Button variant="hero" onClick={() => navigate('/auth')}>
                注册
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;