import { CommandClasses } from "@zwave-js/core";
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
	type PartialCCCapabilities,
	getDefaultMockEndpointCapabilities,
	getDefaultMockNodeCapabilities,
} from "@zwave-js/testing";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { type AddressInfo, type Server, createServer } from "node:net";
import {
	ProtocolVersion,
	createDefaultMockControllerBehaviors,
	createDefaultMockNodeBehaviors,
} from "./Utils";
import { type CommandClassDump, type NodeDump } from "./lib/node/Dump";

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

export function createMockNodeOptionsFromDump(
	dump: NodeDump,
): MockServerNodeOptions {
	const ret: MockServerNodeOptions = {
		id: dump.id,
	};

	ret.capabilities = getDefaultMockNodeCapabilities();

	if (typeof dump.isListening === "boolean") {
		ret.capabilities.isListening = dump.isListening;
	}
	if (dump.isFrequentListening !== "unknown") {
		ret.capabilities.isFrequentListening = dump.isFrequentListening;
	}
	if (typeof dump.isRouting === "boolean") {
		ret.capabilities.isRouting = dump.isRouting;
	}
	if (typeof dump.supportsBeaming === "boolean") {
		ret.capabilities.supportsBeaming = dump.supportsBeaming;
	}
	if (typeof dump.supportsSecurity === "boolean") {
		ret.capabilities.supportsSecurity = dump.supportsSecurity;
	}
	if (typeof dump.supportedDataRates === "boolean") {
		ret.capabilities.supportedDataRates = dump.supportedDataRates;
	}
	if ((ProtocolVersion as any)[dump.protocol] !== undefined) {
		ret.capabilities.protocolVersion =
			(ProtocolVersion as any)[dump.protocol];
	}

	if (dump.deviceClass !== "unknown") {
		ret.capabilities.basicDeviceClass = dump.deviceClass.basic.key;
		ret.capabilities.genericDeviceClass = dump.deviceClass.generic.key;
		ret.capabilities.specificDeviceClass = dump.deviceClass.specific.key;
	}

	ret.capabilities.firmwareVersion = dump.fingerprint.firmwareVersion;
	ret.capabilities.manufacturerId = parseInt(
		dump.fingerprint.manufacturerId,
		16,
	);
	ret.capabilities.productType = parseInt(dump.fingerprint.productType, 16);
	ret.capabilities.productId = parseInt(dump.fingerprint.productId, 16);

	for (const [ccName, ccDump] of Object.entries(dump.commandClasses)) {
		const ccId = (CommandClasses as any)[ccName];
		if (ccId == undefined) continue;
		// FIXME: Security encapsulation is not supported yet in mocks
		if (
			ccId === CommandClasses.Security
			|| ccId === CommandClasses["Security 2"]
		) {
			continue;
		}

		ret.capabilities.commandClasses ??= [];
		ret.capabilities.commandClasses.push(
			createCCCapabilitiesFromDump(ccId, ccDump),
		);
	}

	if (dump.endpoints) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [indexStr, endpointDump] of Object.entries(dump.endpoints)) {
			// FIXME: The mocks expect endpoints to be consecutive
			// const index = parseInt(indexStr);

			const epCaps = getDefaultMockEndpointCapabilities(
				// @ts-expect-error We are initializing the device classes above
				ret.capabilities,
			);
			let epCCs: PartialCCCapabilities[] | undefined;
			if (endpointDump.deviceClass !== "unknown") {
				epCaps.genericDeviceClass =
					endpointDump.deviceClass.generic.key;
				epCaps.specificDeviceClass =
					endpointDump.deviceClass.specific.key;
			}

			for (
				const [ccName, ccDump] of Object.entries(
					endpointDump.commandClasses,
				)
			) {
				const ccId = (CommandClasses as any)[ccName];
				if (ccId == undefined) continue;
				// FIXME: Security encapsulation is not supported yet in mocks
				if (
					ccId === CommandClasses.Security
					|| ccId === CommandClasses["Security 2"]
				) {
					continue;
				}

				epCCs ??= [];
				epCCs.push(
					createCCCapabilitiesFromDump(ccId, ccDump),
				);
			}

			ret.capabilities.endpoints ??= [];
			ret.capabilities.endpoints.push({
				...epCaps,
				commandClasses: epCCs,
			});
		}
	}

	return ret;
}

function createCCCapabilitiesFromDump(
	ccId: CommandClasses,
	dump: CommandClassDump,
): PartialCCCapabilities {
	const ret: PartialCCCapabilities = {
		ccId,
		isSupported: dump.isSupported,
		isControlled: dump.isControlled,
		secure: dump.secure,
		version: dump.version,
	};

	// TODO: Parse CC specific info from values

	return ret;
}
