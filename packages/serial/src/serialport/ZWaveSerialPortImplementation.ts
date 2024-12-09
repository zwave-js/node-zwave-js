/* eslint-disable @typescript-eslint/no-deprecated */
import { isObject } from "alcalzone-shared/typeguards";
import { type EventEmitter } from "node:events";
import { type Duplex } from "node:stream";

export function isZWaveSerialPortImplementation(
	obj: unknown,
): obj is ZWaveSerialPortImplementation {
	return (
		isObject(obj)
		&& typeof obj.create === "function"
		&& typeof obj.open === "function"
		&& typeof obj.close === "function"
	);
}

/** @deprecated Use {@link ZWaveSerialBindingFactory} instead */
export interface ZWaveSerialPortImplementation {
	create(): Duplex & EventEmitter;
	open(
		port: ReturnType<ZWaveSerialPortImplementation["create"]>,
	): Promise<void>;
	close(
		port: ReturnType<ZWaveSerialPortImplementation["create"]>,
	): Promise<void>;
}
