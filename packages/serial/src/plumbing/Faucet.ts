/**
 * Connects a readable stream and a writable stream
 * while allowing the writable stream to be temporarily disconnected
 * or un-writable.
 *
 * Data that is emitted while no writable stream is connected is discarded.
 */
export class Faucet<T> {
	/** Creates a new Faucet. The data starts flowing immediately */
	public constructor(
		readable: ReadableStream<T>,
		writable?: WritableStream<T>,
	) {
		this.#readable = readable;
		this.#writable = writable;

		void this.#flow();
	}

	#readable: ReadableStream<T>;
	#writable: WritableStream<T> | undefined;

	#abort: AbortController | undefined;

	/**
	 * Connects a new writable to the faucet.
	 * If a writable is already connected, it is replaced.
	 */
	public connect(writable: WritableStream<T>): void {
		this.#writable = writable;
	}

	/**
	 * Disconnects the current writable from the faucet.
	 */
	public disconnect(): void {
		this.#writable = undefined;
	}

	async #flow() {
		const reader = this.#readable.getReader();
		const abort = new AbortController();
		this.#abort = abort;

		try {
			const abortPromise = new Promise<void>((resolve) => {
				abort.signal.addEventListener("abort", () => {
					resolve();
				});
			});

			while (true) {
				const result = await Promise.race([
					reader.read(),
					abortPromise.then(() => ({ done: true, value: undefined })),
				]);
				if (result.done || result.value == undefined) break;

				let writer;
				try {
					writer = this.#writable?.getWriter();
					await writer?.write(result.value);
				} catch {
					// ignore
				} finally {
					writer?.releaseLock();
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	/** Closes the faucet and stops reading data */
	public close(): void {
		this.#abort?.abort();
	}
}
