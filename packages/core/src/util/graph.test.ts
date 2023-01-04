import test from "ava";
import { GraphNode, topologicalSort } from "./graph";

test("topologicalSort() -> should sort correctly (Test 1)", (t) => {
	const nodes = [
		new GraphNode(1),
		new GraphNode(2),
		new GraphNode(3),
		new GraphNode(4),
	];
	nodes[0].edges.add(nodes[1]);
	nodes[0].edges.add(nodes[2]);
	nodes[1].edges.add(nodes[3]);
	nodes[2].edges.add(nodes[3]);

	t.deepEqual(topologicalSort(nodes), [4, 2, 3, 1]);
});

test("topologicalSort() -> should sort correctly (Test 2)", (t) => {
	const nodes = [
		new GraphNode(1),
		new GraphNode(2),
		new GraphNode(3),
		new GraphNode(4),
	];
	nodes[0].edges.add(nodes[3]);
	nodes[0].edges.add(nodes[2]);
	nodes[3].edges.add(nodes[1]);
	nodes[2].edges.add(nodes[3]);

	t.deepEqual(topologicalSort(nodes), [2, 4, 3, 1]);
});

test("topologicalSort() -> should throw when there are circular dependencies", (t) => {
	const nodes = [
		new GraphNode(1),
		new GraphNode(2),
		new GraphNode(3),
		new GraphNode(4),
	];
	nodes[0].edges.add(nodes[1]);
	nodes[1].edges.add(nodes[3]);
	nodes[3].edges.add(nodes[2]);
	nodes[2].edges.add(nodes[0]);

	t.throws(() => topologicalSort(nodes));
});
