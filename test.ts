import { wait } from "alcalzone-shared/async";
import stream from "stream";

const queue = new stream.PassThrough({ objectMode: true });

interface Item {
	id: number;
}

process.nextTick(async () => {
	for await (const item of queue as AsyncIterable<Item>) {
		console.log("processing item", item.id);
		await wait(250);
		console.log("finished item", item.id);
		console.log();
	}
	console.log("queue finished");
});

async function main() {
	console.log("adding item", 1);
	queue.write({ id: 1 });
	await wait(100);
	console.log("adding item", 2);
	queue.write({ id: 2 });
	console.log("adding item", 3);
	queue.write({ id: 3 });

	await wait(1000);
	console.log("adding item", 4);
	queue.write({ id: 4 });

	await wait(2000);
	console.log("adding item", 5);
	queue.write({ id: 5 });
	console.log("closing stream");
	queue.end();
}

void main();
