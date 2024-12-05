import { isAbortError, noop } from "@zwave-js/shared";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";

/**
 * Merge multiple streams into a single one, not taking order into account.
 * If a stream ends before other ones, the other will continue adding data,
 * and the finished one will not add any more data.
 */
export function mergeReadableStreams<T>(
	...streams: ReadableStream<T>[]
): ReadableStream<T> {
	const resolvePromises = streams.map(() => createDeferredPromise<void>());
	return new ReadableStream<T>({
		start(controller) {
			void Promise.all(resolvePromises)
				.then(() => controller.close())
				.catch(noop);
			try {
				for (const [key, stream] of Object.entries(streams)) {
					void (async () => {
						try {
							for await (const data of stream) {
								controller.enqueue(data);
							}
						} catch (e) {
							// AbortErrors are expected when the stream is closed
							if (!isAbortError(e)) {
								try {
									controller.error(e);
								} catch {
									// ignore if the controller is already in a failed state
								}
							}
						}
						resolvePromises[+key].resolve();
					})();
				}
			} catch (e) {
				controller.error(e);
			}
		},
	});
}
