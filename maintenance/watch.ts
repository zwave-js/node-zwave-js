import { bold, gray, green, red } from "ansi-colors";
import cp from "child_process";
import chokidar from "chokidar";
import crypto from "crypto";
import fs from "fs";

// @ts-expect-error This is available in Node 16, but we're targeting Node 14
import stream from "stream/promises";

import type PQueue from "p-queue";

const ABORT_RUNNING = false;

const task = process.argv[2];
const taskArgs = process.argv.slice(3);

const changes = new Set<string>();
const hashes = new Map<string, Promise<Buffer>>();
let prevHash: Buffer | undefined;
let hashQueue: PQueue | undefined;

let ready = false;
let child: cp.ChildProcess | undefined;

const watcher = chokidar.watch(
	[
		"packages/**/*.ts",
		"packages/**/tsconfig.json",
		"packages/**/tsconfig.build.json",
		"packages/**/package.json",
		"package.json",
		"tsconfig.json",
		"tsconfig.*.json",
		"turbo.json",
		"yarn.lock",
	],
	{
		ignored: ["**/build/**", "**/node_modules/**"],
		cwd: process.cwd(),
		atomic: true,
	},
);

async function exec(): Promise<void> {
	if (!ABORT_RUNNING && child) return;

	// before running the task, wait for all the hashes to be calculated
	const entries = await Promise.all(
		[...hashes.entries()].map(
			async ([filename, hash]) => [filename, await hash] as const,
		),
	);
	entries.sort(([fileA], [fileB]) => fileA.localeCompare(fileB));

	if (changes.size > 0) {
		// console.log("Files updated:");
		// for (const change of changes) {
		// 	console.log(change);
		// }
		// console.log();
		changes.clear();
	}

	// Then compute a combined hash of all filenames and their hashes
	const hasher = crypto.createHash("sha256");
	for (const [filename, hash] of entries) {
		hasher.update(filename);
		hasher.update(hash);
	}
	const totalHash = hasher.digest();

	// And only run the task if the hash has changed
	if (prevHash?.equals(totalHash)) {
		// console.log("No changes detected, skipping task...");
		// console.log();
		return;
	}

	if (child) child.kill("SIGTERM");

	console.log();
	console.log(`👀 ${bold(task)}: starting...`);
	console.log();

	child = cp.spawn("yarn", [task, ...taskArgs], {
		stdio: "inherit",
		windowsHide: true,
		shell: true,
	});
	child.on("exit", (code) => {
		if (code === 0) {
			console.log(green(`👀 ${bold(task)}: completed successfully!`));
			prevHash = totalHash;
		} else {
			console.log(red(`👀 ${bold(task)}: failed with code ${code}`));
		}
		child = undefined;

		console.log(
			gray(`   Waiting for file changes... Press Ctrl+C to exit.`),
		);
	});
}

const debouncedExec = debounce(exec, 250);

watcher
	.on("add", (filename) => {
		// Whenever a file is added, hash it and call exec when done
		hashes.set(filename, hashFile(filename));
		if (ready) {
			changes.add("+ " + filename);
			debouncedExec();
		}
	})
	.on("change", (filename) => {
		// Whenever a file is added, hash it and call exec when done
		hashes.set(filename, hashFile(filename));
		if (ready) {
			changes.add("~ " + filename);
			debouncedExec();
		}
	})
	.on("unlink", (filename) => {
		// Whenever a file is removed, remove its hash and call exec
		hashes.delete(filename);
		if (ready) {
			changes.add("- " + filename);
			debouncedExec();
		}
	})
	.on("ready", () => {
		ready = true;
		void exec();
	});

process.on("SIGINT", () => {
	child?.kill("SIGTERM");
	void watcher.close();
});

async function hashFile(filename: string): Promise<Buffer> {
	// You just gotta love ESM
	if (!hashQueue) {
		const PQueue = (await import("p-queue")).default;
		hashQueue = new PQueue({ concurrency: 10 });
	}
	// Weird types...
	const result: Buffer | void = await hashQueue.add(async () => {
		const reader = fs.createReadStream(filename);
		const hasher = crypto.createHash("sha256");
		await stream.pipeline(reader, hasher);
		return hasher.digest();
	});
	
	return result!;
}

function debounce(fn: () => void, timeout: number) {
	let timeoutId: NodeJS.Timeout;
	return () => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(fn, timeout);
	};
}
