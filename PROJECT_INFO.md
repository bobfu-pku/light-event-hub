## 🏗️ 项目概览

这是一个现代化的全栈事件管理应用，使用 React + TypeScript + Supabase 构建，支持Web和移动端。

## 📁 根目录文件

### 配置文件
- **`package.json`**: 项目依赖管理，使用了 React 18、Vite、shadcn-ui、Supabase 等技术栈
- **`vite.config.ts`**: Vite 构建工具配置，设置路径别名和开发服务器
- **`capacitor.config.ts`**: Capacitor 移动端配置，支持 iOS/Android 应用构建
- **`tailwind.config.ts`**: Tailwind CSS 样式框架配置
- **`tsconfig.json`**: TypeScript 编译器配置
- **`eslint.config.js`**: ESLint 代码规范配置
- **`postcss.config.js`**: PostCSS 样式处理配置
- **`components.json`**: shadcn-ui 组件库配置

### 构建和依赖
- **`bun.lockb`**: Bun 包管理器锁定文件
- **`package-lock.json`**: npm 依赖锁定文件

## 📁 src/ 目录（主要源代码）

### 🎯 核心文件
- **`main.tsx`**: React 应用入口点
- **`App.tsx`**: 主应用组件，包含路由配置和全局Provider
- **`index.css`**: 全局样式文件
- **`vite-env.d.ts`**: Vite 环境类型声明

### 📄 页面组件 (pages/)
- **`Index.tsx`**: 首页/landing页面
- **`Auth.tsx`**: 用户认证页面（登录/注册）
- **`Events.tsx`**: 事件列表页面
- **`EventDetail.tsx`**: 事件详情页面
- **`CreateEvent.tsx`**: 创建事件页面
- **`ManageEvent.tsx`**: 管理事件页面
- **`MyEvents.tsx`**: 我的事件页面
- **`Profile.tsx`**: 用户个人资料页面
- **`BecomeOrganizer.tsx`**: 申请成为组织者页面
- **`TermsOfService.tsx`**: 服务条款页面
- **`PrivacyPolicy.tsx`**: 隐私政策页面
- **`NotFound.tsx`**: 404 错误页面

### 🧩 组件 (components/)
- **`EventCard.tsx`**: 事件卡片组件
- **`EventDiscussion.tsx`**: 事件讨论组件
- **`QRCodeScanner.tsx`**: 二维码扫描组件

#### 布局组件 (layout/)
- **`Header.tsx`**: 页面头部组件
- **`Layout.tsx`**: 页面布局容器组件

#### UI组件 (ui/)
完整的 shadcn-ui 组件库，包括：
- 基础组件：`button.tsx`, `input.tsx`, `card.tsx`, `dialog.tsx` 等
- 表单组件：`form.tsx`, `checkbox.tsx`, `select.tsx` 等
- 导航组件：`navigation-menu.tsx`, `tabs.tsx`, `breadcrumb.tsx` 等
- 反馈组件：`toast.tsx`, `alert.tsx`, `progress.tsx` 等
- 布局组件：`sidebar.tsx`, `sheet.tsx`, `resizable.tsx` 等

### 🎣 Hooks (hooks/)
- **`use-mobile.tsx`**: 移动端检测hook
- **`use-toast.ts`**: Toast通知hook

### 🌐 上下文 (contexts/)
- **`AuthContext.tsx`**: 用户认证状态管理

### 🔧 工具库 (lib/)
- **`utils.ts`**: 通用工具函数
- **`validation.ts`**: 表单验证规则

### 🔌 集成 (integrations/)
#### supabase/
- **`client.ts`**: Supabase 客户端配置
- **`types.ts`**: 数据库类型定义（包含event_discussions、events、profiles等表结构）

### 🖼️ 静态资源 (assets/)
- **`hero-background.jpg`**: 首页背景图片
- **`lightevent-logo.png`**: 应用Logo

## 📁 public/ 目录（静态资源）
- **`favicon.ico`**: 网站图标
- **`placeholder.svg`**: 占位符图片
- **`robots.txt`**: 搜索引擎爬虫配置

## 📁 supabase/ 目录（后端配置）

### 配置
- **`config.toml`**: Supabase 项目配置

### 数据库迁移 (migrations/)
包含多个SQL迁移文件，定义了数据库架构：
- 用户认证相关表
- 事件管理相关表
- 讨论功能相关表
- 权限和角色管理

### 云函数 (functions/)
- **`delete-user/index.ts`**: 删除用户的Edge Function

## 🎯 主要功能特性

1. **用户管理**: 注册、登录、个人资料管理
2. **事件管理**: 创建、编辑、查看、管理事件
3. **讨论功能**: 事件相关讨论和交流
4. **角色系统**: 普通用户和组织者角色
5. **二维码功能**: 支持二维码扫描
6. **移动端支持**: 通过Capacitor支持iOS/Android
7. **响应式设计**: 适配桌面和移动设备

## 🛠️ 技术栈总结

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS + shadcn-ui
- **后端服务**: Supabase (PostgreSQL + Auth + Storage)
- **状态管理**: React Query + Context API
- **表单处理**: React Hook Form + Zod验证
- **路由管理**: React Router v6
- **移动端**: Capacitor (支持原生功能如相机、二维码扫描)
- **开发工具**: ESLint + TypeScript + PostCSS

