# 管理员系统实现指南

## 功能概述

已成功实现三级用户权限系统：
- **普通用户**：基础用户，可以报名参加活动
- **主办方**：可以创建和管理自己的活动
- **管理员**：拥有最高权限，可以审核主办方申请、管理所有活动，同时也具备主办方权限

## 实现的功能

### 1. 管理员权限
- ✅ 审核主办方申请（通过/拒绝）
- ✅ 管理所有活动（查看、修改、删除）
- ✅ 管理活动报名（审核参与者）
- ✅ 具备主办方权限（可以发布活动）
- ✅ 专用管理员控制台界面

### 2. 数据库变更
- ✅ 添加 'admin' 角色到 user_role 枚举
- ✅ 新增管理员专用的 RLS 策略
- ✅ 创建管理员专用函数（审核申请、获取数据）

### 3. 前端功能
- ✅ 管理员控制台页面 (`/admin`)
- ✅ 主办方申请审核界面
- ✅ 活动管理界面
- ✅ 管理员专用导航菜单
- ✅ 权限控制和访问验证

## 部署步骤

### 1. 应用数据库迁移

首先应用主要的管理员角色迁移：

```bash
# 应用管理员角色和权限迁移
supabase db push
```

或者手动执行 SQL 文件：
```sql
-- 执行 supabase/migrations/add_admin_role.sql 文件中的所有 SQL 语句
```

### 2. 设置管理员用户

执行管理员用户设置脚本：

```sql
-- 执行 supabase/migrations/set_admin_user.sql 文件中的 SQL 语句
-- 这将把 bomingfu@foxmail.com 设置为管理员
```

或者在 Supabase 控制台的 SQL 编辑器中直接执行：

```sql
-- 为指定邮箱用户添加管理员角色
UPDATE public.profiles 
SET roles = CASE 
  WHEN 'admin' = ANY(roles) THEN roles
  ELSE array_append(roles, 'admin'::user_role)
END
WHERE contact_email = 'bomingfu@foxmail.com';

-- 确保管理员用户也有主办方权限
UPDATE public.profiles 
SET roles = CASE 
  WHEN 'organizer' = ANY(roles) THEN roles
  ELSE array_append(roles, 'organizer'::user_role)
END
WHERE contact_email = 'bomingfu@foxmail.com' 
  AND NOT ('organizer' = ANY(roles));
```

### 3. 部署前端代码

```bash
# 构建和部署前端应用
npm run build
# 或
yarn build
```

## 使用指南

### 管理员访问

1. 使用 `bomingfu@foxmail.com` 账号登录
2. 登录后，用户头像菜单中会显示"管理员"标识
3. 点击"管理员控制台"进入管理界面

### 管理员控制台功能

#### 主办方申请审核
- 查看所有待审核的主办方申请
- 审核申请（通过/拒绝）
- 添加审核备注
- 自动更新用户角色

#### 活动管理
- 查看所有活动列表
- 查看活动详情和报名情况
- 跳转到活动管理页面
- 统计数据展示

#### 统计信息
- 待审核申请数量
- 总活动数
- 已发布活动数
- 总报名人数

## 权限系统架构

### 数据库级别
- RLS (Row Level Security) 策略确保数据安全
- 管理员可以访问所有数据
- 普通用户只能访问自己的数据
- 主办方可以管理自己的活动

### 前端级别
- `useAuth` hook 提供 `isAdmin` 状态
- 路由级别的权限检查
- UI 组件根据权限显示/隐藏

### API 级别
- 使用 Supabase 的 SECURITY DEFINER 函数
- 管理员专用的安全函数
- 权限验证在服务端进行

## 主要文件变更

### 新增文件
- `src/pages/AdminDashboard.tsx` - 管理员控制台页面
- `supabase/migrations/add_admin_role.sql` - 管理员角色和权限迁移
- `supabase/migrations/set_admin_user.sql` - 设置管理员用户脚本

### 修改文件
- `src/contexts/AuthContext.tsx` - 添加 `isAdmin` 属性
- `src/components/layout/Header.tsx` - 添加管理员菜单和标识
- `src/App.tsx` - 添加管理员控制台路由

## 安全考虑

1. **数据库安全**：所有管理员操作都通过 RLS 策略保护
2. **API 安全**：使用 SECURITY DEFINER 函数确保权限检查
3. **前端安全**：权限检查在多个层级进行
4. **审计追踪**：所有审核操作都记录审核人和时间

## 扩展建议

### 未来可以添加的功能
1. **审核日志**：详细的管理员操作日志
2. **批量操作**：批量审核申请、批量管理活动
3. **统计报表**：更详细的数据分析和报表
4. **权限细分**：更细粒度的权限控制
5. **通知系统**：审核结果自动通知用户

### 维护建议
1. 定期检查管理员权限设置
2. 监控管理员操作日志
3. 备份关键数据
4. 定期更新安全策略

## 故障排除

### 常见问题

1. **管理员菜单不显示**
   - 检查用户是否正确设置为管理员角色
   - 验证数据库迁移是否正确应用

2. **权限验证失败**
   - 检查 RLS 策略是否正确创建
   - 验证管理员函数是否正确部署

3. **数据加载失败**
   - 检查管理员专用函数是否可用
   - 验证数据库连接和权限

### 调试方法
1. 在浏览器开发者工具中查看网络请求
2. 检查 Supabase 日志
3. 验证用户角色数据

---

**注意**：请确保在生产环境部署前充分测试所有功能，特别是权限控制相关的功能。