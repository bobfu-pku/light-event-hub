# 🚀 Cloudflare Pages 部署指南

本指南将帮助您将 Light Event Hub 部署到 Cloudflare Pages，使用 Cloudflare 的原生 Git 集成实现自动部署。

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
   - **部署命令**: `npx wrangler pages deploy dist`
   - **构建输出目录**: `dist`
   - **根目录**: `/`
   - **非生产分支构建**: ✅ 勾选
   - **非生产分支部署命令**: `npx wrangler pages deploy dist`

### 1.2 配置自定义域名

1. 在 Pages 项目页面，点击 **自定义域名**
2. 点击 **设置自定义域名**
3. 输入 `lightevent.bomingfu.com`
4. Cloudflare 会自动配置 DNS 记录（因为域名已托管在 Cloudflare）

## 🚀 步骤 2: 测试部署

1. 将所有更改推送到 `main` 分支：
   ```bash
   git add .
   git commit -m "配置 Cloudflare Pages 部署"
   git push origin main
   ```

2. 检查 Cloudflare Pages 部署：
   - 在 Cloudflare Dashboard 的 Pages 项目中查看部署状态
   - 观察构建和部署过程
   - 访问 `lightevent.bomingfu.com` 验证部署

## 🔄 自动化工作流

配置完成后，每次向 `main` 分支推送代码时：

1. Cloudflare Pages 会自动：
   - 检测到 GitHub 仓库变化
   - 安装依赖 (`npm ci`)
   - 运行构建 (`npm run build`)
   - 部署到生产环境 (`npx wrangler pages deploy dist`)
   - 处理全球 CDN 分发
   - 自动配置 HTTPS

2. 对于 Pull Request：
   - 自动创建预览部署
   - 提供预览链接在 PR 评论中

## 🔒 安全最佳实践

1. **仓库权限管理**: 确保只有授权人员可以推送到 `main` 分支
2. **监控部署**: 关注部署日志，确保没有敏感信息泄露
3. **域名安全**: 使用 Cloudflare 的安全功能保护域名

## 🐛 故障排除

### 构建失败
- 检查 Node.js 版本是否为 18
- 确保所有依赖都在 `package.json` 中
- 查看 Cloudflare Pages 构建日志

### 域名无法访问
- 确认 DNS 记录已正确配置
- 检查 Cloudflare SSL/TLS 设置
- 验证自定义域名配置

### 部署卡住
- 检查 Cloudflare Pages 服务状态
- 重新触发部署（推送新提交）

## 🌟 高级配置

### 环境变量（如需要）
如果将来需要环境变量（如不同的 Supabase 配置），可以在 Cloudflare Pages 项目设置的 **Environment Variables** 中添加：

| 变量名称 | 值 | 环境 |
|---------|-----|------|
| `NODE_ENV` | `production` | Production |
| `VITE_APP_NAME` | `Light Event Hub` | Production & Preview |

### 分支部署
当前配置支持：
- `main` 分支自动部署到生产环境
- Pull Request 会创建预览部署
- 所有分支都可以触发预览部署

### 构建优化
- 构建缓存自动启用
- 增量构建支持
- 全球 CDN 分发

## 📞 支持

如果遇到问题，可以：
1. 查看 Cloudflare Pages 部署日志
2. 检查 Cloudflare 社区论坛
3. 查看 GitHub 仓库的 Issues
4. 联系 Cloudflare 支持