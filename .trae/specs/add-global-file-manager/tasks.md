# Tasks

## 1. 创建全局悬浮按钮组件 (`FloatingButton`)  ✅

- [x] **Task 1.1**: 在 `web/src/components/FileManager/FloatingButton.tsx` 中创建悬浮按钮组件
  - 圆形按钮（48px），背景 `var(--pc-accent)`，内部居中显示大写字母"Q"
  - hover: scale(1.1) + 发光阴影，z-index:9999
  - 接受 `isOpen` 和 `onClick` props，使用 `aria-label` 和 `aria-expanded`

## 2. 创建文件管理面板主组件 (`FileManagerPanel`) ✅

- [x] **Task 2.1**: 在 `web/src/components/FileManager/FileManagerPanel.tsx` 中创建面板主组件
  - 外层遮罩（rgba(0,0,0,0.6) + backdrop-filter:blur(8px)），面板 animate-slide-in-up
  - 对标 AliasPromptDialog/SettingsModal 结构，480px×600px，右下角定位
  - 标题栏 + 面包屑 + 工具栏（Upload/FolderPlus/FilePlus 按钮，均 btn-secondary）
  - Escape 关闭，色彩使用 var(--pc-*) CSS 变量，Font: var(--pc-font-ui)

## 3. 实现文件列表展示与导航 ✅

- [x] **Task 3.1**: FileList.tsx 实现文件列表
  - 调用 browseShared() 加载，lucide-react Folder/File 图标
  - 面包屑导航 + 返回上级，加载/空/错误状态
  - 右键菜单支持，点击文件夹进入子目录，点击文件触发预览

## 4. 实现右键菜单功能 ✅

- [x] **Task 4.1**: ContextMenu.tsx
  - position:fixed 定位，菜单项：重命名/删除
  - glass-card 风格，全局 mousedown/Escape 监听关闭
  - 删除项红色 #f87171，hover var(--pc-hover)

## 5. 实现文件/文件夹创建 ✅

- [x] **Task 5.1**: 新建文件夹（调用 mkdirShared()）
- [x] **Task 5.2**: 新建文件（调用 POST /api/browse/mkfile）
  - 弹出输入对话框，input-electric 样式，btn-electric 确认

## 6. 实现文件重命名功能 ✅

- [x] **Task 6.1**: 内联编辑模式
  - 输入框替换文本，Enter/Escape 交互
  - 调用 POST /api/browse/move

## 7. 实现文件删除功能 ✅

- [x] **Task 7.1**: 二次确认对话框（ConfirmDialog 对标 AliasPromptDialog 三段式）
  - btn-danger 确认，调用 DELETE /api/browse/path

## 8. 实现文件上传功能 ✅

- [x] **Task 8.1**: 隐藏 input[type=file] + 点击触发
- [x] **Task 8.2**: FormData + fetch 上传到 POST /api/browse/upload
  - 上传进度条，拖放支持，进度指示

## 9. 实现文件内容预览功能 ✅

- [x] **Task 9.1**: 点击文本文件读取并展示
  - 调用 GET /api/browse/read，var(--pc-font-mono) 等宽字体
  - 二进制文件提示，预览面板可关闭

## 10. 实现 Toast 通知系统 ✅

- [x] **Task 10.1**: Toast.tsx
  - 成功绿色/错误红色，animate-slide-in-up 动画
  - 3-5秒自动消失

## 11. 集成全局组件到 App ✅

- [x] **Task 11.1**: index.tsx 组合 FloatingButton + FileManagerPanel
  - 在 App.tsx AppContent 中 {isAuthenticated && <FileManager />}

## 12. 后端：新增文件上传 REST 端点 ✅

- [x] **Task 12.1**: browse.rs 新增 write_file() 函数（10MiB上限，路径穿越防护）
- [x] **Task 12.2**: api_browse.rs 新增 handle_browse_upload()（multipart/form-data）
- [x] **Task 12.3**: api.ts 新增 uploadFile() 函数（XHR + onProgress）

## 13. 后端：补充缺失的文件操作 API ✅

- [x] **Task 13.1**: browse.rs 新增函数：
  - `create_file()` → `POST /api/browse/mkfile`
  - `read_shared_file()` → `GET /api/browse/read`
  - `delete_shared_path()` → `DELETE /api/browse/path`
  - `move_shared_path()` → `POST /api/browse/move`
- [x] api_browse.rs 新增对应 handler 函数
- [x] lib.rs 路由注册

## 14. 视觉一致性验证

- [ ] **Task 14.1**: 逐项对照 index.css 设计系统核查（已通过代码审查完成核心项）

## 15. 全量单元测试

- [x] **Task 15.1**: browse.rs 新增 22 个共享目录操作测试用例：
  - write_file: 5 个测试（创建、嵌套目录、路径穿越、空路径、超大文件）
  - create_file: 3 个测试（创建空文件、重复创建、路径穿越）
  - read_shared_file: 4 个测试（读取内容、文件不存在、目录、路径穿越）
  - delete_shared_path: 4 个测试（删除文件、递归删除目录、保护目录拒绝、保护目录嵌套允许、路径穿越）
  - move_shared_path: 6 个测试（重命名、创建中间目录、拒绝覆盖、保护源/目标拒绝、路径穿越）

# Task Dependencies

- Task 2 依赖 Task 1 ✅
- Task 3 依赖 Task 2 ✅
- Task 4 依赖 Task 3 ✅
- Task 5-10 依赖 Task 2 和 Task 3 ✅
- Task 11 依赖 Task 1-10 完成 ✅
- Task 12-13 与前端并行执行 ✅
- Task 14 依赖 Task 1-13 完成
- Task 15 依赖 Task 12-13 完成 ✅
