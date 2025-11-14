export interface RuntimeErrorPayload {
    type: "status" | "merge" | "raw";
    message: string;
    rawEvent: any;
}
