import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { resolveChatModel } from "@/lib/server-models";
import {
    slideBlueprintSchema,
    styleOverridesSchema,
    blueprintSchema,
} from "@/types/ppt";

const requestSchema = z.object({
    slide: slideBlueprintSchema,
    blueprintContext: z.object({
        storyArc: z.string(),
        themeGuidelines: blueprintSchema.shape.themeGuidelines,
        previousSlide: z
            .object({
                title: z.string(),
                narrative: z.string(),
                bullets: z.array(z.string()),
            })
            .nullable()
            .optional(),
        nextSlide: z
            .object({
                title: z.string(),
                narrative: z.string(),
            })
            .nullable()
            .optional(),
    }),
    styleLocks: styleOverridesSchema,
    modelRuntime: z.object({
        modelId: z.string(),
        baseUrl: z.string(),
        apiKey: z.string(),
        label: z.string().optional(),
    }),
});

const SYSTEM_MESSAGE = `
你是 FlowPilot Studio 的资深可视化工程师，负责生成高级质感的 draw.io 幻灯片。
要求：
1. 产出完整的 <mxfile>……</mxfile> 结构，仅包含一个 <diagram>，画布尺寸约 1280x720。
2. 所有元素必须落在单页坐标系内（x:20-780, y:20-560），保持整洁布局并预留 20-30px 安全边距。
3. 使用统一配色、字体、图标语言，严格遵循主题指引与 styleLocks；尤其要解读 styleLocks.layoutTone，并把其中的语气/材质实现出来。
4. 版式必须像真实 PPT：设置顶部标题/副标题区，内容区域使用 1-3 个圆角卡片或分栏容器（rounded=1; arcSize≈12; shadow=1; fillColor 取自 palette），辅以轻微阴影、背景面板或玻璃拟态效果，避免普通流程图样式。
5. 结合以下布局词库，根据 slide.visualIdea/narrative 自动挑选/组合，避免连续两页完全相同：{「Hero + KPI」、「双列故事线」、「环形步骤」、「中央徽章 + 卫星卡片」、「浮层路线图」、「对称对比表」、「时间轴 + 里程碑」、「数据面板 + 注释气泡」}。
6. 可添加呼吸感背景（浅色/渐变/网格）、图标占位符、徽标/页脚条等元素，但请保持信息可读性，避免杂乱连线。
7. 文案必须被组织成信息块：KPI 卡、步骤卡、要点列表、时间轴等；根据内容类型选择最合适的结构，不必拘泥于矩形排布。
8. 若上一页与当前页主题相似，请更换布局或对齐方式以保持节奏变化；必要时用细线箭头说明承接关系。
9. 输出模板：
XML:
<mxfile>…</mxfile>

NOTES:
- 对布局或内容的说明
`;

function extractXmlPayload(text: string): { xml: string; notes?: string } {
    const xmlMatch = text.match(/<mxfile[\s\S]+<\/mxfile>/i);
    if (!xmlMatch) {
        throw new Error("未检测到有效的 mxfile 内容。");
    }
    const xml = xmlMatch[0];
    const notesSection = text.split(/NOTES:/i)[1]?.trim();
    return { xml, notes: notesSection };
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json());
        const { slide, blueprintContext, styleLocks, modelRuntime } = payload;
        const resolvedModel = resolveChatModel(modelRuntime);

        const patternHints = `
可选布局灵感：
- Hero Banner + 亮色年份徽章 + 底部 KPI
- 左图右文（图为渐变圆角、文案为要点卡）
- 中心圆/徽章 + 4 个辐射卫星卡片
- 时间轴丝带（水平或环形）+ 里程碑点
- 双列对比（左“现状”、右“规划”）
- 环形/阶梯式步骤 + 箭头指引
- 数据面板 + 侧边注释卡
`.trim();

        const userPrompt = `
请为以下幻灯片生成 draw.io XML。务必参考 layoutTone 与 pattern hints，自由组合但保持 PPT 质感与创意：
${JSON.stringify(
    {
        slide,
        storyArc: blueprintContext.storyArc,
        themeGuidelines: blueprintContext.themeGuidelines,
        previousSlide: blueprintContext.previousSlide ?? null,
        nextSlide: blueprintContext.nextSlide ?? null,
        styleLocks,
    },
    null,
    2
)}

${patternHints}
`;

        const result = await generateText({
            model: resolvedModel.model,
            system: SYSTEM_MESSAGE,
            prompt: userPrompt,
            temperature: 0.2,
        });

        const { xml, notes } = extractXmlPayload(result.text);

        return NextResponse.json({
            result: {
                xml,
                reasoning: notes ?? "",
            },
        });
    } catch (error) {
        console.error("[ppt/render-slide] Failed:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "输入参数不合法", details: error.issues },
                { status: 400 }
            );
        }
        const message =
            error instanceof Error ? error.message : "生成幻灯片失败。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
