/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */
import { ExportedDeclarations, Project } from "ts-morph";
export declare function findSourceNode(program: Project, exportingFile: string, identifier: string): ExportedDeclarations | undefined;
export declare function stripComments(node: ExportedDeclarations, options: ImportRange["options"]): ExportedDeclarations;
export declare function getTransformedSource(node: ExportedDeclarations, options: ImportRange["options"]): string;
interface ImportRange {
    index: number;
    end: number;
    module: string;
    symbol: string;
    import: string;
    options: {
        comments?: boolean;
        jsdoc?: boolean;
    };
}
export declare function findImportRanges(docFile: string): ImportRange[];
export declare function processDocFile(program: Project, docFile: string): Promise<boolean>;
export declare function processImport(filename: string): Promise<boolean>;
export declare function processCC(filename: string): Promise<{
    generatedIndex: string;
    generatedSidebar: any;
} | undefined>;
export {};
//# sourceMappingURL=generateTypedDocs.d.ts.map