import { JsonlDB } from "@alcalzone/jsonl-db";
import { highResTimestamp } from "@zwave-js/core/src/util/date";
import { ValueDB } from "@zwave-js/core/src/values/ValueDB";
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

	console.log(`db contains ${values.size} values`);
	const numRounds = 100;

	console.log(`calling getValues ${numRounds} times`);

	let start = highResTimestamp();
	for (let i = 1; i <= numRounds; i++) {
		valueDBs.get(1)!.getValues(5);
	}
	let duration = highResTimestamp() - start;
	console.log(`took ${(duration / 1e6 / numRounds).toFixed(2)} ms / call`);

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
