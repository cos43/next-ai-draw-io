import { convertToLegalXml } from "@/lib/utils";

export type DiagramValidationErrorCode =
    | "empty-input"
    | "parser-error"
    | "duplicate-id"
    | "missing-id";

export interface DiagramValidationError {
    code: DiagramValidationErrorCode;
    message: string;
    line?: number;
    column?: number;
    snippet?: string;
}

export interface DiagramValidationResult {
    isValid: boolean;
    normalizedXml: string;
    errors: DiagramValidationError[];
}

const DRAWIO_RUNTIME_ERROR_PATTERNS = [
    /非绘图文件/i,
    /not a diagram file/i,
    /attributes?\s+construct\s+error/i,
    /d\.setid\s+is\s+not\s+function/i,
    /xml\s+apply\s+error/i,
    /mxgraph/i,
];

function extractLineAndColumn(message: string) {
    const match = message.match(/line\s+(\d+).+column\s+(\d+)/i);
    if (!match) {
        return {};
    }
    return {
        line: Number.parseInt(match[1], 10),
        column: Number.parseInt(match[2], 10),
    };
}

export function normalizeGeneratedXml(xml: string): string {
    if (!xml || xml.trim().length === 0) {
        return "<root></root>";
    }

    const trimmed = xml.trim();
    if (/^<root[\s>]/i.test(trimmed)) {
        return trimmed;
    }
    if (trimmed.includes("<mxGraphModel")) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(trimmed, "text/xml");
            const parserError = doc.querySelector("parsererror");
            if (!parserError) {
                const root = doc.querySelector("mxGraphModel > root");
                if (root) {
                    return root.outerHTML;
                }
            }
        } catch {
            // Fallback to regex-based sanitization below
        }
    }
    return convertToLegalXml(trimmed);
}

export function validateDiagramXml(xml: string): DiagramValidationResult {
    const normalizedXml = normalizeGeneratedXml(xml);
    const errors: DiagramValidationError[] = [];

    if (!normalizedXml.trim()) {
        errors.push({
            code: "empty-input",
            message: "生成的 XML 内容为空，无法应用到画布。",
        });
        return { isValid: false, normalizedXml, errors };
    }

    const wrapped = normalizedXml.startsWith("<root")
        ? normalizedXml
        : `<root>${normalizedXml}</root>`;

    const parser = new DOMParser();
    const doc = parser.parseFromString(
        `<mxGraphModel>${wrapped}</mxGraphModel>`,
        "text/xml"
    );
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
        const text = parserError.textContent ?? "未知的 XML 解析错误";
        errors.push({
            code: "parser-error",
            message: text.replace(/\s+/g, " ").trim(),
            ...extractLineAndColumn(text),
            snippet: parserError.innerHTML ?? undefined,
        });
        return { isValid: false, normalizedXml, errors };
    }

    const idSet = new Set<string>();
    const mxCells = doc.querySelectorAll("mxGraphModel > root > mxCell");
    mxCells.forEach((cell) => {
        const id = cell.getAttribute("id");
        if (!id) {
            errors.push({
                code: "missing-id",
                message:
                    "检测到缺少 id 属性的 mxCell，draw.io 无法识别该元素。",
                snippet: cell.outerHTML.slice(0, 120),
            });
            return;
        }
        if (idSet.has(id) && id !== "0" && id !== "1") {
            errors.push({
                code: "duplicate-id",
                message: `发现重复的 mxCell id="${id}"，这会导致 draw.io 载入失败。`,
                snippet: cell.outerHTML.slice(0, 120),
            });
        } else {
            idSet.add(id);
        }
    });

    return {
        isValid: errors.length === 0,
        normalizedXml,
        errors,
    };
}

export function isDrawioRuntimeErrorMessage(message?: string | null) {
    if (!message) {
        return false;
    }
    return DRAWIO_RUNTIME_ERROR_PATTERNS.some((pattern) =>
        pattern.test(message)
    );
}
