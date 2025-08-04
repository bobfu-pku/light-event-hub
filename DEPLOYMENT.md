# 🚀 Cloudflare Pages 部署指南

本指南将帮助您将 Light Event Hub 部署到 Cloudflare Pages，并配置 GitHub Actions 自动 CI/CD。

## 📋 前置要求

1. GitHub 账户和仓库
2. Cloudflare 账户
3. 域名 bomingfu.com 已托管在 Cloudflare

## 🔧 步骤 1: 配置 Cloudflare Pages

### 1.1 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择您的账户
3. 在左侧菜单中点击 **Pages**
4. 点击 **创建项目**
5. 选择 **连接到 Git**
6. 连接您的 GitHub 账户并选择此项目仓库
7. 配置构建设置：
   - **项目名称**: `lightevent-bomingfu`
   - **生产分支**: `main`
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - **Node.js 版本**: `18`

### 1.2 配置自定义域名

1. 在 Pages 项目页面，点击 **自定义域名**
2. 点击 **设置自定义域名**
3. 输入 `lightevent.bomingfu.com`
4. Cloudflare 会自动配置 DNS 记录（因为域名已托管在 Cloudflare）

## 🔑 步骤 2: 获取 Cloudflare 凭据

### 2.1 获取 Cloudflare API Token

1. 进入 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **创建令牌**
3. 选择 **Cloudflare Pages:Edit** 模板
4. 配置权限：
   - **账户**: 选择您的账户
   - **区域**: 选择 `bomingfu.com`
   - **页面**: 所有页面
5. 点击 **继续以显示摘要**
6. 点击 **创建令牌**
7. **复制并保存此令牌**（只显示一次）

### 2.2 获取 Cloudflare Account ID

1. 在 Cloudflare Dashboard 首页右侧栏找到 **Account ID**
2. 复制此 ID

## ⚙️ 步骤 3: 配置 GitHub Secrets

1. 进入您的 GitHub 仓库
2. 点击 **Settings** > **Secrets and variables** > **Actions**
3. 点击 **New repository secret** 添加以下密钥：

| 密钥名称 | 值 | 描述 |
|---------|-----|------|
| `CLOUDFLARE_API_TOKEN` | 第2.1步获取的 API Token | Cloudflare API 访问令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | 第2.2步获取的 Account ID | Cloudflare 账户 ID |

## 🚀 步骤 4: 测试部署

1. 将所有更改推送到 `main` 分支：
   ```bash
   git add .
   git commit -m "配置 Cloudflare Pages 部署"
   git push origin main
   ```

2. 查看 GitHub Actions 工作流：
   - 进入仓库的 **Actions** 标签页
   - 观察构建和部署过程

3. 检查 Cloudflare Pages：
   - 在 Cloudflare Dashboard 的 Pages 项目中查看部署状态
   - 访问 `lightevent.bomingfu.com` 验证部署

## 🔄 自动化工作流

配置完成后，每次向 `main` 分支推送代码时：

1. GitHub Actions 会自动：
   - 安装依赖
   - 运行构建
   - 将构建文件部署到 Cloudflare Pages

2. Cloudflare Pages 会：
   - 自动更新网站内容
   - 处理全球 CDN 分发
   - 自动配置 HTTPS

## 🔒 安全最佳实践

1. **API Token 权限最小化**: 确保 API Token 只有必要的权限
2. **定期轮换密钥**: 定期更新 Cloudflare API Token
3. **监控部署**: 关注部署日志，确保没有敏感信息泄露

## 🐛 故障排除

### 构建失败
- 检查 Node.js 版本是否为 18
- 确保所有依赖都在 `package.json` 中

### 域名无法访问
- 确认 DNS 记录已正确配置
- 检查 Cloudflare SSL/TLS 设置

### API Token 错误
- 验证 Token 权限是否正确
- 确认 Account ID 是否匹配

## 🌟 高级配置

### 环境变量（如需要）
如果将来需要环境变量（如不同的 Supabase 配置），可以在：
1. Cloudflare Pages 项目设置中添加环境变量
2. GitHub Actions workflow 中设置 `env` 配置

### 分支部署
当前配置支持：
- `main` 分支自动部署到生产环境
- Pull Request 会创建预览部署

## 📞 支持

如果遇到问题，可以：
1. 查看 GitHub Actions 日志
2. 查看 Cloudflare Pages 部署日志
3. 检查 Cloudflare 社区论坛
4. 联系 Cloudflare 支持