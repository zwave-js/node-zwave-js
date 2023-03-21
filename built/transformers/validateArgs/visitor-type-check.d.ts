import ts from "typescript";
import type { VisitorContext } from "./visitor-context";
export declare function visitType(type: ts.Type, visitorContext: VisitorContext): string;
export declare function visitUndefinedOrType(type: ts.Type, visitorContext: VisitorContext): string;
export declare function visitShortCircuit(visitorContext: VisitorContext): string;
//# sourceMappingURL=visitor-type-check.d.ts.map