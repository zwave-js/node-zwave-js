interface ReportProblemOptions {
    severity: "warn" | "error";
    filename: string;
    line?: number;
    message: string;
    annotation?: boolean;
}
export declare function reportProblem({ severity, filename, line, message, annotation, }: ReportProblemOptions): void;
export {};
//# sourceMappingURL=reportProblem.d.ts.map