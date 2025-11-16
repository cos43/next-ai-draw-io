# Next AI Draw.io 项目架构与集成分析文档

## 项目概述

Next AI Draw.io 是一个基于 Next.js 的智能流程图生成应用，通过 AI 大模型和 draw.io 的深度集成，实现了自然语言驱动的图表创建和编辑功能。项目的核心是将 AI 生成的 XML 与 draw.io 编辑器进行无缝集成。

## 技术栈

- **前端框架**: Next.js 15.2.3 + React 19
- **AI SDK**: @ai-sdk/react 2.0.22
- **Draw.io 集成**: react-drawio 1.0.3
- **状态管理**: React Context + Hooks
- **样式**: Tailwind CSS + Radix UI
- **XML 处理**: @xmldom/xmldom + pako (压缩)
- **类型验证**: Zod

## 核心架构

### 1. 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Chat API   │    │  DrawIO Embed   │    │   State Mgmt    │
│                 │    │                 │    │                 │
│ - Tool Calling  │◄──►│ - XML Loading   │◄──►│ - DiagramCtx    │
│ - Stream Response│   │ - Export SVG    │    │ - ConversationCtx│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  display_diagram│    │ XML Processing  │    │   UI Components │
│  edit_diagram   │    │                 │    │                 │
│  Tools          │    │ - Validation    │    │ - Chat Panel    │
└─────────────────┘    │ - Transformation│    │ - Message Display│
                       │ - Auto Repair   │    └─────────────────┘
                       └─────────────────┘
```

### 2. 数据流架构

```
User Input → AI Chat → Tool Calling → XML Processing → Draw.io Render → State Update
     ▲                                                                        │
     └────────────────── User Interaction ←─────────────────────────────────┘
```

## 核心功能分析

### 1. Draw.io 集成方式

#### 1.1 基础集成 (`app/page.tsx`)

项目通过 `react-drawio` 包实现与 draw.io 的集成：

```typescript
<DrawIoEmbed
    ref={drawioRef}
    baseUrl={drawioBaseUrl}
    onExport={handleDiagramExport}
    onLoad={handleDrawioLoad}
    urlParameters={{
        spin: true,
        libraries: false,
        saveAndExit: false,
        noExitBtn: true,
    }}
/>
```

**关键配置项**：
- `baseUrl`: Draw.io 服务地址（默认 `https://embed.diagrams.net`）
- `onExport`: 图表导出回调函数
- `onLoad`: 编辑器加载完成回调
- `urlParameters`: Draw.io 编辑器参数配置

#### 1.2 状态管理 (`contexts/diagram-context.tsx`)

通过 React Context 管理图表状态：

```typescript
interface DiagramContextType {
    chartXML: string;              // 当前图表 XML
    latestSvg: string;             // 最新 SVG 数据  
    diagramHistory: { svg: string; xml: string }[];  // 历史版本
    activeVersionIndex: number;    // 当前版本索引
    loadDiagram: (chart: string) => void;           // 加载图表
    fetchDiagramXml: () => Promise<string>;         // 获取 XML
    clearDiagram: () => void;                       // 清空图表
    restoreDiagramAt: (index: number) => void;      // 恢复版本
}
```

**核心方法**：

1. **loadDiagram**: 将 XML 加载到 draw.io 编辑器
2. **handleDiagramExport**: 处理从 draw.io 导出的数据
3. **fetchDiagramXml**: 异步获取当前画布的 XML

### 2. AI 工具实现

#### 2.1 display_diagram 工具

**定义位置**: `app/api/chat/route.ts`

```typescript
display_diagram: {
    description: `Display a diagram on draw.io. You only need to pass the nodes inside the <root> tag.`,
    inputSchema: z.object({
        xml: z.string().describe("XML string to be displayed on draw.io")
    })
}
```

**执行流程**:

1. **AI 工具调用**: AI 模型生成 XML 并调用工具
2. **XML 验证**: 验证生成的 XML 格式正确性
3. **画布渲染**: 将 XML 应用到 draw.io 画布
4. **状态更新**: 更新应用状态和分支历史

