declare module "@serialport/binding-mock" {
	import { BaseBinding } from "serialport";
	/**
	 * Mock bindings for pretend serialport access
	 */
	declare class MockBinding extends BaseBinding {
		// if record is true this buffer will have all data that has been written to this port
		readonly recording: Buffer;

		// the buffer of the latest written data
		readonly lastWrite: null | Buffer;

		// Create a mock port
		static createPort(
			path: string,
			opt: { echo?: boolean; record?: boolean; readyData?: Buffer },
		): void;

		// Reset available mock ports
		static reset(): void;

		// list mock ports
		static list(): Promise<PortInfo[]>;

		// Emit data on a mock port
		emitData(data: Buffer | string | number[]): void;

		// Standard bindings interface
		open(path: string, opt: OpenOpts): Promise<void>;
		close(): Promise<void>;
		read(buffer: Buffer, offset: number, length: number): Promise<Buffer>;
		write(buffer: Buffer): Promise<void>;
		update(options: { baudRate: number }): Promise<void>;
		set(options: any): Promise<void>;
		get(): Promise<Flags>;
		getBaudRate(): Promise<number>;
		flush(): Promise<void>;
		drain(): Promise<void>;
	}
	export = MockBinding;
}
