import type { ZWaveSerialPort } from "@zwave-js/serial";
import {
	type MockPortBinding,
	createAndOpenMockedZWaveSerialPort,
} from "@zwave-js/serial/mock";
import {
	MockController,
	type MockControllerBehavior,
	type MockControllerOptions,
	MockNode,
	type MockNodeBehavior,
	type MockNodeOptions,
} from "@zwave-js/testing";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { type AddressInfo, type Server, createServer } from "node:net";
import {
	createDefaultMockControllerBehaviors,
	createDefaultMockNodeBehaviors,
} from "./Utils";

export type MockServerControllerOptions =
	& Pick<
		MockControllerOptions,
		"ownNodeId" | "homeId" | "capabilities"
	>
	& {
		behaviors?: MockControllerBehavior[];
	};

export type MockServerNodeOptions =
	& Pick<
		MockNodeOptions,
		"id" | "capabilities"
	>
	& {
		behaviors?: MockNodeBehavior[];
	};

export type MockServerInitHook = (
	controller: MockController,
	nodes: MockNode[],
) => void;

export interface MockServerOptions {
	interface?: string;
	port?: number;
	config?: {
		controller?: MockServerControllerOptions;
		nodes?: MockServerNodeOptions[];
		onInit?: MockServerInitHook;
	};
}

export class MockServer {
	public constructor(private options: MockServerOptions = {}) {}

	private serialport: ZWaveSerialPort | undefined;
	private binding: MockPortBinding | undefined;
	private server: Server | undefined;
	private mockController: MockController | undefined;
	private mockNodes: MockNode[] | undefined;

	public async start(): Promise<void> {
		const { port: serialport, binding } =
			await createAndOpenMockedZWaveSerialPort("/tty/FAKE");

		this.serialport = serialport;
		this.binding = binding;

		console.log("Mock serial port opened");

		// Hook up a fake controller and nodes
		({ mockController: this.mockController, mockNodes: this.mockNodes } =
			prepareMocks(
				binding,
				this.options.config?.controller,
				this.options.config?.nodes,
			));

		// Call the init hook if it is defined
		if (typeof this.options.config?.onInit === "function") {
			this.options.config.onInit(this.mockController, this.mockNodes);
		}

		// Start a TCP server, listen for connections, and forward them to the serial port
		this.server = createServer((socket) => {
			if (!this.serialport) {
				console.error("Serial port not initialized");
				socket.destroy();
				return;
			}

			console.log("Client connected");

			socket.pipe(this.serialport);
			this.serialport.on("data", (chunk) => {
				if (typeof chunk === "number") {
					socket.write(Buffer.from([chunk]));
				} else {
					socket.write(chunk);
				}
			});

			// when the connection is closed, unpipe the streams
			socket.on("close", () => {
				console.log("Client disconnected");

				socket.unpipe(this.serialport);
				this.serialport?.removeAllListeners("data");
			});
		});

		// Do not allow more than one client to connect
		this.server.maxConnections = 1;

		const promise = createDeferredPromise();
		this.server.on("error", (err) => {
			if ((err as any).code === "EADDRINUSE") {
				promise.reject(err);
			}
		});
		this.server.listen(
			{
				host: this.options.interface,
				port: this.options.port ?? 5555,
			},
			() => {
				const address: AddressInfo = this.server!.address() as any;
				console.log(
					`Server listening on tcp://${address.address}:${address.port}`,
				);
				promise.resolve();
			},
		);
	}

	public async stop(): Promise<void> {
		console.log("Shutting down mock server...");
		this.mockController?.destroy();
		this.server?.close();
		await this.serialport?.close();
		if (this.binding?.isOpen) await this.binding?.close();
		console.log("Mock server shut down");
	}
}

function prepareMocks(
	mockPort: MockPortBinding,
	controller: MockServerControllerOptions = {},
	nodes: MockServerNodeOptions[] = [],
): { mockController: MockController; mockNodes: MockNode[] } {
	const mockController = new MockController({
		homeId: 0x7e570001,
		ownNodeId: 1,
		...controller,
		serial: mockPort,
	});
	// Apply default behaviors that are required for interacting with the driver correctly
	mockController.defineBehavior(...createDefaultMockControllerBehaviors());
	// Apply custom behaviors
	if (controller.behaviors) {
		mockController.defineBehavior(...controller.behaviors);
	}

	const mockNodes: MockNode[] = [];
	for (const node of nodes) {
		const mockNode = new MockNode({
			...node,
			controller: mockController,
		});
		mockController.addNode(mockNode);
		mockNodes.push(mockNode);

		// Apply default behaviors that are required for interacting with the driver correctly
		mockNode.defineBehavior(...createDefaultMockNodeBehaviors());
		// Apply custom behaviors
		if (node.behaviors) {
			mockNode.defineBehavior(...node.behaviors);
		}
	}

	return {
		mockController,
		mockNodes,
	};
}
