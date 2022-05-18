import type { MockController } from "./MockController";
import {
	getDefaultMockNodeCapabilities,
	type MockNodeCapabilities,
} from "./MockNodeCapabilities";

export interface MockNodeOptions {
	id: number;
	controller: MockController;
	capabilities?: Partial<MockNodeCapabilities>;
}

/** A mock node that can be used to test the driver as if it were speaking to an actual network */
export class MockNode {
	public constructor(options: MockNodeOptions) {
		this.id = options.id;
		this.controller = options.controller;

		this.capabilities = {
			...getDefaultMockNodeCapabilities(),
			...options.capabilities,
		};
	}

	public readonly id: number;
	public readonly controller: MockController;
	public readonly capabilities: MockNodeCapabilities;

	/**
	 * Sends a raw buffer to the {@link MockController}
	 * @param data The data to send. The mock controller expects a complete message/command.
	 */
	public sendToController(data: Buffer): void {
		this.controller.nodeOnData(this, data);
	}

	/** Gets called when data is received from the {@link MockController} */
	public controllerOnData(_data: Buffer): void {
		// TODO: handle message buffer
	}
}
