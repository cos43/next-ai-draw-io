# 多语言迁移指南

## 已完成的工作

✅ 创建了集中的翻译配置文件 `/locales/translations.ts`
✅ 更新了 `locale-context.tsx` 以支持参数替换
✅ 主页面和导航栏已完成翻译适配

## 翻译覆盖范围

已在 `translations.ts` 中添加以下模块的完整翻译：

1. **通用** (common) - 按钮、操作、状态等
2. **导航** (nav) - 导航栏文本
3. **工作区** (workspace) - 工作区相关
4. **DrawIO** (drawio) - 编辑器相关
5. **聊天面板** (chat) - 聊天界面
6. **模型配置** (model) - 模型设置
7. **历史记录** (history) - 版本历史
8. **快捷操作** (quickAction) - 快捷按钮
9. **FlowPilot Brief** (brief) - 配置面板
10. **Intent/Tone/Focus/Guardrail/DiagramType** - 各种选项
11. **比对功能** (comparison) - 模型比对
12. **自动修复** (autoRepair) - 自动修复
13. **智能工具栏** (toolbar) - 工具栏
14. **PPT Studio** (ppt) - PPT 相关
15. **文件操作** (file) - 文件管理
16. **错误/成功消息** (errors/success) - 提示信息
17. **确认对话框** (confirm) - 确认提示
18. **其他** - 校准、展示、会话、工具面板等

## 如何在组件中使用

### 基本用法

```tsx
import { useLocale } from "@/contexts/locale-context";

function MyComponent() {
  const { t } = useLocale();
  
  return (
    <div>
      <h1>{t("chat.title")}</h1>
      <button>{t("common.save")}</button>
      <p>{t("chat.placeholder")}</p>
    </div>
  );
}
```

### 带参数的用法

```tsx
const count = 5;
<p>{t("history.totalVersions", { count })}</p>
// 输出: "共 5 个版本" (中文) 或 "5 versions total" (英文)
```

### 替换硬编码中文的步骤

1. 找到硬编码的中文字符串
2. 在 `translations.ts` 中找到对应的翻译键（或添加新的）
3. 使用 `t()` 函数替换

**示例：**

```tsx
// ❌ 之前
<Button>保存</Button>

// ✅ 之后
<Button>{t("common.save")}</Button>
```

## 需要迁移的组件列表

### 高优先级（核心功能）

- [ ] `components/chat-panel-optimized.tsx` - 主聊天面板
- [ ] `components/chat-input-optimized.tsx` - 聊天输入
- [ ] `components/chat-message-display.tsx` - 消息显示
- [ ] `components/model-config-dialog.tsx` - 模型配置
- [ ] `components/model-selector.tsx` - 模型选择器
- [ ] `components/history-dialog.tsx` - 历史记录
- [ ] `components/quick-action-bar.tsx` - 快捷操作
- [ ] `components/flowpilot-brief.tsx` - Brief 配置
- [ ] `features/chat-panel/components/intelligence-toolbar.tsx` - 智能工具栏
- [ ] `features/chat-panel/components/auto-repair-banner.tsx` - 自动修复横幅
- [ ] `features/chat-panel/components/tool-panel-sidebar.tsx` - 工具面板

### 中优先级（辅助功能）

- [ ] `components/comparison-review-modal.tsx` - 比对审阅
- [ ] `components/model-comparison-config-dialog.tsx` - 比对配置
- [ ] `components/calibration-console.tsx` - 校准控制台
- [ ] `components/flow-showcase-gallery.tsx` - 示例画廊
- [ ] `components/report-blueprint-tray.tsx` - 蓝图托盘
- [ ] `components/file-preview-list.tsx` - 文件预览
- [ ] `s/session-status.tsx` - 会话状态
- [ ] `components/reset-warning-modal.tsx` - 重置警告

### 低优先级（PPT 功能）

- [ ] `app/ppt/page.tsx` - PPT 主页
- [ ] `features/ppt-studio/components/ppt-workspace.tsx` - PPT 工作区
- [ ] `features/ppt-studio/components/brief-form.tsx` - Brief 表单
- [ ] `features/ppt-studio/components/blueprint-editor.tsx` - 蓝图编辑器
- [ ] `features/ppt-studio/components/slide-composer.tsx` - 幻灯片编辑器
- [ ] `features/ppt-studio/components/slide-preview-modal.tsx` - 预览模态框
- [ ] `features/ppt-studio/components/ppt-stepper.tsx` - 步骤指示器

### Context 文件

- [ ] `contexts/conversation-context.tsx` - 对话上下文
- [ ] `contexts/diagram-context.tsx` - 图表上下文
- [ ] `contexts/ppt-studio-context.tsx` - PPT 上下文

