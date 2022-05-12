import type { MockController } from "./MockController";

/** A mock node that can be used to test the driver as if it were speaking to an actual network */
export class MockNode {
	public constructor(
		public readonly id: number,
		public readonly controller: MockController,
	) {}

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
