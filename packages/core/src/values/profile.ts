import { JsonlDB } from "@alcalzone/jsonl-db";
import * as fs from "fs-extra";
import { highResTimestamp } from "../util/date";
import { ValueDB } from "./ValueDB";

const values: JsonlDB<any> = new JsonlDB("test.values.jsonl");
const metadata: JsonlDB<any> = new JsonlDB("test.metadata.jsonl");
const valueDBs = new Map<number, ValueDB>();

(async () => {
	await values.open();
	await metadata.open();
	// add a shitton of values
	for (let nodeId = 1; nodeId <= 100; nodeId++) {
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

	const start = highResTimestamp();
	for (let i = 1; i <= numRounds; i++) {
		valueDBs.get(1)!.getValues(5);
	}
	const duration = highResTimestamp() - start;
	console.log(`took ${(duration / 1e6 / numRounds).toFixed(2)} ms / call`);

	await values.close();
	await metadata.close();
	await fs.remove("test.values.jsonl");
	await fs.remove("test.metadata.jsonl");
})().catch(() => {});