**实现细节** (`components/chat-panel-optimized.tsx`):

```typescript
async onToolCall({ toolCall }) {
    if (toolCall.toolName === "display_diagram") {
        const { xml } = toolCall.input as { xml?: string };
        try {
            if (!xml || typeof xml !== "string" || !xml.trim()) {
                throw new Error("大模型返回的 XML 为空，无法渲染。");
            }
            await handleDiagramXml(xml, {
                origin: "display",
                modelRuntime: selectedModel ?? undefined,
            });
            addToolResult({
                tool: "display_diagram",
                toolCallId: toolCall.toolCallId,
                output: "Successfully displayed the diagram.",
            });
        } catch (error) {
            // 错误处理...
        }
    }
}
```

#### 2.2 edit_diagram 工具

**定义位置**: `app/api/chat/route.ts`

```typescript
edit_diagram: {
    description: `Edit specific parts of the EXISTING diagram by replacing exact line matches.`,
    inputSchema: z.object({
        edits: z.array(z.object({
            search: z.string().describe("Exact lines to search for"),
            replace: z.string().describe("Replacement lines")
        })).describe("Array of search/replace pairs to apply sequentially")
    })
}
```

**执行流程**:

1. **获取当前 XML**: 从 draw.io 获取当前画布的 XML
2. **应用编辑**: 使用 `replaceXMLParts` 函数进行精确替换
3. **重新渲染**: 将编辑后的 XML 重新加载到画布

**实现细节**:

```typescript
} else if (toolCall.toolName === "edit_diagram") {
    const { edits } = toolCall.input as {
        edits: Array<{ search: string; replace: string }>;
    };

    let currentXml = "";
    try {
        currentXml = await onFetchChart();
        const editedXml = replaceXMLParts(currentXml, edits);
        
        await handleDiagramXml(editedXml, {
            origin: "edit",
            modelRuntime: selectedModel ?? undefined,
        });
        // 成功处理...
    } catch (error) {
        // 错误处理...
    }
}
```

### 3. XML 处理与工具函数

#### 3.1 核心处理函数 (`lib/utils.ts`)

**formatXML**: XML 格式化函数

```typescript
export function formatXML(xml: string, indent: string = '  '): string {
    // 移除标签间的空白字符
    xml = xml.replace(/>\\s*</g, '><').trim();
    
    // 按标签分割并格式化
    const tags = xml.split(/(?=<)|(?<=>)/g).filter(Boolean);
    
    // 应用缩进规则...
    return formatted.trim();
}
```

**replaceNodes**: 节点替换函数

```typescript
export function replaceNodes(currentXML: string, nodes: string): string {
    // 解析 XML 文档
    const parser = new DOMParser();
    const currentDoc = parser.parseFromString(currentXML, "text/xml");
    
    // 处理节点输入
    let nodesString = nodes;
    if (!nodes.includes("<root>")) {
        nodesString = `<root>${nodes}</root>`;
    }
    
    // 清空并替换节点
    // 确保基础单元格存在...
    return serializer.serializeToString(currentDoc);
}
```

**replaceXMLParts**: 精确 XML 替换函数

```typescript
export function replaceXMLParts(
    xmlContent: string,
    searchReplacePairs: Array<{ search: string; replace: string }>
): string {
    let result = formatXML(xmlContent);
    
    for (const { search, replace } of searchReplacePairs) {
        // 格式化搜索内容
        const formattedSearch = formatXML(search);
        
        // 尝试精确匹配
        // 尝试修剪匹配
        // 尝试子串匹配
        
        if (!matchFound) {
            throw new Error("Search pattern not found in the diagram.");
        }
        
        // 执行替换...
    }
    
    return result;
}
```

#### 3.2 XML 验证与修复 (`lib/diagram-validation.ts`)

**validateDiagramXml**: XML 验证函数

```typescript
export function validateDiagramXml(xml: string): DiagramValidationResult {
    const normalizedXml = normalizeGeneratedXml(xml);
    const errors: DiagramValidationError[] = [];
    
    // 检查空内容
    // 解析 XML
    // 验证 ID 唯一性
    
    return {
        isValid: errors.length === 0,
        normalizedXml,
        errors,
    };
}
```

