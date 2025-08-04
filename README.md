# Light Event Hub 🎉

一个现代化的全栈事件管理平台，让活动组织者和参与者能够轻松创建、管理和参与各种活动。

## ✨ 主要功能

### 👥 用户管理
- 用户注册、登录和个人资料管理
- 角色系统（普通用户、组织者、管理员）
- 申请成为活动组织者功能

### 🎯 事件管理
- 创建和发布活动
- 活动详情展示（时间、地点、价格等）
- 活动状态管理（草稿、已发布、已结束）
- 活动封面图片上传
- 活动标签分类

### 📝 报名系统
- 在线活动报名
- 报名信息管理
- 支付状态跟踪
- 二维码签到功能
- 参与者管理

### 💬 互动功能
- 活动讨论区
- 讨论回复和置顶
- 活动评价系统
- 实时通知系统

### 📱 移动端支持
- 响应式设计，适配各种设备
- 通过 Capacitor 支持 iOS/Android 原生功能
- 二维码扫描功能

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件库**: shadcn-ui + Tailwind CSS
- **后端服务**: Supabase (PostgreSQL + Auth + Storage)
- **状态管理**: React Query + Context API
- **表单处理**: React Hook Form + Zod 验证
- **路由管理**: React Router v6
- **移动端**: Capacitor

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn 或 bun

### 本地开发

```bash
# 1. 克隆项目
git clone <YOUR_GIT_URL>

# 2. 进入项目目录
cd light-event-hub

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev
```

### 可用脚本

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 开发模式构建
npm run build:dev

# 代码检查
npm run lint

# 预览构建结果
npm run preview
```

### 环境配置

1. 复制 `.env.example` 到 `.env.local`
2. 配置 Supabase 相关环境变量
3. 启动开发服务器

## 📁 项目结构

```
light-event-hub/
├── src/
│   ├── components/          # React 组件
│   ├── pages/              # 页面组件
│   ├── contexts/           # React Context
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   ├── integrations/       # 第三方集成
│   └── assets/             # 静态资源
├── supabase/               # Supabase 配置和迁移
├── public/                 # 公共静态文件
└── ...
```

## 🔑 核心功能模块

### 🏠 首页 (`/`)
- 平台介绍和功能展示
- 最新活动推荐

### 📅 活动相关
- `/events` - 活动列表
- `/events/:id` - 活动详情
- `/events/create` - 创建活动
- `/events/:id/manage` - 管理活动
- `/my-events` - 我的活动

### 👤 用户相关
- `/auth` - 登录注册
- `/profile` - 个人资料
- `/become-organizer` - 申请成为组织者
- `/notifications` - 通知中心

### 🛡️ 管理功能
- `/admin` - 管理员面板

## 📋 TODO

- [ ] 讨论区优化
  - 改进讨论展示样式，二级回复显示 “回复 xx：”
  - 讨论删除功能
- [ ] 扫描二维码功能开发

## 📄 更多文档

- [项目详细文档](PROJECT_INFO.md)
- [服务条款](/terms)
- [隐私政策](/privacy)
