# 快速上手：5分钟适配一个组件

## 目标
在 5 分钟内学会如何为一个组件添加多语言支持。

## 前提条件
- 已完成项目设置
- VS Code 或其他代码编辑器
- 基本的 React 知识

## 步骤

### 1. 选择一个简单的组件（30秒）

我们以一个简单的对话框为例：

```tsx
// components/my-dialog.tsx
"use client";

export function MyDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogTitle>设置</DialogTitle>
      <DialogDescription>配置您的偏好设置</DialogDescription>
      <DialogContent>
        <div>
          <label>用户名</label>
          <input placeholder="请输入用户名" />
        </div>
        <div>
          <label>邮箱</label>
          <input placeholder="请输入邮箱" />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </DialogFooter>
    </Dialog>
  );
}
```

### 2. 添加导入（10秒）

在文件顶部添加：

```tsx
import { useLocale } from "@/contexts/locale-context";
```

### 3. 使用 Hook（10秒）

在组件函数开头添加：

```tsx
export function MyDialog({ open, onClose }: Props) {
  const { t } = useLocale(); // 👈 添加这一行
  
  return (
    // ...
  );
}
```

### 4. 查找翻译键（1分钟）

打开 `TRANSLATION_MAPPING.md`，找到对应的翻译键：

| 中文 | 翻译键 |
|------|--------|
| 设置 | common.settings |
| 配置您的偏好设置 | （需要添加新键）|
| 用户名 | （需要添加新键）|
| 请输入用户名 | （需要添加新键）|
| 邮箱 | （需要添加新键）|
| 请输入邮箱 | （需要添加新键）|
| 取消 | common.cancel |
| 保存 | common.save |

**发现需要添加新键！**

### 5. 添加缺失的翻译（2分钟）

打开 `contexts/locale-context.tsx`，在对应位置添加：

```tsx
// 在 zhTranslations.common 中添加
const zhTranslations = {
  common: {
    // ... 现有翻译
    username: "用户名",
    email: "邮箱",
    configPreferences: "配置您的偏好设置",
    enterUsername: "请输入用户名",
    enterEmail: "请输入邮箱",
  },
  // ...
};

// 在 enTranslations.common 中添加对应的英文
const enTranslations = {
  common: {
    // ... 现有翻译
    username: "Username",
    email: "Email",
    configPreferences: "Configure your preferences",
    enterUsername: "Enter username",
    enterEmail: "Enter email",
  },
  // ...
};
```

### 6. 替换中文（1.5分钟）

```tsx
export function MyDialog({ open, onClose }: Props) {
  const { t } = useLocale();
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogTitle>{t("common.settings")}</DialogTitle>
      <DialogDescription>{t("common.configPreferences")}</DialogDescription>
      <DialogContent>
        <div>
          <label>{t("common.username")}</label>
          <input placeholder={t("common.enterUsername")} />
        </div>
        <div>
          <label>{t("common.email")}</label>
          <input placeholder={t("common.enterEmail")} />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button onClick={handleSave}>{t("common.save")}</Button>
      </DialogFooter>
    </Dialog>
  );
}
```

### 7. 测试（30秒）

```bash
npm run dev
```

1. 打开浏览器访问 http://localhost:6002
2. 点击导航栏的语言切换按钮
3. 确认所有文本都正确切换

## ✅ 完成！

你已经成功为一个组件添加了多语言支持！

## 🎯 下一步

### 继续练习
选择更复杂的组件进行适配：
1. `components/model-config-dialog.tsx`
2. `components/history-dialog.tsx`
3. `components/chat-input-optimized.tsx`

### 批量处理
使用 VSCode 的查找替换功能：
1. 打开 `TRANSLATION_MAPPING.md`
2. 复制常见的替换模式
3. 在文件中批量替换

### 使用辅助脚本
```bash
./add-i18n-support.sh components/your-component.tsx
```

## 📚 进阶资源

- **详细指南**: [MODIFICATION_GUIDE.md](./MODIFICATION_GUIDE.md)
- **完整映射表**: [TRANSLATION_MAPPING.md](./TRANSLATION_MAPPING.md)
- **实现总结**: [I18N_IMPLEMENTATION_SUMMARY.md](./I18N_IMPLEMENTATION_SUMMARY.md)

## 💡 提示

### 常见模式

**按钮文本:**
```tsx
<Button>{t("common.save")}</Button>
```

**占位符:**
```tsx
<input placeholder={t("chat.placeholder")} />
```

**条件文本:**
```tsx
{isLoading ? t("common.loading") : t("common.completed")}
```

**标题和描述:**
```tsx
<DialogTitle>{t("model.title")}</DialogTitle>
<DialogDescription>{t("model.select")}</DialogDescription>
```

### 快捷键

- **VSCode 查找替换**: `Cmd/Ctrl + Shift + H`
- **当前文件查找**: `Cmd/Ctrl + F`
- **多光标编辑**: `Cmd/Ctrl + D`（选中相同文本）

### 检查清单

完成后检查：
- [ ] 导入了 `useLocale`
- [ ] 添加了 `const { t } = useLocale()`
- [ ] 所有中文都被 `t()` 包裹
- [ ] 新的翻译键已添加到 `locale-context.tsx`
- [ ] 中英文都有对应的翻译
- [ ] 测试了语言切换功能
- [ ] 运行了 `npm run build` 确保无错误

## 🐛 常见错误

### 错误1: 忘记添加花括号
```tsx
❌ <Button>t("common.save")</Button>
✅ <Button>{t("common.save")}</Button>
```

### 错误2: 占位符忘记使用花括号
```tsx
❌ <input placeholder="t("chat.placeholder")" />
✅ <input placeholder={t("chat.placeholder")} />
```

### 错误3: 翻译键拼写错误
```tsx
❌ t("common.savve")  // 拼写错误
✅ t("common.save")
```

### 错误4: 中英文翻译不一致
```tsx
// locale-context.tsx
❌ 
zhTranslations: { common: { save: "保存" } }
enTranslations: { common: { } } // 忘记添加英文

✅
zhTranslations: { common: { save: "保存" } }
enTranslations: { common: { save: "Save" } }
```

## 🎉 恭喜！

你已经掌握了为组件添加多语言支持的技能。

现在可以开始适配项目中的其他 29 个组件了！

每个组件预计耗时：
- **简单组件**（如对话框）: 5-10 分钟
- **中等组件**（如配置面板）: 15-20 分钟
- **复杂组件**（如聊天面板）: 30-45 分钟

总时间: 约 8-12 小时可完成全部适配。

---

**开始吧！每完成一个组件，项目的国际化程度就提升一点。** 🚀