## 迁移示例

### 示例 1: 简单按钮

```tsx
// 之前
<Button variant="outline">
  取消
</Button>

// 之后
import { useLocale } from "@/contexts/locale-context";

function MyComponent() {
  const { t } = useLocale();
  
  return (
    <Button variant="outline">
      {t("common.cancel")}
    </Button>
  );
}
```

### 示例 2: 对话框标题和描述

```tsx
// 之前
<DialogHeader>
  <DialogTitle>确认删除</DialogTitle>
  <DialogDescription>
    确定要删除吗？此操作不可撤销。
  </DialogDescription>
</DialogHeader>

// 之后
<DialogHeader>
  <DialogTitle>{t("confirm.deleteTitle")}</DialogTitle>
  <DialogDescription>
    {t("confirm.deleteMessage")}
  </DialogDescription>
</DialogHeader>
```

### 示例 3: 带参数的文本

```tsx
// 之前
<div>{`共 ${count} 个版本`}</div>

// 之后
<div>{t("hisalVersions", { count })}</div>
```

### 示例 4: 下拉选项

```tsx
// 之前
const options = [
  { value: "flowchart", label: "流程图" },
  { value: "mindmap", label: "思维导图" },
  { value: "erDiagram", label: "ER 图" },
];

// 之后
const { t } = useLocale();

const options = [
  { value: "flowchart", label: t("diagramType.flowchart") },
  { value: "mindmap", label: t("diagramType.mindmap") },
  { value: "erDiagram", label: t("diagramType.erDiagram") },
];
```

## 添加新的翻译键

如果在迁移过程中发现需要新的翻译，在 `locales/translations.ts` 中添加：

```typescript
export const zhTranslations = {
  // ... existing translations
  myNewSection: {
    newKey: "新的中文文本",
    anotherKey: "另一个文本",
  },
};

export const enTranslations = {
  // ... existing translations
  myNewSection: {
    newKey: "New English text",
    anotherKey: "Another text",
  },
};
```

## 测试清单

在迁移每个组件后，请测试：

- [ ] 中文显示正常
- [ ] 英文显示正常
- [ ] 语言切换即时生效
- [ ] 带参数的文本显示正确
- [ ] 没有遗漏的硬编码文本
- [ ] 控制台没有翻译键缺失的警告

## 注意事项

1. **不要翻译**：
   - 代码变量名
   - API 端点
   - 配置键名
   - 日志消息（可选）

2. **保持一致性**：
   - 相同含义的文本使用相同的翻译键
   - 按钮文本使用 `common.*`
   - 模块特定文本使用对应的命名空间

3. **性能考虑**：
   - `t()` 函数很快，无需担心性能
   - 避免在循环中重复创建相同的翻译

4. **类型安全**：
   - TypeScript 会提示翻译键不存在
   - 如果看到警告，说明需要添加翻译

## 快速查找工具

使用以下命令查找需要翻译的中文：

```bash
# 查找所有包含中文的 TypeScript/TSX 文件
grep -r "[\u4e00-\u9fa5]" --include="*.tsx" --include="*.ts" .

# 查找特定组件中的中文
grep "[\u4e00-\u9fa5]" components/chat-panel-optimized.tsx
```

## 自动化脚本

创建一个简单的脚本来帮助迁移：

```javascript
// scripts/find-chinese.js
const fs = require('fs');
const path = require('path');

function findChinese(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findChinese(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const chineseRegex = /[\u4e00-\u9fa5]+/g;
      const matches = content.match(chineseRegex);
      
      if (matches && matches.length > 0) {
        console.log(`\n📄 ${filePath}`);
        console.log(`   Found ${matches.length} Chinese characters`);
        // 显示前3个示例
        matches.slice(0, 3).forEach(match => {
          console.log(`   - "${match}"`);
        });
      }
    }
  });
}

findChinese('./components');
findChinese('./app');
findChinese('./features');
```

运行：`node scripts/find-chinese.js`

## 总结

你现在拥有：

1. ✅ 完整的翻译配置文件（600+ 翻译项）
2. ✅ 支持参数替换的翻译系统
3. ✅ 类型安全的翻译函数
4. ✅ 已迁移的主要页面（首页、导航栏）

**建议的迁移顺序**：
1. 先迁移聊天面板（用户最常用）
2. 再迁移模型配置和历史记录
3. 然后迁移 PPT Studio
4. 最后迁移其他辅助组件

每个组件的迁移都很简单，只需：
1. 导入 `useLocale`
2. 调用 `const { t } = useLocale()`
3. 替换硬编码中文为 `t("key")`

如果你需要我帮你迁移特定的组件，请告诉我！
