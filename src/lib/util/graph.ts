import type { Comparer } from "alcalzone-shared/comparable";

export class GraphNode<T> {
	public constructor(value: T, edges: Iterable<GraphNode<T>> = []) {
		this.value = value;
		this.edges = new Set(edges);
	}

	/** The value of this node */
	public readonly value: T;
	/** Which nodes this node depends on */
	public readonly edges: Set<GraphNode<T>>;
}

/**
 * Performs a topological sort of the given graph so that nodes without dependencies come first.
 * Warning: This method will change the input dataset!
 */
export function topologicalSort<T>(
	graph: GraphNode<T>[],
	comparer?: Comparer<T>,
): T[] {
	const ret: T[] = [];
	while (graph.length) {
		// Step 1: Find nodes without dependencies
		const nodesWithoutDependencies = graph.filter(
			(node) => node.edges.size === 0,
		);
		if (!nodesWithoutDependencies.length) {
			throw new Error("Circular dependency detected!");
		}
		// Step 2: Move them from the input to the output
		const newNodes = nodesWithoutDependencies.map((node) => node.value);
		if (comparer) newNodes.sort(comparer);
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
