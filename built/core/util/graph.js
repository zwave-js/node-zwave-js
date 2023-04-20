"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topologicalSort = exports.GraphNode = void 0;
class GraphNode {
    constructor(value, edges = []) {
        this.value = value;
        this.edges = new Set(edges);
    }
}
exports.GraphNode = GraphNode;
/**
 * Performs a topological sort of the given graph so that nodes without dependencies come first.
 * Warning: This method will change the input dataset!
 */
function topologicalSort(graph) {
    const ret = [];
    while (graph.length) {
        // Step 1: Find nodes without dependencies
        const nodesWithoutDependencies = graph.filter((node) => node.edges.size === 0);
        if (!nodesWithoutDependencies.length) {
            throw new Error("Circular dependency detected!");
        }
        // Step 2: Move them from the input to the output
        const newNodes = nodesWithoutDependencies.map((node) => node.value);
        ret.push(...newNodes);
        graph = graph.filter((node) => node.edges.size > 0);
        // Step 3: Mark them as visited / remove from other nodes dependencies
        for (const node of graph) {
            for (const visited of nodesWithoutDependencies) {
                node.edges.delete(visited);
            }
        }
    }
    return ret;
}
exports.topologicalSort = topologicalSort;
//# sourceMappingURL=graph.js.map