# 多语言适配指南

## 已完成的翻译文件

`contexts/locale-context.tsx` 已包含完整的中英文翻译，涵盖以下模块：

- **common**: 通用文本（按钮、状态等）
- **nav**: 导航栏
- **workspace**: 工作区
- **drawio**: DrawIO 编辑器
- **locale**: 语言切换
- **chat**: 聊天面板
- **model**: 模型配置
- **diagram**: 流程图操作
- **history**: 历史记录
- **showcase**: 示例画廊
- **quickAction**: 快捷操作
- **brief**: 智能简报
- **calibration**: 校准控制台
- **report**: 报告蓝图
- **toolbar**: 工具栏
- **sidebar**: 侧边栏
- **autoRepair**: 自动修复
- **session**: 会话状态
- **reset**: 重置
- **ppt**: PPT 工作室
- **error**: 错误信息
- **success**: 成功信息

## 如何在组件中使用

### 1. 导入 `useLocale` Hook

```tsx
import { useLocale } from "@/contexts/locale-context";
```

### 2. 在组件中使用

```tsx
export function MyComponent() {
  const { t } = useLocale();
  
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <button>{t("common.save")}</button>
      <p>{t("chat.placeholder")}</p>
    </div>
  );
}
```

### 3. 常用翻译键映射表

#### 按钮文本
- 保存 → `t("common.save")`
- 取消 → `t("common.cancel")`
- 确认 → `t("common.confirm")`
- 关闭 → `t("common.close")`
- 删除 → `t("common.delete")`
- 编辑 → `t("common.edit")`
- 创建 → `t("common.create")`
- 提交 → `t("common.submit")`
- 重置 → `t("common.reset")`
- 应用 → `t("common.apply")`
- 下一步 → `t("common.next")`
- 上一步 → `t("common.previous")`
- 完成 → `t("common.finish")`
- 复制 → `t("common.copy")`
- 已复制 → `t("common.copied")`
- 重试 → `t("common.retry")`
- 发送 → `t("common.send")`

#### 状态文本
- 加载中... → `t("common.loading")`
- 处理中... → `t("common.processing")`
- 成功 → `t("common.success")`
- 失败 → `t("common.failed")`
- 错误 → `t("common.error")`
- 警告 → `t("common.warning")`

#### 模型配置
- 模型配置 → `t("model.title")`
- 选择模型 → `t("model.select")`
- 当前模型 → `t("model.current")`
- 温度 → `t("model.temperature")`
- 最大令牌数 → `t("model.maxTokens")`
- 保存配置 → `t("model.saveConfig")`
- 重置配置 → `t("model.resetConfig")`
- 模型对比 → `t("model.comparison")`

#### 聊天相关
- 输入消息... → `t("chat.placeholder")`
- 发送 → `t("chat.send")`
- 新建对话 → `t("chat.newConversation")`
- 清除历史 → `t("chat.clearHistory")`
- 思考中... → `t("chat.thinking")`
- 暂无消息 → `t("chat.empty")`
- 附件 → `t("chat.attachments")`
- 上传图片 → `t("chat.imageUpload")`

#### 图表操作
- 流程图 → `t("diagram.title")`
- 创建流程图 → `t("diagram.create")`
- 导出流程图 → `t("diagram.export")`
- 清空画布 → `t("diagram.clear")`
- 历史记录 → `t("diagram.history")`
- 版本 → `t("diagram.version")`
- 恢复 → `t("diagram.restore")`
- 自动修复 → `t("diagram.autoRepair")`

#### 历史记录
- 历史记录 → `t("history.title")`
- 查看历史 → `t("history.viewHistory")`
- 暂无历史记录 → `t("history.noHistory")`
- 确定要恢复到此版本吗？ → `t("history.restoreConfirm")`
- 已成功恢复到版本 → `t("history.restoreSuccess")`PT 工作室
- PPT 工作室 → `t("ppt.title")`
- 创建演示文稿 → `t("ppt.createPresentation")`
- 导出 PPT → `t("ppt.exportPPT")`
- 填写需求 → `t("ppt.stepper.brief")`
- 编辑大纲 → `t("ppt.stepper.blueprint")`
- 生成内容 → `t("ppt.stepper.compose")`
- 导出文件 → `t("ppt.stepper.export")`

## 需要修改的文件清单

### 高优先级（核心功能）
1. ✅ `app/page.tsx` - 已完成
2. ✅ `app/layout.tsx` - 已完成
3. ✅ `components/workspace-nav.tsx` - 已完成
4. ✅ `components/language-switcher.tsx` - 已完成
5. `components/chat-panel-optimized.tsx`
6. `components/model-config-dialog.tsx`
7. `components/model-comparison-config-dialog.tsx`
8. `components/history-dialog.tsx`
9. `components/chat-input-optimized.tsx`

