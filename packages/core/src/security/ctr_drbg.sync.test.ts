import { hexToUint8Array } from "@zwave-js/shared/safe";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { CtrDrbgSync } from "./ctr_drbg.sync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getVectors(alg: string) {
	const text = fs.readFileSync(
		path.join(__dirname, "ctr_drbg.test.vectors.limited.txt"),
		"utf8",
	);
	const vectors = [];

	let from = -1;

	while (true) {
		from = text.indexOf(`[${alg}]`, from + 1);

		if (from === -1) break;

		for (let i = 0; i < 15; i++) {
			const vector: Record<string, any> = {};
			const start = text.indexOf(`COUNT = ${i}`, from);
			const end = text.indexOf("\n\n", start);
			const items = text.slice(start, end).split("\n");

			for (let j = 1; j < items.length; j++) {
				const key = items[j].split(" = ")[0];
				const value = hexToUint8Array(items[j].split(" = ")[1]);

				if (vector[key]) vector[key] = [vector[key], value];
				else vector[key] = value;
			}

			vectors.push(vector);
		}
	}

	return vectors;
}

for (const id of ["AES-128"]) {
	const name = id + " no df";
	const vectors = getVectors(name);

	for (const [i, vector] of vectors.entries()) {
		test(
			`CtrDrbgAsync -> should pass ${name} NIST vector #${
				i + 1
			} (ctr,df=false)`,
			async (t) => {
				const drbg = new CtrDrbgSync();

				drbg.init(
					vector.EntropyInput,
				);

				drbg["reseed"](
					vector.EntropyInputReseed,
				);

				drbg.generate(
					vector.ReturnedBits.byteLength,
				);

				const result = drbg.generate(
					vector.ReturnedBits.byteLength,
				);

				t.expect(result).toStrictEqual(vector.ReturnedBits);
			},
		);
	}
}
