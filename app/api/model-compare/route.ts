import { generateText } from "ai";
import { resolveChatModel } from "@/lib/server-models";

interface ComparisonModelInput {
    id: string;
    label?: string;
}

interface AttachmentInput {
    url: string;
    mediaType: string;
}

const comparisonSystemPrompt = `You are FlowPilot 的模型对比渲染器。
你的任务是基于用户输入与当前 draw.io XML，在不依赖外部工具的情况下直接输出最新的 draw.io 图表 XML。
请严格遵守以下要求：
1. 总是返回 JSON 对象（使用 \`\`\`json 包裹），包含字段 summary（<=120 字中文描述差异点）与 xml（完整 draw.io XML 字符串）。
2. xml 字段必须以 <mxfile 开始，包含 <mxGraphModel>，并控制所有节点坐标在 0-800 × 0-600 范围内。
3. 不要添加任何额外解释、Markdown 或示例，只输出上述 JSON。`;

function buildUserPrompt(
    prompt: string,
    xml: string,
    brief?: string
): string {
    const sections: string[] = [];
    if (brief && brief.trim().length > 0) {
        sections.push(brief.trim());
    }
    sections.push(prompt.trim());

    return `当前图表 XML：
"""xml
${xml ?? ""}
"""

用户最新指令：
"""md
${sections.join("\n\n")}
"""

请输出 JSON（字段：summary, xml），用于模型效果对比。`;
}

function extractJsonPayload(text: string): { summary: string; xml: string } {
    const jsonBlockMatch = text.match(/```json([\s\S]*?)```/i);
    const jsonString = jsonBlockMatch
        ? jsonBlockMatch[1]
        : text.trim().startsWith("{")
        ? text.trim()
        : "";

    if (!jsonString) {
        throw new Error("模型未返回 JSON 结果，请重试或更换模型。");
    }

    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (error) {
        throw new Error("无法解析模型返回的 JSON 内容。");
    }

    if (!parsed || typeof parsed.xml !== "string") {
        throw new Error("模型返回结果缺少 xml 字段。");
    }

    return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        xml: parsed.xml,
    };
}

export async function POST(req: Request) {
    try {
        const {
            models,
            prompt,
            xml,
            brief,
            attachments,
        }: {
            models: Array<string | ComparisonModelInput>;
            prompt: string;
            xml: string;
            brief?: string;
            attachments?: AttachmentInput[];
        } = await req.json();

        if (!prompt || prompt.trim().length === 0) {
            return Response.json(
                { error: "prompt 不能为空。" },
                { status: 400 }
            );
        }

        const normalizedModels = (Array.isArray(models) ? models : [])
            .map((item) =>
                typeof item === "string" ? { id: item } : item
            )
            .filter(
                (item): item is ComparisonModelInput =>
                    Boolean(item?.id && item.id.trim().length > 0)
            );

        if (normalizedModels.length === 0) {
            return Response.json(
                { error: "至少需要选择一个模型进行对比。" },
                { status: 400 }
            );
        }

        const userPrompt = buildUserPrompt(prompt, xml ?? "", brief);
        const attachmentParts =
            attachments?.flatMap((file) =>
                file?.url && file?.mediaType
                    ? [
                          {
                              type: "image" as const,
                              image: file.url,
                              mimeType: file.mediaType,
                          },
                      ]
                    : []
            ) ?? [];

        const results = await Promise.all(
            normalizedModels.map(async (model) => {
                try {
                    const resolved = resolveChatModel(model.id);
                    const response = await generateText({
                        model: resolved.model,
                        system: comparisonSystemPrompt,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: userPrompt },
                                    ...attachmentParts,
                                ],
                            },
                        ],
                        temperature: 0.1,
                    });

                    const payload = extractJsonPayload(response.text);
                    return {
                        id: resolved.id,
                        label: model.label ?? resolved.label,
                        provider: resolved.provider,
                        status: "ok" as const,
                        summary: payload.summary,
                        xml: payload.xml,
                    };
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "模型调用失败";
                    return {
                        id: model.id,
                        label: model.label ?? model.id,
                        provider: "unknown" as const,
                        status: "error" as const,
                        error: message,
                    };
                }
            })
        );

        return Response.json({ results });
    } catch (error) {
        console.error("Model compare route error:", error);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