### 中优先级（常用功能）
10. `components/chat-message-display.tsx`
11. `components/flowpilot-brief.tsx`
12. `components/quick-action-bar.tsx`
13. `components/chat-example-panel.tsx`
14. `components/calibration-console.tsx`
15. `components/report-blueprint-tray.tsx`
16. `features/chat-panel/components/auto-repair-banner.tsx`
17. `features/chat-panel/components/intelligence-toolbar.tsx`
18. `features/chat-panel/components/tool-panel-sidebar.tsx`

### 低优先级（辅助功能）
19. `components/file-preview-list.tsx`
20. `components/flow-showcase-gallery.tsx`
21. `components/session-status.tsx`
22. `components/reset-warning-modal.tsx`
23. `components/model-selector.tsx`

### PPT 工作室模块
24. `app/ppt/page.tsx`
25. `features/ppt-studio/components/ppt-workspace.tsx`
26. `features/ppt-studio/components/ppt-stepper.tsx`
27. `features/ppt-studio/components/brief-form.tsx`
28. `features/ppt-studio/components/blueprint-editor.tsx`
29. `features/ppt-studio/components/slide-composer.tsx`
30. `features/ppt-studio/components/slide-preview-modal.tsx`

### Context 文件
31. `contexts/conversation-context.tsx`
32. `contexts/diagram-context.tsx`
33. `contexts/ppt-studio-context.tsx`

## 修改示例

### 示例 1: 简单文本替换

**修改前:**
```tsx
<Button>保存</Button>
```

**修改后:**
```tsx
const { t } = useLocale();
<Button>{t("common.save")}</Button>
```

### 示例 2: 标题和描述

**修改前:**
```tsx
<DialogTitle>模型配置</DialogTitle>
<DialogDescription>选择和配置 AI 模型</DialogDescription>
```

**修改后:**
```tsx
const { t } = useLocale();
<DialogTitle>{t("model.title")}</DialogTitle>
<DialogDescription>{t("model.select")}</DialogDescription>
```

### 示例 3: 占位符文本

**修改前:**
```tsx
<input placeholder="输入消息..." />
```

**修改后:**
```tsx
const { t } = useLocale();
<input placeholder={t("chat.placeholder")} />
```

### 示例 4: 条件渲染文本

**修改前:**
```tsx
{isLoading ? "加载中..." : "完成"}
```

**修改后:**
```tsx
const { t } = useLocale();
{isLoading ? t("common.loading") : t("common.completed")}
```

### 示例 5: 确认对话框

**修改前:**
```tsx
const confirmed = window.confirm("确定要删除吗？");
```

**修改后:**
```tsx
const { t } = useLocale();
const confirmed = window.confirm(t("common.deleteConfirm"));
```

## 批量修改脚本

如果需要批量处理，可以使用以下模式：

```bash
# 1. 在文件开头添加导入
import { useLocale } from "@/contexts/locale-context";

# 2. 在组件函数开头添加
const { t } = useLocale();

# 3. 替换常见文本（可以使用编辑器的查找替换功能）
"保存" → {t("common.save")}
"取消" → {t("common.cancel")}
"确认" → {t("common.confirm")}
# ... 等等
```

## 测试检查清单

完成翻译后，请检查：

- [ ] 所有中文文本已被 `t()` 函数包裹
- [ ] 导入了 `useLocale` hook
- [ ] 翻译键在 `locale-context.tsx` 中存在
- [ ] 切换语言后，所有文本正确显示
- [ ] 占位符、提示文本、错误信息都已翻译
- [ ] 构建成功无错误
- [ ] 页面功能正常

## 常见问题

### Q: 找不到合适的翻译键怎么办？

A: 可以在 `locale-context.tsx` 中添加新的翻译键。确保中英文都添加。

### Q: 如何处理动态文本？

A: 使用模板字符串或拼接：
```tsx
const message = `${t("common.saved")} ${fileName}`;
```

### Q: 如何处理复数形式？

A: 目前简单处理，可以添加单独的键：
```tsx
{count === 1 ? t("model.model") : t("model.models")}
```

### Q: 如何处理带参数的文本？

A: 目前使用简单拼接，未来可以考虑使用 i18n 库的插值功能。

## 贡献指南

如果你要添加新功能：

1. 首先在 `locale-context.tsx` 添加翻译
2. 在组件中使用 `t()` 函数
3. 测试中英文切换
4. 更新此文档

## 注意事项

- 不要硬编码任何用户可见的文本
- 保持翻译键的命名一致性
- 遵循现有的命名空间结构
- 定期检查翻译的完整性
