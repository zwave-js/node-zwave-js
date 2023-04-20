export declare class GraphNode<T> {
    constructor(value: T, edges?: Iterable<GraphNode<T>>);
    /** The value of this node */
    readonly value: T;
    /** Which nodes this node depends on */
    readonly edges: Set<GraphNode<T>>;
}
/**
 * Performs a topological sort of the given graph so that nodes without dependencies come first.
 * Warning: This method will change the input dataset!
 */
export declare function topologicalSort<T>(graph: GraphNode<T>[]): T[];
//# sourceMappingURL=graph.d.ts.map