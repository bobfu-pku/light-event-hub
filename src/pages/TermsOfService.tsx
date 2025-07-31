import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/auth">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回登录
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">服务条款</h1>
          <p className="text-muted-foreground">最后更新时间：2024年1月</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>欢迎使用 LightEvent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. 服务描述</h2>
              <p className="text-muted-foreground">
                LightEvent 是一个轻量级活动管理平台，为用户提供活动创建、管理、报名和参与等服务。通过使用我们的服务，您同意遵守本服务条款。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. 用户账户</h2>
              <p className="text-muted-foreground mb-2">
                使用本服务需要创建账户。您需要：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>提供准确、完整的注册信息</li>
                <li>保护账户安全，不与他人共享登录凭据</li>
                <li>及时更新账户信息</li>
                <li>对账户下的所有活动负责</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. 用户行为规范</h2>
              <p className="text-muted-foreground mb-2">
                使用本服务时，您不得：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>发布违法、有害、威胁、辱骂、诽谤的内容</li>
                <li>侵犯他人知识产权或其他权利</li>
                <li>传播垃圾信息或进行恶意营销</li>
                <li>干扰或破坏服务的正常运行</li>
                <li>利用服务进行任何违法活动</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. 活动管理</h2>
              <p className="text-muted-foreground">
                作为活动主办方，您需要确保活动信息的真实性和合法性。您有责任管理活动参与者，处理活动相关的争议和问题。我们保留审核和删除不当活动的权利。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. 知识产权</h2>
              <p className="text-muted-foreground">
                本服务的所有内容、功能和技术均为我们的知识产权。您使用服务时产生的内容，您保留所有权，但授予我们使用、展示这些内容的非独占性许可。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. 免责声明</h2>
              <p className="text-muted-foreground">
                我们按"现状"提供服务，不对服务的可用性、准确性或完整性作出保证。我们不对因使用服务而产生的任何直接或间接损失承担责任。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. 服务变更和终止</h2>
              <p className="text-muted-foreground">
                我们保留随时修改、暂停或终止服务的权利。我们会尽力提前通知重大变更，但不承担因服务变更或终止而产生的责任。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. 条款修改</h2>
              <p className="text-muted-foreground">
                我们可能会不时更新这些条款。重大变更将通过邮件或网站通知您。继续使用服务即表示您接受修改后的条款。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. 联系我们</h2>
              <p className="text-muted-foreground">
                如果您对这些服务条款有任何疑问，请通过以下方式联系我们：
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>邮箱：support@lightevent.com</li>
                <li>电话：400-123-4567</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;