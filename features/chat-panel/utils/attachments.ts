export interface SerializedAttachment {
    url: string;
    mediaType: string;
}

export async function serializeAttachments(
    fileList: File[]
): Promise<SerializedAttachment[]> {
    const attachments: SerializedAttachment[] = [];

    for (const file of fileList) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () =>
                reject(
                    new Error(`无法读取附件「${file.name}」，请重试或更换素材。`)
                );
            reader.readAsDataURL(file);
        });

        attachments.push({
            url: dataUrl,
            mediaType: file.type,
        });
    }

    return attachments;
}
