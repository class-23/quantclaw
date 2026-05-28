# Checklist

## 全局悬浮按钮（Q 图标）
- [ ] 悬浮按钮为圆形（`border-radius: 50%`），尺寸 48px × 48px
- [ ] 按钮内部居中显示大写字母"Q"（白色、bold、22px）
- [ ] 按钮背景色为项目 accent 色（`var(--pc-accent)`）
- [ ] 悬浮按钮固定在页面右下角（`position: fixed; bottom: 24px; right: 24px`）
- [ ] 悬浮按钮 `z-index: 9999` 确保在所有内容之上
- [ ] 鼠标悬停时放大 1.1x + 发光阴影
- [ ] 未认证/登录页面不显示按钮

## 文件管理面板
- [ ] 点击 Q 按钮面板以 `slideInUp` 动画弹出
- [ ] 外层有半透明模糊遮罩（`rgba(0,0,0,0.6) + backdrop-filter: blur(8px)`）
- [ ] 面板使用 `glass-card` 风格深色主题
- [ ] 面板定位正确（`bottom: 88px; right: 24px`）
- [ ] 面板包含标题"文件管理"和关闭按钮
- [ ] 面包屑导航显示完整路径层级
- [ ] 工具栏包含上传、新建文件夹、新建文件按钮
- [ ] 点击遮罩区域或按 Escape 可关闭面板

## 文件浏览与导航
- [ ] 面板打开时调用 `GET /api/browse` 加载 shared 目录
- [ ] 文件和文件夹通过不同图标区分
- [ ] 点击文件夹进入子目录，面包屑同步更新
- [ ] 面包屑各级可点击跳转
- [ ] 返回上级目录功能正常
- [ ] 加载中有 spinner，空目录有提示，错误有显示

## 右键菜单
- [ ] 右键点击文件/文件夹弹出上下文菜单（阻止浏览器默认菜单）
- [ ] 菜单包含"重命名"和"删除"选项
- [ ] 菜单定位在鼠标点击位置附近
- [ ] 点击空白处或按 Escape 关闭菜单
- [ ] 删除项文字为红色（`#f87171`）
- [ ] 菜单项悬停时有背景高亮

## 文件/文件夹创建
- [ ] 点击"新建文件夹"弹出名称输入框，调用 `POST /api/browse/mkdir`
- [ ] 点击"新建文件"弹出名称输入框，调用创建文件 API
- [ ] 创建完成后列表立即刷新
- [ ] 403 protected 错误有明确提示

## 文件重命名
- [ ] 触发重命名后文件名变为 `<input>` 内联编辑框
- [ ] 按 Enter 确认、按 Escape 取消恢复原名
- [ ] 调用 rename/move API 后列表更新

## 文件删除
- [ ] 删除前弹出二次确认对话框（含文件名）
- [ ] 确认按钮使用 `btn-danger` 红色样式
- [ ] 确认后调用 `DELETE /api/browse/rmdir` 或对应 API
- [ ] 成功后列表更新 + 绿色 Toast
- [ ] 取消时不执行任何操作

## 文件上传（前端）
- [ ] 支持点击工具栏上传按钮选择文件
- [ ] 拖放文件到面板区域触发上传
- [ ] 拖放时面板有视觉提示（虚线边框）
- [ ] 上传时有进度指示
- [ ] 上传完成后自动刷新列表 + 绿色 Toast
- [ ] 上传失败显示红色 Toast（含错误信息）

## 文件上传（后端 `POST /api/browse/upload`）
- [ ] 端点使用 multipart/form-data 接收文件
- [ ] 验证文件大小不超过 10 MiB
- [ ] 拒绝路径穿越（含 `..` 的路径）
- [ ] 自动创建不存在的父目录
- [ ] 返回 `{ "uploaded": "path", "size": N }` JSON 响应
- [ ] 需要 Bearer Token 认证
- [ ] 错误时返回正确 HTTP 状态码 + `{ "error": "..." }` 响应体

## 文件预览
- [ ] 点击文本文件读取并显示内容
- [ ] 预览内容使用等宽字体（`var(--pc-font-mono)`）
- [ ] 二进制文件显示"无法预览"提示

## Toast 通知系统
- [ ] 操作成功显示绿色 Toast，3 秒消失
- [ ] 操作失败显示红色 Toast，含错误信息
- [ ] Toast 有入场/退场动画

## RESTful API 规范
- [ ] 所有 API 需要 `Authorization: Bearer <token>` 头
- [ ] 401 时返回 `{ "code": "unauthorized", "message": "..." }`
- [ ] 成功响应 JSON 字段名一致（`created`/`removed`/`uploaded`/`path`/`size`）
- [ ] 错误响应 HTTP 状态码准确（400/403/404/413/500）
- [ ] 路径安全：所有端点拒绝 `..` 穿越
- [ ] 文件操作范围限定在 shared/ 目录内

## 集成与加载
- [ ] 全局组件在所有认证页面均可见
- [ ] 组件不影响现有页面布局和功能
- [ ] API 调用使用项目统一的 `apiFetch` 封装
- [ ] 组件样式与现有设计系统一致（CSS 变量 + Tailwind）
- [ ] Rust 编译零 warning（`cargo clippy -- -D warnings`）
- [ ] TypeScript 编译零 error

## 视觉一致性验证（对标 AliasPromptDialog / SettingsModal / index.css）
- [ ] 所有颜色使用 `var(--pc-*)` CSS 变量，无硬编码 hex（状态色除外）
- [ ] UI 文本使用 `var(--pc-font-ui)` 字体，字号遵循 `0.875rem`/`0.75rem`/`0.8125rem` 层级
- [ ] 等宽文本（文件内容/代码）使用 `var(--pc-font-mono)` 字体
- [ ] 主操作按钮使用 `btn-electric` 类，次要使用 `btn-secondary`，危险使用 `btn-danger`
- [ ] 输入框使用 `input-electric` 类
- [ ] 面板容器使用 `glass-card` 或 `surface-panel` 类
- [ ] 确认/输入对话框严格复用 AliasPromptDialog 的三段式（Header/Body/Footer）+ 遮罩结构
- [ ] 关闭按钮使用 `<X size={16} />` lucide-react + `h-8 w-8 rounded-xl`
- [ ] 弹出动画使用项目已有类（`animate-fade-in`/`animate-fade-in-scale`/`animate-slide-in-up`）
- [ ] 过渡使用 `transition-colors`/`transition-all`，不自定义 transform/opacity 过渡
- [ ] 模态框包含 `role="dialog" aria-modal="true"` + `aria-label`
- [ ] Escape 键可关闭面板和右键菜单
- [ ] 所有功能图标使用 `lucide-react`（Folder/File/Upload/FolderPlus/FilePlus/ChevronLeft/X）
- [ ] 列表项类型标识使用 `lucide-react` `<Folder>`/`<File>`，无 emoji
- [ ] 滚动条使用项目全局 thin scrollbar 样式（不自定义覆盖）
- [ ] `md:` 断点下小屏自适应（面板占满、按钮缩小）
- [ ] `@media (prefers-reduced-motion: reduce)` 时动画降级
- [ ] 与 [SettingsModal](file:///d:/Trae项目/quantclaw/web/src/components/SettingsModal.tsx) 并排对比无风格断裂
