import { FileText, Settings, Zap } from "lucide-react";

import type { QuickActionDefinition } from "@/components/quick-action-bar";
import type { ToolPanel, ToolbarActionDefinition } from "./types";

export const FLOWPILOT_AI_CALIBRATION_PROMPT = `### FlowPilot 校准舱 · AI 重排指令
我们需要在不改变节点语义的前提下，利用当前 draw.io XML 对图表做一次「版式重排」。目标：保持单页展示 (x:0-800, y:0-600)，让主流程更突出、泳道/分区更规整，箭头间距更干净。

硬性要求：
1. 保留全部节点、标签与图标，只有在完全重叠或内容为空时才能合并，绝不新增业务含义。
2. 若原图存在泳道/分组/容器，沿用它们并保持 64px 垂直间距，内部子节点水平间距 56-80px、垂直间距 64-96px，容器 padding ≥ 24px。
3. 所有节点对齐到 24px 网格，避免出现负坐标或跨页；必要时统一节点宽度或高度以获得更好的列对齐。
4. 连接线必须使用 orthogonalEdgeStyle、rounded=1、endArrow=block、strokeColor=#1f2937，尽量减少交叉，允许添加/调整拐点。
5. 至少强调一条「主流程」路径，可通过加粗箭头或淡色背景突出，但绝不改动文字内容。
6. 提交前自检：无元素越界、无重叠、无孤立箭头或断开的连线。

执行策略：
- 如果只是部分细节调整，可用 edit_diagram 进行批量替换；若布局极度混乱，请直接用 display_diagram 返回全新的 <root>，并在 0-800 × 0-600 内排布。
- 维持既有配色/主题（如 AWS 图标、泳道色块等），只整理结构与间距。

请根据上述要求返回最终 XML，只能通过合适的工具调用输出，勿在文本中粘贴 XML。`;

export const TOOLBAR_ACTIONS: Record<ToolPanel, ToolbarActionDefinition> = {
    brief: {
        label: "配置",
        icon: Settings,
        description: "调整 FlowPilot Brief 偏好",
    },
    calibration: {
        label: "校准",
        icon: Zap,
        description: "触发画布整理与布局建议",
    },
    actions: {
        label: "模板",
        icon: FileText,
        description: "调用灵感与述职模板",
    },
};

export const TOOLBAR_PANELS: ToolPanel[] = ["brief", "calibration", "actions"];

export const QUICK_ACTIONS: QuickActionDefinition[] = [
    {
        id: "aws-refresh",
        title: "重建这张 AWS 架构图",
        description: "使用最新版 AWS 图标与规范化间距重新规划画布。",
        prompt:
            "请读取当前架构图，在 800x600 画布范围内，使用 2025 版 AWS 图标、简洁标签与均衡间距重新绘制。",
        badge: "架构",
        attachment: {
            path: "/architecture.png",
            fileName: "architecture.png",
            mime: "image/png",
        },
    },
    {
        id: "journey",
        title: "客户旅程地图",
        description: "展示四个阶段的目标、触点与情绪。",
        prompt:
            "请绘制一个包含发现、考虑、采用、支持四个阶段的客户旅程图，并加入目标、触点、情绪泳道以及各阶段之间的箭头。",
        badge: "策略",
    },
    {
        id: "polish",
        title: "润色当前图表",
        description: "优化间距、对齐节点并突出主流程。",
        prompt:
            "请检查当前图表，整理布局、对齐相关节点，并为每条泳道添加淡色区分，保持原有内容不变。",
        badge: "整理",
    },
    {
        id: "explain",
        title: "解释当前图表",
        description: "总结结构并提出下一步优化建议。",
        prompt:
            "请阅读当前图表 XML，为产品经理总结其结构，并给出一条影响最大的改进建议，暂不修改图表。",
        badge: "洞察",
    },
];