**normalizeGeneratedXml**: XML 规范化

```typescript
export function normalizeGeneratedXml(xml: string): string {
    if (!xml || xml.trim().length === 0) {
        return "<root></root>";
    }
    
    const trimmed = xml.trim();
    if (/^<root[\\s>]/i.test(trimmed)) {
        return trimmed;
    }
    
    // 处理完整的 mxGraphModel...
    return convertToLegalXml(trimmed);
}
```

### 4. 智能修复机制

#### 4.1 图表编排器 (`features/chat-panel/hooks/use-diagram-orchestrator.ts`)

**自动修复状态管理**:

```typescript
interface AutoRepairState {
    status: "idle" | "repairing" | "failed";
    message?: string;
    notes?: string[];
}
```

**修复流程**:

1. **XML 验证**: 验证生成的 XML 是否合法
2. **错误检测**: 检测 draw.io 运行时错误
3. **自动修复**: 调用修复 API 尝试修复
4. **重新应用**: 将修复后的 XML 重新应用到画布

**核心方法**:

```typescript
const runAutoRepair = useCallback(async ({ invalidXml, errorContext, modelRuntime }) => {
    setAutoRepairState({
        status: "repairing",
        message: "捕捉到 XML 异常，FlowPilot 正在执行「生成 → 校验 → 自动修复 → 渲染」自愈流程…",
    });
    
    try {
        const baseline = await fetchDiagramXml().catch(() => latestDiagramXmlRef.current);
        
        const repairResult = await requestDiagramRepair({
            invalidXml,
            currentXml: baseline,
            errorContext,
            modelRuntime,
        });
        
        if (repairResult.strategy === "display" && repairResult.xml) {
            await tryApplyRoot(repairResult.xml);
        } else if (repairResult.strategy === "edit" && repairResult.edits?.length) {
            const patched = replaceXMLParts(baseline, repairResult.edits);
            onDisplayChart(patched);
        }
        
        setAutoRepairState({ status: "idle" });
    } catch (error) {
        setAutoRepairState({ 
            status: "failed",
            message: `FlowPilot 自愈流程仍未通过：${error.message}`
        });
    }
}, []);
```

### 5. 对话管理系统

#### 5.1 分支管理 (`contexts/conversation-context.tsx`)

**分支结构**:

```typescript
interface ConversationBranch {
    id: string;
    parentId: string | null;
    label: string;
    createdAt: string;
    messages: Message[];
    diagramXml: string | null;
    meta?: ConversationBranchMeta;
}
```

**核心功能**:

1. **createBranch**: 创建新的对话分支
2. **switchBranch**: 切换到指定分支
3. **updateActiveBranchMessages**: 更新当前分支消息
4. **updateActiveBranchDiagram**: 更新当前分支的图表

### 6. 用户界面组件

#### 6.1 消息显示组件 (`components/chat-message-display.tsx`)

**工具调用处理**:

```typescript
useEffect(() => {
    messages.forEach((message) => {
        if (message.parts) {
            message.parts.forEach((part: any) => {
                if (part.type?.startsWith("tool-")) {
                    const { toolCallId, state } = part;

                    // 自动折叠参数
                    if (state === "output-available") {
                        setExpandedTools((prev) => ({
                            ...prev,
                            [toolCallId]: false,
                        }));
                    }

                    // 处理 display_diagram 工具
                    if (
                        part.type === "tool-display_diagram" &&
                        part.input?.xml &&
                        typeof onDisplayDiagram === "function" &&
                        state === "output-available" &&
                        !processedToolCalls.current.has(toolCallId)
                    ) {
                        onDisplayDiagram(part.input.xml, { toolCallId });
                        processedToolCalls.current.add(toolCallId);
                    }
                }
            });
        }
    });
}, [messages, onDisplayDiagram]);
```

#### 6.2 聊天面板组件 (`components/chat-panel-optimized.tsx`)

**表单提交处理**:

