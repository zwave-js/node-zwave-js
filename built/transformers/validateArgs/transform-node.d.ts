import ts from "typescript";
import type { FileSpecificVisitorContext } from "./visitor-context";
export declare function createGenericAssertFunction(factory: ts.NodeFactory): ts.FunctionDeclaration;
export declare function transformNode(node: ts.Node, visitorContext: FileSpecificVisitorContext): ts.Node;
//# sourceMappingURL=transform-node.d.ts.map