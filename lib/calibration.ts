"use client";

export interface CalibrationOptions {
    gridSize?: number;
    rowTolerance?: number;
    horizontalGap?: number;
    verticalGap?: number;
    rowPadding?: number;
}

export interface CalibrationReport {
    nodesProcessed: number;
    nodesAdjusted: number;
    rowCount: number;
    rowSpacingAdjustments: number;
    overlapsResolved: number;
    connectorsProcessed: number;
    connectorsRestyled: number;
    connectorWaypointsCleared: number;
    gridSize: number;
    averageHorizontalGap: number;
    averageRowGap: number;
    durationMs: number;
    warnings: string[];
}

interface VertexMeta {
    cell: Element;
    geometry: Element;
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
}

interface RowMeta {
    nodes: VertexMeta[];
    originalY: number;
    targetY: number;
    maxHeight: number;
}

const DEFAULT_OPTIONS: Required<CalibrationOptions> = {
    gridSize: 8,
    rowTolerance: 18,
    horizontalGap: 40,
    verticalGap: 36,
    rowPadding: 32,
};

const now = () => {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
    }
    return Date.now();
};

const snapToGrid = (value: number, gridSize: number) => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.round(value / gridSize) * gridSize;
};

const toAttrValue = (value: number) => {
    if (!Number.isFinite(value)) {
        return "0";
    }
    return Number(value.toFixed(2)).toString();
};

