import { JsonlDB } from "@alcalzone/jsonl-db";
import { highResTimestamp } from "@zwave-js/core/src/util/date";
import { indexDBsByNode, ValueDB } from "@zwave-js/core/src/values/ValueDB";
import * as fs from "fs-extra";

const values: JsonlDB<any> = new JsonlDB("test.values.jsonl", {
	autoCompress: { onClose: false },
});
const metadata: JsonlDB<any> = new JsonlDB("test.metadata.jsonl", {
	autoCompress: { onClose: false },
});
const valueDBs = new Map<number, ValueDB>();

(async () => {
	await values.open();
	await metadata.open();
	// add a shitton of values
	console.time("create value DB");
	const MAX_NODES = 100;
	for (let nodeId = 1; nodeId <= MAX_NODES; nodeId++) {
		const valueDB = new ValueDB(nodeId, values, metadata);
		valueDBs.set(nodeId, valueDB);
		for (let ccId = 1; ccId <= 100; ccId++) {
			for (let endpoint = 0; endpoint <= 10; endpoint++) {
				for (const property of ["a", "b", "c", "d", "e"]) {
					valueDB.setValue(
						{
							commandClass: ccId,
							endpoint,
							property,
						},
						Math.random() * 100,
					);
				}
			}
		}
	}
	await values.close();
	console.timeEnd("create value DB");

	console.time("open value DB");
	await values.open();
	console.timeEnd("open value DB");

	console.time("index value DB");
	const indexes = indexDBsByNode([values, metadata]);

	for (let nodeId = 1; nodeId <= MAX_NODES; nodeId++) {
		const valueDB = new ValueDB(
			nodeId,
			values,
			metadata,
			indexes.get(nodeId),
		);
		valueDBs.set(nodeId, valueDB);
	}
	console.timeEnd("index value DB");

	console.log(`db contains ${values.size} values`);
	const numRounds = 100;

	console.log(`calling getValues ${numRounds} times`);

	let start = highResTimestamp();
	let numValues: number;
	for (let i = 1; i <= numRounds; i++) {
		numValues = valueDBs.get(1)!.getValues(5).length;
	}
	let duration = highResTimestamp() - start;
	console.log(`took ${(duration / 1e6 / numRounds).toFixed(2)} ms / call`);
	console.log(`found ${numValues!} values`);

	console.log(`calling clear for each node (${MAX_NODES})`);

	start = highResTimestamp();
	for (let nodeID = 1; nodeID <= MAX_NODES; nodeID++) {
		valueDBs.get(nodeID)!.clear({ noEvent: true });
	}
	duration = highResTimestamp() - start;
	console.log(`took ${(duration / 1e6 / numRounds).toFixed(2)} ms / call`);

	await values.close();
	await metadata.close();
	await fs.remove("test.values.jsonl");
	await fs.remove("test.metadata.jsonl");
})().catch(() => {
	/* ignore */
});
