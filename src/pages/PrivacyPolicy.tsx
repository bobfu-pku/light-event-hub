import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
const PrivacyPolicy = () => {
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/auth">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回登录
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2 text-center">隐私政策</h1>
          <p className="text-muted-foreground text-center">最后更新时间：2025年7月</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>我们如何保护您的隐私</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. 信息收集</h2>
              <p className="text-muted-foreground mb-2">
                我们收集以下类型的信息：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>账户信息：</strong>注册时提供的邮箱、姓名等基本信息</li>
                <li><strong>活动信息：</strong>您创建或参与的活动相关数据</li>
                <li><strong>使用数据：</strong>您如何使用我们服务的信息，如访问时间、使用的功能等</li>
                <li><strong>设备信息：</strong>设备类型、操作系统、浏览器信息等</li>
                <li><strong>位置信息：</strong>仅在您明确授权的情况下收集</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. 信息使用</h2>
              <p className="text-muted-foreground mb-2">
                我们使用收集的信息用于：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>提供和改进我们的服务</li>
                <li>处理您的请求和交易</li>
                <li>向您发送重要通知和更新</li>
                <li>防范欺诈和滥用行为</li>
                <li>分析服务使用情况以优化用户体验</li>
                <li>遵守法律要求</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. 信息共享</h2>
              <p className="text-muted-foreground mb-2">
                我们不会出售您的个人信息。我们可能在以下情况下共享信息：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>征得您的同意：</strong>在获得您明确同意的情况下</li>
                <li><strong>服务提供商：</strong>与帮助我们运营服务的第三方合作伙伴</li>
                <li><strong>法律要求：</strong>为遵守法律、法规或法院命令</li>
                <li><strong>安全保护：</strong>为保护我们和用户的权利、财产或安全</li>
                <li><strong>业务转让：</strong>在公司重组或出售时</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. 数据安全</h2>
              <p className="text-muted-foreground">
                我们采用行业标准的安全措施保护您的信息，包括加密传输、访问控制、定期安全审计等。但请注意，没有任何系统是100%安全的，我们无法保证绝对的安全性。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. 数据保留</h2>
              <p className="text-muted-foreground">
                我们只在必要的时间内保留您的信息。一般情况下，账户信息在账户存续期间保留，活动数据在活动结束后保留一段时间以供查询。您可以随时要求删除您的个人信息。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. 您的权利</h2>
              <p className="text-muted-foreground mb-2">
                您对自己的个人信息享有以下权利：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>访问权：</strong>查看我们收集的关于您的信息</li>
                <li><strong>更正权：</strong>更新或修改不准确的信息</li>
                <li><strong>删除权：</strong>要求删除您的个人信息</li>
                <li><strong>限制处理权：</strong>限制我们处理您信息的方式</li>
                <li><strong>数据可携权：</strong>以可读格式获取您的数据</li>
                <li><strong>反对权：</strong>反对某些数据处理活动</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookie 使用</h2>
              <p className="text-muted-foreground">
                我们使用 Cookie 和类似技术来记住您的偏好、分析网站使用情况、提供个性化内容。您可以通过浏览器设置控制 Cookie 的使用，但这可能影响某些功能的正常使用。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. 第三方链接</h2>
              <p className="text-muted-foreground">
                我们的服务可能包含指向第三方网站的链接。我们不对这些网站的隐私做法负责。建议您在访问这些网站时查看其隐私政策。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. 儿童隐私</h2>
              <p className="text-muted-foreground">
                我们的服务不面向13岁以下的儿童。如果我们发现收集了儿童的个人信息，我们会立即删除这些信息。如果您认为我们可能收集了您孩子的信息，请联系我们。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. 政策更新</h2>
              <p className="text-muted-foreground">
                我们可能会不时更新此隐私政策。重大变更将通过邮件或网站通知您。继续使用服务即表示您接受更新后的政策。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. 联系我们</h2>
              <p className="text-muted-foreground">
                如果您对此隐私政策有任何疑问或想行使您的权利，请联系我们：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>邮箱：bomingfu@foxmail.com</li>
                
                
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default PrivacyPolicy;