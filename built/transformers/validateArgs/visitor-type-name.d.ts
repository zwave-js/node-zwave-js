import ts from "typescript";
import type { VisitorContext } from "./visitor-context";
interface TypeCheckNameMode {
    type: "type-check";
}
interface KeyofNameMode {
    type: "keyof";
}
interface IndexedAccessNameMode {
    type: "indexed-access";
    indexType: ts.Type;
}
type NameMode = TypeCheckNameMode | KeyofNameMode | IndexedAccessNameMode;
export declare function visitType(type: ts.Type, visitorContext: VisitorContext, mode: NameMode): string;
export {};
//# sourceMappingURL=visitor-type-name.d.ts.map