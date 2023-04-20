/*!
 * This scripts ensures that files annotated with @noExternalImports don't import
 * anything from outside the monorepo.
 */
export interface CodeFindQuery {
    filePatterns?: string[];
    excludeFilePatterns?: string[];
    codePatterns?: string[];
    excludeCodePatterns?: string[];
    search: RegExp | string;
    options?: Partial<{
        additionalLines: number;
    }>;
}
export interface Result {
    file: string;
    line: number;
    character: number;
    codePath: string;
    formatted: string;
    match: string;
}
export declare function codefind(query: CodeFindQuery): Result[];
//# sourceMappingURL=codefind.d.ts.map