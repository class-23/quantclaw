# 全局悬浮文件管理面板 Spec

> **设计总纲**：本功能所有新增 UI 元素必须严格对齐项目已有的设计系统，以现有组件
> ([AliasPromptDialog](file:///d:/Trae项目/quantclaw/web/src/components/AliasPromptDialog.tsx)、
> [SettingsModal](file:///d:/Trae项目/quantclaw/web/src/components/SettingsModal.tsx)、
> [Sidebar](file:///d:/Trae项目/quantclaw/web/src/components/layout/Sidebar.tsx))
> 为参考蓝本，确保用户在新功能中不会感知到任何风格断裂。

## Why
当前 Web 仪表盘的文件管理功能仅嵌入在 Agent 工作区浏览器页面中，用户需要先导航到特定 Agent 的工作区才能管理文件。需要一个全局可访问的文件管理面板，使用户在任何页面都能快速进行文件操作，提升工作效率。

## What Changes
- 新增全局悬浮按钮组件（圆形、内含大写字母"Q"），固定在页面右下角
- 新增文件管理面板组件，以弹出层形式展示
- 集成已有的后端文件浏览 API（`/api/browse/*`、`/api/agents/{alias}/workspace/*`）
- **新增后端文件上传 REST 端点**（当前后端缺失文件上传功能）
- 实现右键菜单功能（重命名、删除等文件操作）
- 面板内支持文件上传、创建、删除、重命名、内容预览
- 所有 API 遵循 RESTful 规范，统一 Bearer Token 认证

## Impact
- Affected specs: 无现有 spec 受影响（全新功能）
- Affected code:
  - `web/src/components/` — 新增 `FileManager/` 组件目录
  - `web/src/App.tsx` — 在 `AppContent` 层级引入全局组件
  - `web/src/lib/api.ts` — 补充文件上传等 API 函数
  - `crates/zeroclaw-gateway/src/api_browse.rs` — **新增文件上传端点**
  - `crates/zeroclaw-runtime/src/browse.rs` — **新增文件写入/上传函数**

## ADDED Requirements

### Requirement: 全局悬浮按钮（圆形 Q 图标）
系统 SHALL 在所有已认证页面的右下角显示一个固定定位的圆形悬浮按钮，按钮内部居中显示大写字母"Q"。

#### Scenario: 悬浮按钮始终可见
- **WHEN** 用户已登录并浏览任何仪表盘页面
- **THEN** 页面右下角显示一个圆形按钮，内部显示大写字母"Q"

#### Scenario: 悬浮按钮悬停效果
- **WHEN** 用户将鼠标悬停在悬浮按钮上
- **THEN** 按钮放大 1.1 倍，阴影增强（`box-shadow: 0 8px 24px rgba(34,211,238,0.3)`），背景色加深

#### Scenario: 未认证时不显示
- **WHEN** 用户未完成配对认证
- **THEN** 悬浮按钮不呈现

#### Scenario: 按钮尺寸与样式
- **WHEN** 渲染悬浮按钮
- **THEN** 宽度和高度均为 48px，`border-radius: 50%`，使用项目 accent 色（`var(--pc-accent)`）作为背景，"Q"字母为白色、`font-weight: 700`、字体大小 22px

### Requirement: 文件管理面板弹出
系统 SHALL 在用户点击悬浮按钮后显示一个文件管理面板，点击面板外部或关闭按钮时关闭面板。

#### Scenario: 打开面板
- **WHEN** 用户点击悬浮按钮
- **THEN** 文件管理面板以 `slideInUp` 动画从右下角弹出显示，外层有半透明遮罩（`rgba(0,0,0,0.6)` + `backdrop-filter: blur(8px)`）

#### Scenario: 关闭面板
- **WHEN** 用户点击面板关闭按钮或点击面板外部遮罩区域
- **THEN** 面板以动画方式关闭

### Requirement: 文件操作功能
系统 SHALL 在文件管理面板中提供完整的文件操作功能，利用已有的后端 API。

#### Scenario: 浏览文件目录
- **WHEN** 面板打开
- **THEN** 调用 `GET /api/browse?path=` 显示 shared 工作区的文件列表

#### Scenario: 进入子目录
- **WHEN** 用户点击文件夹名称
- **THEN** 面板导航进入该文件夹，面包屑导航同步更新

#### Scenario: 返回上级目录
- **WHEN** 用户点击面包屑层级或返回按钮
- **THEN** 面板返回对应上级目录

### Requirement: 文件上传（后端 + 前端）
系统 SHALL 支持通过 multipart/form-data 上传文件到 shared 工作区。

#### Scenario: 后端文件上传端点
- **WHEN** 收到 `POST /api/browse/upload` 请求（Content-Type: multipart/form-data，字段名 `file`），附加 `path` 字段指定目标子目录
- **THEN** 验证文件大小不超过 10 MiB、拒绝 `..` 路径穿越，写入到 shared 目录下，返回 `{ uploaded: "relative/path", size: u64 }`

#### Scenario: 拖放上传
- **WHEN** 用户将文件拖放到上传区域
- **THEN** 显示上传进度指示器（百分比或进度条），上传完成后自动刷新文件列表

#### Scenario: 点击选择上传
- **WHEN** 用户点击上传区域
- **THEN** 弹出系统文件选择对话框，选择文件后通过 `POST /api/browse/upload` 上传

#### Scenario: 上传错误处理
- **WHEN** 上传出错（网络中断、文件过大、路径非法）
- **THEN** 返回对应 HTTP 状态码（400/413/500），附带 `{ "error": "描述信息" }` 的 JSON 响应体

### Requirement: 文件/文件夹创建
系统 SHALL 支持通过 REST API 在文件管理面板中创建新文件和新文件夹。

#### Scenario: 创建新文件夹
- **WHEN** 用户点击"新建文件夹"按钮，在对话框输入名称并确认
- **THEN** 调用 `POST /api/browse/mkdir`（Body: `{"path": "..."}`），成功后刷新列表

#### Scenario: 创建新文件
- **WHEN** 用户点击"新建文件"按钮，在对话框输入文件名并确认
- **THEN** 调用 `POST /api/browse/mkdir` 的扩展端点或使用 `POST /api/browse/upload` 上传空内容创建文件，成功后刷新列表

### Requirement: 右键菜单
系统 SHALL 在用户右键点击文件或文件夹时显示上下文菜单。

#### Scenario: 右键点击文件
- **WHEN** 用户在文件项上点击鼠标右键
- **THEN** 弹出包含"重命名"和"删除"选项的上下文菜单，菜单定位在鼠标点击位置

#### Scenario: 菜单自动关闭
- **WHEN** 上下文菜单已打开，用户点击页面其他区域或按 Escape
- **THEN** 上下文菜单自动关闭

#### Scenario: 菜单项悬停效果
- **WHEN** 用户将鼠标悬停在菜单项上
- **THEN** 菜单项背景变为 `var(--pc-hover)`，删除项文字为红色（`#f87171`）

### Requirement: 文件删除确认
系统 SHALL 在删除文件或文件夹前要求用户二次确认。

#### Scenario: 删除确认
- **WHEN** 用户点击删除操作
- **THEN** 弹出确认对话框，标题显示"确认删除"，内容显示待删除的文件/文件夹名称

#### Scenario: 确认删除
- **WHEN** 用户在确认对话框中点击"确认删除"
- **THEN** 调用 `DELETE /api/browse/rmdir`（文件夹）或对应删除端点，成功后刷新列表

#### Scenario: 取消删除
- **WHEN** 用户在确认对话框中点击"取消"
- **THEN** 对话框关闭，不执行任何操作

### Requirement: 文件重命名
系统 SHALL 支持文件/文件夹重命名功能。

#### Scenario: 重命名操作
- **WHEN** 用户触发重命名操作
- **THEN** 文件名变为可编辑 `<input>`，自动聚焦，用户输入新名称后按回车确认、按 Escape 取消

#### Scenario: 重命名成功
- **WHEN** 用户确认新名称
- **THEN** 调用 `POST /api/agents/{alias}/workspace/move` 或等效 rename API（Body: `{"from":"old","to":"new"}`），成功后刷新列表

### Requirement: 文件内容预览
系统 SHALL 支持文本文件在线预览。

#### Scenario: 预览文本文件
- **WHEN** 用户点击文本文件
- **THEN** 在面板内展开预览区域，以只读方式展示文件内容（使用等宽字体 `var(--pc-font-mono)`）

#### Scenario: 二进制文件
- **WHEN** 用户点击二进制文件
- **THEN** 显示"无法预览二进制文件"提示，提供下载选项

### Requirement: 操作反馈
系统 SHALL 对操作结果提供明确的反馈提示。

#### Scenario: 操作成功反馈
- **WHEN** 操作成功完成
- **THEN** 面板顶部显示绿色成功 Toast（`var(--color-status-success)`），3 秒后自动消失

#### Scenario: 操作失败反馈
- **WHEN** 操作失败
- **THEN** 面板顶部显示红色错误 Toast（`var(--color-status-error)`），包含后端返回的具体错误信息

### Requirement: RESTful API 规范
所有新增和已有文件相关 API SHALL 遵循统一的 RESTful 规范。

#### Scenario: 认证机制
- **WHEN** 任何文件相关 API 被调用
- **THEN** 请求头必须包含 `Authorization: Bearer <token>`，401 时返回 `{"code":"unauthorized","message":"..."}`

#### Scenario: 响应结构一致性
- **WHEN** API 返回成功响应
- **THEN** 响应体为 JSON 对象，包含明确的字段名（如 `{"uploaded":"path","size":1234}`、`{"removed":"path"}`、`{"created":"path"}`）

#### Scenario: 错误响应一致性
- **WHEN** API 返回错误
- **THEN** HTTP 状态码准确反映错误类型（400/403/404/413/500），响应体包含可读的 `error` 字段

#### Scenario: 路径安全验证
- **WHEN** API 处理文件路径参数
- **THEN** 必须在 I/O 操作前进行路径穿越检测（拒绝含 `..` 的路径）、限制操作范围在 shared/ 目录内

### Requirement: 视觉风格与交互一致性
文件管理面板所有 UI 组件 SHALL 严格遵循项目现有设计系统，以
[AliasPromptDialog](file:///d:/Trae项目/quantclaw/web/src/components/AliasPromptDialog.tsx) 和
[SettingsModal](file:///d:/Trae项目/quantclaw/web/src/components/SettingsModal.tsx) 为模态层参考蓝本，
以 [index.css](file:///d:/Trae项目/quantclaw/web/src/index.css) 为样式体系权威来源。

#### Scenario: 色彩系统
- **WHEN** 渲染任何 UI 元素的前景色、背景色、边框色
- **THEN** 必须使用 CSS 自定义属性（`var(--pc-bg-*)`/`var(--pc-border)`/`var(--pc-text-*)`/`var(--pc-accent)`），禁止硬编码颜色值（红色 `#f87171` 和状态色 `var(--color-status-*)` 除外）

#### Scenario: 字体系统
- **WHEN** 渲染用户界面文本（标题、按钮、列表项、提示）
- **THEN** 使用 `font-family: var(--pc-font-ui)`、字号遵循 `15px`/`0.875rem`/`0.75rem`/`0.8125rem` 的层级规范
- **WHEN** 渲染代码/文件内容/等宽文本
- **THEN** 使用 `font-family: var(--pc-font-mono)`、字号 `var(--pc-font-size-mono)`

#### Scenario: 组件类复用
- **WHEN** 实现按钮
- **THEN** 主操作使用 `btn-electric` 类（accent 背景 + 白色文字），次要操作使用 `btn-secondary` 类，危险操作使用 `btn-danger` 类，图标按钮使用 `btn-icon` 类，禁止重复实现已有的按钮样式

#### Scenario: 输入框
- **WHEN** 渲染文本输入框
- **THEN** 使用 `input-electric` 类（`var(--pc-bg-input)` 背景 + `var(--pc-border)` 边框 + focus 时 accent 光晕）

#### Scenario: 容器/卡片
- **WHEN** 渲染面板容器或列表区域
- **THEN** 使用 `glass-card`（半透明 + 模糊 + border）或 `surface-panel` 类

#### Scenario: 对话框/确认框样式
- **WHEN** 弹出确认删除、名称输入等对话框
- **THEN** 严格复用 [AliasPromptDialog](file:///d:/Trae项目/quantclaw/web/src/components/AliasPromptDialog.tsx) 的模板结构：`role="dialog" aria-modal="true"` + `fixed inset-0 z-50 flex items-center justify-center` 外层 + `rgba(0,0,0,0.6) backdrop-filter: blur(8px)` 遮罩 + `var(--pc-bg-base)` 圆角容器 + Header/Body/Footer 三段式布局

#### Scenario: 关闭按钮
- **WHEN** 渲染关闭按钮
- **THEN** 统一使用 `lucide-react` 的 `<X size={16} />` + `h-8 w-8 rounded-xl` + `var(--pc-text-muted)` 颜色 + hover 时 `var(--pc-hover)` 背景

#### Scenario: 滚动条
- **WHEN** 列表或预览区域需要滚动
- **THEN** 使用项目全局 scrollbar 样式（thin, `var(--pc-scrollbar-thumb)`/`var(--pc-scrollbar-track)`），不自定义覆盖

#### Scenario: 动画与过渡
- **WHEN** 元素出现/消失
- **THEN** 使用项目已有的动画类（`animate-fade-in`/`animate-fade-in-scale`/`animate-slide-in-up`）
- **WHEN** 鼠标悬停
- **THEN** 使用 `transition-colors`/`transition-all`（200ms-300ms duration），禁止硬编码 transform/opacity 过渡

#### Scenario: 无障碍
- **WHEN** 实现任何交互元素
- **THEN** 必须包含 `aria-label` 属性；模态框必须设置 `role="dialog"` + `aria-modal="true"`；Escape 键关闭弹层；焦点管理遵循 `:focus-visible` 全局样式

#### Scenario: 响应式设计
- **WHEN** 在移动端/小屏设备上显示面板
- **THEN** 面板宽度使用 `max-width: 95vw`，高度 `max-height: 85vh`，小屏时面板在移动端可占满屏幕（`w-full h-full`）；悬浮按钮在小屏上适当缩小但不消失

#### Scenario: 图标来源
- **WHEN** 需要使用图标（关闭、文件夹、文件、上传、新建等）
- **THEN** 必须使用 `lucide-react` 图标库（与项目其他组件一致），禁止使用 emoji（📁/📄/📤）作为功能图标；仅列表项类型标识允许使用简化的文本符号