---

## 📊 Supabase 数据表概览

您的数据库中共有 **7个核心数据表**：

### 1. **profiles** (用户资料表)
**字段：** id, user_id, nickname, avatar_url, bio, contact_email, contact_phone, roles, organizer_name, organizer_description, created_at, updated_at

**触发操作：**
- **CREATE**: 用户注册时自动创建 (通过数据库触发器 `handle_new_user()`)
- **SELECT**: 获取用户资料信息 (`Profile.tsx`, `EventDetail.tsx`)
- **UPDATE**: 用户更新个人资料 (`Profile.tsx` 中的 `handleSaveProfile`)
- **DELETE**: 用户删除账户时 (`delete-user` Edge Function)

### 2. **events** (活动表)
**字段：** id, organizer_id, title, description, cover_image_url, event_type, start_time, end_time, location, max_participants, is_paid, price, status, tags 等

**触发操作：**
- **CREATE**: 主办方创建活动 (`CreateEvent.tsx` 中的 `handleSubmit`)
- **SELECT**: 
  - 活动列表页面获取所有已发布活动 (`Events.tsx`)
  - 我的活动页面获取主办方的活动 (`MyEvents.tsx`)
  - 活动详情页面 (`EventDetail.tsx`)
- **UPDATE**: 主办方编辑活动信息
- **DELETE**: 主办方删除活动 (`ManageEvent.tsx` 中的 `handleDeleteEvent`)

### 3. **event_registrations** (活动报名表)
**字段：** id, event_id, user_id, participant_name, participant_phone, participant_email, status, payment_amount, verification_code, checked_in_at, checked_in_by

**触发操作：**
- **CREATE**: 用户报名活动 (`EventDetail.tsx` 中的 `handleRegister`)
- **SELECT**: 
  - 获取用户的报名记录 (`MyEvents.tsx`)
  - 主办方查看活动报名情况 (`ManageEvent.tsx`)
- **UPDATE**: 
  - 主办方审核报名 (`ManageEvent.tsx` 中的 `handleRejectRegistration`)
  - 现场签到 (`ManageEvent.tsx` 中的 `handleCheckIn`)
  - 模拟支付状态更新 (`EventDetail.tsx` 中的 `simulatePayment`)

### 4. **event_discussions** (活动讨论表)
**字段：** id, event_id, author_id, parent_id, title, content, is_pinned, is_deleted, created_at, updated_at

**触发操作：**
- **CREATE**: 
  - 发布新讨论 (`EventDiscussion.tsx` 中的 `handlePostDiscussion`)
  - 回复讨论 (`EventDiscussion.tsx` 中的 `handleReply`)
- **SELECT**: 获取活动的讨论内容 (`EventDiscussion.tsx` 中的 `fetchDiscussions`)
- **UPDATE**: 
  - 置顶/取消置顶讨论 (`handleTogglePin`)
  - 删除讨论 (软删除，设置 `is_deleted = true`)

### 5. **event_reviews** (活动评价表)
**字段：** id, event_id, user_id, rating, comment, images, is_public, created_at, updated_at

**触发操作：**
- **CREATE**: 参与者对活动进行评价 (需要签到状态为 `checked_in`)
- **SELECT**: 查看活动的公开评价
- **UPDATE**: 用户修改自己的评价
- **DELETE**: 删除评价记录

### 6. **notifications** (通知表)
**字段：** id, user_id, title, content, type, related_event_id, is_read, created_at

**触发操作：**
- **CREATE**: 系统自动创建通知（报名审核结果、活动提醒等）
- **SELECT**: 用户查看通知列表
- **UPDATE**: 标记通知为已读

### 7. **organizer_applications** (主办方申请表)
**字段：** id, user_id, organizer_name, organizer_description, contact_email, contact_phone, status, admin_notes, reviewed_at, reviewed_by

**触发操作：**
- **CREATE**: 用户申请成为主办方 (`BecomeOrganizer.tsx` 中的 `handleSubmit`)
- **SELECT**: 
  - 检查申请状态 (`BecomeOrganizer.tsx` 中的 `checkApplicationStatus`)
  - 管理员查看待审核申请
- **UPDATE**: 
  - 管理员审核申请 (通过 `approve_organizer_application` 函数)
  - 更新申请状态和备注

## 🔄 主要触发场景汇总

### 用户操作触发：
1. **注册登录** → profiles 表自动创建
2. **更新资料** → profiles 表更新
3. **申请主办方** → organizer_applications 表创建
4. **创建活动** → events 表创建
5. **报名活动** → event_registrations 表创建
6. **发布讨论** → event_discussions 表创建
7. **活动签到** → event_registrations 表更新
8. **活动评价** → event_reviews 表创建

### 系统自动触发：
1. **用户注册** → 自动创建 profiles 记录
2. **更新操作** → 自动更新 `updated_at` 字段
3. **活动状态变化** → 可能触发通知创建
4. **报名审核** → 可能触发通知创建

### 管理操作触发：
1. **审核主办方申请** → organizer_applications 表更新 + profiles 表角色更新
2. **活动管理** → events 表的增删改查
3. **报名管理** → event_registrations 表状态更新

所有表都启用了 **RLS (Row Level Security)**，确保数据访问安全性。每个表都有相应的访问策略，控制用户只能访问自己有权限的数据。