const parseNumber = (value: string | null, fallback: number) => {
    if (value === null || value === undefined) {
        return fallback;
    }
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export function calibrateDiagram(
    xml: string,
    options: CalibrationOptions = {}
): { xml: string; report: CalibrationReport } {
    const startedAt = now();
    const config = { ...DEFAULT_OPTIONS, ...options };
    const warnings: string[] = [];

    if (!xml?.trim()) {
        warnings.push("未检测到图表内容，已跳过校准。");
        return {
            xml,
            report: {
                nodesProcessed: 0,
                nodesAdjusted: 0,
                rowCount: 0,
                rowSpacingAdjustments: 0,
                overlapsResolved: 0,
                connectorsProcessed: 0,
                connectorsRestyled: 0,
                connectorWaypointsCleared: 0,
                gridSize: config.gridSize,
                averageHorizontalGap: 0,
                averageRowGap: 0,
                durationMs: 0,
                warnings,
            },
        };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const root = doc.querySelector("mxGraphModel > root");

    if (!root) {
        warnings.push("无法定位 mxGraphModel 根节点，校准未生效。");
        return {
            xml,
            report: {
                nodesProcessed: 0,
                nodesAdjusted: 0,
                rowCount: 0,
                rowSpacingAdjustments: 0,
                overlapsResolved: 0,
                connectorsProcessed: 0,
                connectorsRestyled: 0,
                connectorWaypointsCleared: 0,
                gridSize: config.gridSize,
                averageHorizontalGap: 0,
                averageRowGap: 0,
                durationMs: Math.round(now() - startedAt),
                warnings,
            },
        };
    }

    const vertices: VertexMeta[] = Array.from(
        root.querySelectorAll('mxCell[vertex="1"]')
    )
        .map((cell) => {
            const geometry = cell.querySelector("mxGeometry");
            if (!geometry) {
                return null;
            }

            return {
                cell,
                geometry,
                width: parseNumber(geometry.getAttribute("width"), 120),
                height: parseNumber(geometry.getAttribute("height"), 48),
                x: parseNumber(geometry.getAttribute("x"), 0),
                y: parseNumber(geometry.getAttribute("y"), 0),
                id: cell.getAttribute("id") || "",
            };
        })
        .filter((item): item is VertexMeta => item !== null);

    const edges = Array.from(root.querySelectorAll('mxCell[edge="1"]'));

    let nodesAdjusted = 0;
    let overlapsResolved = 0;
    let rowSpacingAdjustments = 0;
    const horizontalGaps: number[] = [];
    const rowGaps: number[] = [];

    if (vertices.length === 0) {
        warnings.push("画布上没有可对齐的节点。");
    }

    const rows: RowMeta[] = [];
    const sortedNodes = [...vertices].sort((a, b) => a.y - b.y);

    sortedNodes.forEach((node) => {
        let row = rows.find(
            (candidate) =>
                Math.abs(candidate.originalY - node.y) <= config.rowTolerance
        );

        if (!row) {
            row = {
                nodes: [],
                originalY: node.y,
                targetY: node.y,
                maxHeight: node.height,
            };
            rows.push(row);
        }

        row.nodes.push(node);
        row.originalY =
            (row.originalY * (row.nodes.length - 1) + node.y) /
            row.nodes.length;
        row.maxHeight = Math.max(row.maxHeight, node.height);
    });

    rows.sort((a, b) => a.originalY - b.originalY);

    let lastBottom = -Infinity;
    rows.forEach((row, index) => {
        const snapped = snapToGrid(row.originalY, config.gridSize);
        let target = snapped;

        if (index === 0) {
            target = Math.max(config.rowPadding, snapped);
        } else {
            const minTarget = lastBottom + config.verticalGap;
            if (target < minTarget) {
                target = snapToGrid(minTarget, config.gridSize);
                rowSpacingAdjustments += 1;
            }
            rowGaps.push(Math.max(0, target - lastBottom));
        }

        row.targetY = target;
        lastBottom = target + row.maxHeight;

        row.nodes.forEach((node) => {
            if (Math.abs(node.y - row.targetY) > 0.1) {
                nodesAdjusted += 1;
            }
            node.y = row.targetY;
            node.geometry.setAttribute("y", toAttrValue(node.y));
        });

        const rowNodes = [...row.nodes].sort((a, b) => a.x - b.x);
        if (rowNodes.length === 0) {
            return;
        }

        let cursor = Math.max(
            config.rowPadding,
            snapToGrid(rowNodes[0].x, config.gridSize)
        );

        rowNodes.forEach((node, nodeIndex) => {
            let targetX = snapToGrid(node.x, config.gridSize);

            if (nodeIndex === 0) {
                targetX = Math.max(config.rowPadding, targetX);
            } else {
                const minX = cursor;
                if (targetX < minX) {
                    targetX = snapToGrid(minX, config.gridSize);
                    overlapsResolved += 1;
                }
            }

            if (Math.abs(node.x - targetX) > 0.1) {
                nodesAdjusted += 1;
            }

            node.x = targetX;
            node.geometry.setAttribute("x", toAttrValue(node.x));
            cursor = node.x + node.width + config.horizontalGap;
        });

        for (let i = 1; i < rowNodes.length; i++) {
            const prev = rowNodes[i - 1];
            const current = rowNodes[i];
            const gap = current.x - (prev.x + prev.width);
            if (gap >= 0) {
                horizontalGaps.push(gap);
            }
        }
    });

    let connectorsRestyled = 0;
    let connectorWaypointsCleared = 0;

    const desiredConnectorStyle: Record<string, string> = {
        edgeStyle: "orthogonalEdgeStyle",
        rounded: "1",
        orthogonalLoop: "1",
        jettySize: "auto",
        endArrow: "block",
        endFill: "1",
        html: "1",
        strokeColor: "#1f2937",
        strokeWidth: "1.6",
    };

    edges.forEach((edge) => {
        const currentStyle = edge.getAttribute("style") || "";
        const stylePairs = currentStyle
            .split(";")
            .filter((token) => token.trim().length > 0);

        const styleMap: Record<string, string> = {};
        stylePairs.forEach((pair) => {
            const [key, value] = pair.split("=");
            if (key) {
                styleMap[key] = value ?? "";
            }
        });

        let styleChanged = false;
        Object.entries(desiredConnectorStyle).forEach(([key, value]) => {
            if (styleMap[key] !== value) {
                styleMap[key] = value;
                styleChanged = true;
            }
        });

        if (styleChanged) {
            const normalizedStyle =
                Object.entries(styleMap)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value]) => `${key}=${value}`)
                    .join(";") + ";";
            edge.setAttribute("style", normalizedStyle);
            connectorsRestyled += 1;
        }

        const geometry = edge.querySelector("mxGeometry");
        if (geometry) {
            const arrays = Array.from(geometry.children).filter(
                (child) =>
                    child.nodeName === "Array" &&
                    (child as Element).getAttribute("as") === "points"
            );

            arrays.forEach((array) => {
                geometry.removeChild(array);
                connectorWaypointsCleared += 1;
            });
        }
    });

    const serializer = new XMLSerializer();
    const optimizedXML = serializer.serializeToString(doc);

    const durationMs = Math.max(0, Math.round(now() - startedAt));
    const report: CalibrationReport = {
        nodesProcessed: vertices.length,
        nodesAdjusted,
        rowCount: rows.length,
        rowSpacingAdjustments,
        overlapsResolved,
        connectorsProcessed: edges.length,
        connectorsRestyled,
        connectorWaypointsCleared,
        gridSize: config.gridSize,
        averageHorizontalGap:
            horizontalGaps.length > 0
                ? Math.round(
                      (horizontalGaps.reduce((sum, gap) => sum + gap, 0) /
                          horizontalGaps.length) *
                          10
                  ) / 10
                : config.horizontalGap,
        averageRowGap:
            rowGaps.length > 0
                ? Math.round(
                      (rowGaps.reduce((sum, gap) => sum + gap, 0) /
                          rowGaps.length) *
                          10
                  ) / 10
                : config.verticalGap,
        durationMs,
        warnings,
    };

    return {
        xml: optimizedXML,
        report,
    };
}
