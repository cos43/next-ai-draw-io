export default function ExamplePanel({
    setInput,
    setFiles,
}: {
    setInput: (input: string) => void;
    setFiles: (files: File[]) => void;
}) {
    // New handler for the "Replicate this flowchart" button
    const handleReplicateFlowchart = async () => {
        setInput("请帮我复刻这张流程图。");

        try {
            // Fetch the example image
            const response = await fetch("/example.png");
            const blob = await response.blob();
            const file = new File([blob], "example.png", { type: "image/png" });

            // Set the file to the files state
            setFiles([file]);
        } catch (error) {
            console.error("Error loading example image:", error);
        }
    };

    // Handler for the "Replicate this in aws style" button
    const handleReplicateArchitecture = async () => {
        setInput("请使用 AWS 设计风格复刻这张架构图。");

        try {
            // Fetch the architecture image
            const response = await fetch("/architecture.png");
            const blob = await response.blob();
            const file = new File([blob], "architecture.png", {
                type: "image/png",
            });

            // Set the file to the files state
            setFiles([file]);
        } catch (error) {
            console.error("Error loading architecture image:", error);
        }
    };
    return (
        <div className="border-y border-gray-100 px-4 py-3">
            <p className="mb-1 text-sm text-gray-600">
                FlowPilot 既可以空白起稿，也能参考上传的示例；试试下面的模板更快进入状态。
            </p>
            <p className="mb-3 text-xs text-gray-500">
                点击任意选项即可自动填充输入框，必要时会附带示例附件。
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-200 whitespace-nowrap"
                    onClick={handleReplicateArchitecture}
                >
                    复刻这份 AWS 架构
                </button>
                <button
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-200 whitespace-nowrap"
                    onClick={handleReplicateFlowchart}
                >
                    复刻这张流程图截图
                </button>
                <button
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-200 whitespace-nowrap"
                    onClick={() => setInput("请随便画一只猫咪。")}
                >
                    随手涂鸦（轻松一下）
                </button>
                <button
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-200 whitespace-nowrap"
                    onClick={() =>
                        setInput("请创建一份包含前台、后台与支撑流程三列的服务蓝图。")
                    }
                >
                    服务蓝图排版
                </button>
            </div>
        </div>
    );
}
