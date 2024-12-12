import { type ZWaveSerialBindingFactory } from "./ZWaveSerialStream.js";

export type EnumeratedPort = {
	type: "link";
	path: string;
} | {
	type: "tty";
	path: string;
} | {
	type: "socket";
	path: string;
} | {
	type: "custom";
	factory: ZWaveSerialBindingFactory;
};

/** Abstractions to interact with serial ports on different platforms */
export interface Serial {
	/** Create a binding factory from the given path, if supported by the platform */
	createFactoryByPath?: (path: string) => Promise<ZWaveSerialBindingFactory>;

	/** List the available serial ports, if supported by the platform */
	list?: () => Promise<EnumeratedPort[]>;
}
