// Clone of https://github.com/serialport/node-serialport/blob/4e8a3c4a9f46a09d39374eb67a59ff10eb09a5cd/packages/serialport/lib/serialport-mock.ts
// with support for emitting events on the written side

import {
	type ErrorCallback,
	type OpenOptions,
	SerialPortStream,
} from "@serialport/stream";
import {
	MockBinding,
	type MockBindingInterface,
} from "./SerialPortBindingMock";

export type SerialPortMockOpenOptions = Omit<
	OpenOptions<MockBindingInterface>,
	"binding"
>;

export class SerialPortMock extends SerialPortStream<MockBindingInterface> {
	// es tic list = MockBinding.list;
	static readonly binding = MockBinding;

	constructor(
		options: SerialPortMockOpenOptions,
		openCallback?: ErrorCallback,
	) {
		const opts: OpenOptions<MockBindingInterface> = {
			binding: MockBinding,
			...options,
		};
		super(opts, openCallback);
	}
}