```typescript
const onFormSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // 验证状态和输入
    if (status === "streaming" || !input.trim() || !selectedModel) {
        return;
    }
    
    try {
        let chartXml = await onFetchChart();
        
        const enrichedInput = briefContext.prompt.length > 0
            ? `${briefContext.prompt}\\n\\n${input}`
            : input;

        const parts = [{ type: "text", text: enrichedInput, displayText: input }];
        
        // 处理文件附件
        if (files.length > 0) {
            const attachments = await serializeAttachments(files);
            attachments.forEach(({ url, mediaType }) => {
                parts.push({ type: "file", url, mediaType });
            });
        }

        sendMessage({ parts }, {
            body: {
                xml: chartXml,
                modelRuntime: selectedModel,
            },
        });
        
        // 清空输入
        setInput("");
        setFiles([]);
    } catch (error) {
        console.error("Error fetching chart data:", error);
    }
}, [/* 依赖项... */]);
```

## 关键技术特性

### 1. XML 数据压缩与解压

项目使用 pako 库处理 draw.io 的 XML 数据压缩：

```typescript
export function encodeDiagramXml(xml: string): string {
    const urlEncoded = encodeURIComponent(xml);
    const encoder = new TextEncoder();
    const utf8 = encoder.encode(urlEncoded);
    const compressed = pako.deflate(utf8, { level: 9, windowBits: -15 });
    
    let binary = "";
    for (let i = 0; i < compressed.length; i++) {
        binary += String.fromCharCode(compressed[i]);
    }
    
    return btoa(binary);
}

export function decodeDiagramXml(encoded: string): string | null {
    try {
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const decompressed = pako.inflate(bytes, { windowBits: -15 });
        const decoder = new TextDecoder("utf-8");
        const decoded = decoder.decode(decompressed);
        return decodeURIComponent(decoded);
    } catch (error) {
        console.error("Failed to decode diagram xml:", error);
        return null;
    }
}
```

### 2. 错误恢复机制

项目实现了完整的错误恢复机制：

1. **XML 验证**: 在应用前验证 XML 格式
2. **运行时错误检测**: 监听 draw.io 的错误事件
3. **自动修复**: 调用 AI 模型修复损坏的 XML
4. **降级处理**: 如果修复失败，回退到上一个稳定版本

### 3. 版本历史管理

每次图表更新都会保存历史版本：

```typescript
const handleDiagramExport = (data: any) => {
    const extractedXML = extractDiagramXML(data.data);
    setChartXML(extractedXML);
    setLatestSvg(data.data);
    setDiagramHistory((prev) => {
        const updated = [...prev, {
            svg: data.data,
            xml: extractedXML,
        }];
        setActiveVersionIndex(updated.length - 1);
        return updated;
    });
};
```

## 部署与配置

### 环境变量配置

```bash
# Draw.io 服务地址（可选，默认为 embed.diagrams.net）
NEXT_PUBLIC_DRAWIO_BASE_URL=https://app.diagrams.net

# AI 模型配置
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 开发模式启动

```bash
npm install
npm run dev
```

### 生产部署

```bash
npm run build
npm start
```

## 性能优化要点

1. **懒加载**: 工具面板和复杂组件使用懒加载
2. **状态优化**: 使用 useCallback 和 useMemo 避免不必要的重渲染
3. **XML 处理**: 增量式 XML 编辑，避免全量重新生成
4. **错误边界**: 完整的错误捕获和恢复机制

## 总结

Next AI Draw.io 项目通过以下几个关键技术实现了 AI 与 draw.io 的深度集成：

1. **react-drawio 库**: 提供 draw.io 编辑器的 React 封装
2. **AI 工具调用**: 通过 @ai-sdk/react 实现 AI 模型的工具调用功能
3. **XML 处理管道**: 完整的 XML 验证、转换、修复机制
4. **状态管理**: 基于 React Context 的多层状态管理
5. **错误恢复**: 智能的错误检测和自动修复机制

这种架构既保证了用户体验的流畅性，又确保了系统的稳定性和可扩展性。
