import { type ZWaveSerialBindingFactory } from "@zwave-js/serial";

export function createWebSerialPortFactory(
	port: SerialPort,
): ZWaveSerialBindingFactory {
	const sink: UnderlyingSink<Uint8Array> = {
		close() {
			console.log("sink.close()");
			port.close();
		},
		async write(chunk) {
			const writer = port.writable!.getWriter();
			try {
				await writer.write(chunk);
			} finally {
				writer.releaseLock();
			}
		},
	};

	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

	const source: UnderlyingDefaultSource<Uint8Array> = {
		async start(controller) {
			reader = port.readable!.getReader();
			try {
				while (true) {
					const { value, done } = await reader.read();
					if (done) {
						break;
					}
					controller.enqueue(value);
				}
			} finally {
				reader.releaseLock();
			}
		},
		async cancel() {
			await reader?.cancel();
		},
	};

	// @ts-expect-error Slight mismatch between the web types and Node.js
	return () => Promise.resolve({ source, sink });
}
