import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Users, 
  MessageSquare, 
  Star, 
  ArrowRight,
  CheckCircle,
  Zap,
  Heart
} from 'lucide-react';
import heroBackground from '@/assets/hero-background.jpg';
import logoImage from '@/assets/lightevent-logo.png';

const Index = () => {
  const { user, isOrganizer, loading } = useAuth();
  const navigate = useNavigate();

  // 已登录用户默认跳转到活动页面
  useEffect(() => {
    if (!loading && user) {
      navigate('/events');
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section 
        className="relative min-h-[80vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80" />
        <div className="relative z-10 container text-center text-white">
          <div className="mx-auto max-w-4xl">
            <img 
              src={logoImage} 
              alt="LightEvent" 
              className="h-20 mx-auto mb-6 rounded-xl shadow-2xl"
            />
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              让每个活动都
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-yellow-200">
                精彩纷呈
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed">
              轻量级活动管理平台，简化活动发布、报名、管理的每一个环节
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={() => navigate('/events')}
                    className="text-lg px-8 py-4"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    浏览活动
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  {isOrganizer ? (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => navigate('/events/create')}
                      className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <Zap className="mr-2 h-5 w-5" />
                      创建活动
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => navigate('/become-organizer')}
                      className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <Heart className="mr-2 h-5 w-5" />
                      成为主办方
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={() => navigate('/auth')}
                    className="text-lg px-8 py-4"
                  >
                    立即开始
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => navigate('/events')}
                    className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    浏览活动
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-card">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">为什么选择 LightEvent？</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              我们致力于提供最简单、最高效的活动管理体验
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow border-0 bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">简单发布</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  几分钟内发布专业的活动页面，支持多种活动类型和自定义设置
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow border-0 bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">智能管理</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  自动化报名审核、缴费管理和现场核验，让活动管理轻松无忧
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow border-0 bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">活动社区</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  每个活动都有专属讨论区，让参与者提前交流，建立社区氛围
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow border-0 bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mb-4">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">口碑积累</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  活动结束后的评价系统，帮助主办方改进，为参与者提供选择参考
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">数据说话</h2>
            <p className="text-xl text-white/90">
              越来越多的人选择 LightEvent 管理他们的活动
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">1000+</div>
              <div className="text-xl text-white/80">成功举办的活动</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">5000+</div>
              <div className="text-xl text-white/80">活跃用户</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">98%</div>
              <div className="text-xl text-white/80">用户满意度</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">如何开始？</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              三个简单步骤，开启您的活动管理之旅
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-bold mb-4">注册账户</h3>
              <p className="text-muted-foreground text-lg">
                免费注册，几秒钟完成账户创建，立即开始使用
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-secondary rounded-full flex items-center justify-center mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-bold mb-4">创建活动</h3>
              <p className="text-muted-foreground text-lg">
                填写活动信息，设置报名规则，一键发布专业活动页面
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-2xl font-bold mb-4">管理参与</h3>
              <p className="text-muted-foreground text-lg">
                自动化管理报名、审核、缴费，专注于活动本身
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-hero text-white">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-6">准备开始了吗？</h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            加入 LightEvent，让您的活动管理变得轻松高效
          </p>
          
          {!user && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/auth?tab=signup')}
              className="text-lg px-8 py-4 bg-white text-primary border-white hover:bg-white/90"
            >
              免费注册
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
