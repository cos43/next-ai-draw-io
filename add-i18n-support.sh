#!/bin/bash

# 多语言适配辅助脚本
# 此脚本帮助快速在组件中添加 useLocale hook

# 使用方法:
# ./add-i18n-support.sh components/my-component.tsx

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <文件路径>"
    echo "示例: $0 components/chat-panel.tsx"
    exit 1
fi

FILE=$1

if [ ! -f "$FILE" ]; then
    echo "错误: 文件不存在: $FILE"
    exit 1
fi

echo "正在处理: $FILE"

# 1. 检查是否已经导入 useLocale
if grep -q "useLocale" "$FILE"; then
    echo "✓ 文件已包含 useLocale 导入"
else
    echo "添加 useLocale 导入..."
    # 在第一个 import 语句后添加
    sed -i '' '1a\
import { useLocale } from "@/contexts/locale-context";
' "$FILE"
fi

# 2. 创建备份
cp "$FILE" "$FILE.bak"
echo "✓ 已创建备份: $FILE.bak"

# 3. 显示需要手动替换的常见中文
echo ""
echo "=========================================="
echo "常见中文文本替换建议:"
echo "=========================================="
echo ""
echo "在组件函数开头添加:"
echo "  const { t } = useLocale();"
echo ""
echo "常见替换模式:"
echo "  \"保存\" → {t(\"common.save\")}"
echo "  \"取消\" → {t(\"common.cancel\")}"
echo "  \"确认\" → {t(\"common.confirm\")}"
echo "  \"加载中...\" → {t(\"common.loading\")}"
echo "  \"成功\" → {t(\"common.success\")}"
echo "  \"失败\" → {t(\"common.failed\")}"
echo ""
echo "=========================================="
echo "在此文件中发现的中文:"
echo "=========================================="
grep -o "[\u4e00-\u9fa5]\+" "$FILE" | sort -u | head -20
echo ""
echo "完整内容请查看文件"

echo ""
echo "✓ 处理完成"
echo "请手动编辑文件进行替换"
echo "备份文件: $FILE.bak"
