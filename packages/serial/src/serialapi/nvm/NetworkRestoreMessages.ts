import {
	type FLiRS,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ZWaveDataRate,
	encodeNodeID,
	logBuffer,
	parseNodeID,
} from "@zwave-js/core";
import { createSimpleReflectionDecorator } from "@zwave-js/core/reflection";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageConstructor,
	type MessageEncodingContext,
	MessageOrigin,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import {
	Bytes,
	type BytesView,
	getEnumMemberName,
	num2hex,
} from "@zwave-js/shared";

export enum NetworkRestoreCommand {
	Prepare = 0x00,
	RestoreHomeID = 0x01,
	RestoreDevice = 0x02,
	RestoreNeighbors = 0x03,
	RestoreRoutes = 0x04,
	Finalize = 0xff,
}

export enum NetworkRestoreStatus {
	OK = 0x00,
	Error = 0x01,
	Error_LongRangeNotSupported = 0x02,
	Error_SubcommandNotSupported = 0x04,
}

export enum NetworkRestoreRouteType {
	APR = 0x00,
	LWR = 0x01,
	NLWR = 0x02,
}

export interface NetworkRestoreRoute {
	type: NetworkRestoreRouteType;
	beam: FLiRS;
	speed: ZWaveDataRate;
	hops: number[];
}

const {
	decorator: subCommandRequest,
	lookupConstructor: getSubCommandRequestConstructor,
	lookupValue: getSubCommandForRequest,
} = createSimpleReflectionDecorator<
	typeof NetworkRestoreRequest,
	[command: NetworkRestoreCommand],
	MessageConstructor<NetworkRestoreRequest>
>({
	name: "subCommandRequest",
});

function encodeRoute(route: NetworkRestoreRoute): Bytes {
	const ret = new Bytes(6);
	ret[0] = route.type;
	const beam = route.beam === "1000ms"
		? 0x02
		: route.beam === "250ms"
		? 0x01
		: 0x00;
	const speed = route.speed === ZWaveDataRate["100k"]
		? 0x02
		: route.speed === ZWaveDataRate["40k"]
		? 0x01
		: 0x00;
	ret[1] = (beam << 6) | speed;
	ret.set(route.hops, 2);
	return ret;
}

function parseRoute(payload: BytesView): NetworkRestoreRoute {
	const beamBits = payload[1] >>> 6;
	const beam: FLiRS = beamBits === 0x02
		? "1000ms"
		: beamBits === 0x01
		? "250ms"
		: false;
	const speedBits = payload[1] & 0b11;
	const speed = speedBits === 0x02
		? ZWaveDataRate["100k"]
		: speedBits === 0x01
		? ZWaveDataRate["40k"]
		: ZWaveDataRate["9k6"];

	return {
		type: payload[0],
		beam,
		speed,
		hops: [...payload.subarray(2)].filter((nodeId) => nodeId !== 0),
	};
}

function testResponseForNetworkRestoreRequest(
	sent: Message,
	received: Message,
): boolean {
	return (
		sent instanceof NetworkRestoreRequest
		&& received instanceof NetworkRestoreResponse
		&& sent.command === received.command
	);
}

@messageTypes(MessageType.Request, FunctionType.NetworkRestore)
@priority(MessagePriority.Controller)
export class NetworkRestoreRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): NetworkRestoreRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return NetworkRestoreRequest.from(raw, ctx);
		}
		return NetworkRestoreCallback.from(raw, ctx);
	}
}

export interface NetworkRestoreRequestOptions {
	command?: NetworkRestoreCommand;
}

@expectedResponse(testResponseForNetworkRestoreRequest)
@expectedCallback(FunctionType.NetworkRestore)
export class NetworkRestoreRequest extends NetworkRestoreRequestBase {
	public constructor(
		options: NetworkRestoreRequestOptions & MessageBaseOptions = {},
	) {
		super(options);
		this.command = options.command ?? getSubCommandForRequest(this)!;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): NetworkRestoreRequest {
		const command: NetworkRestoreCommand = raw.payload[0];
		const payload = raw.payload.subarray(1);
		const CommandConstructor = getSubCommandRequestConstructor(command);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as NetworkRestoreRequest;
		}

		const ret = new NetworkRestoreRequest({ command });
		ret.payload = payload;
		return ret;
	}

	public readonly command: NetworkRestoreCommand;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.concat([
			[this.command],
			this.payload,
			[this.callbackId],
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				command: getEnumMemberName(NetworkRestoreCommand, this.command),
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

@subCommandRequest(NetworkRestoreCommand.Prepare)
export class NetworkRestorePrepareRequest extends NetworkRestoreRequest {
	public constructor(options: MessageBaseOptions = {}) {
		super(options);
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NetworkRestorePrepareRequest {
		return new this({ callbackId: raw.payload[0] });
	}
}

export interface NetworkRestoreHomeIDRequestOptions {
	homeId: number;
	controllerNodeId: number;
}

@subCommandRequest(NetworkRestoreCommand.RestoreHomeID)
export class NetworkRestoreHomeIDRequest extends NetworkRestoreRequest {
	public constructor(
		options: NetworkRestoreHomeIDRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.homeId = options.homeId;
		this.controllerNodeId = options.controllerNodeId;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NetworkRestoreHomeIDRequest {
		return new this({
			homeId: raw.payload.readUInt32BE(0),
			controllerNodeId: raw.payload[4],
			callbackId: raw.payload[5],
		});
	}

	public readonly homeId: number;
	public readonly controllerNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(5);
		this.payload.writeUInt32BE(this.homeId, 0);
		this.payload[4] = this.controllerNodeId;
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: {
				...ret.message,
				"home ID": num2hex(this.homeId),
				"controller node ID": this.controllerNodeId,
			},
		};
	}
}

export interface NetworkRestoreDeviceRequestOptions {
	nodeId: number;
	protocolData: BytesView;
}

@subCommandRequest(NetworkRestoreCommand.RestoreDevice)
export class NetworkRestoreDeviceRequest extends NetworkRestoreRequest {
	public constructor(
		options: NetworkRestoreDeviceRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.nodeId = options.nodeId;
		this.protocolData = Bytes.from(options.protocolData);
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): NetworkRestoreDeviceRequest {
		const { nodeId, bytesRead } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
		);
		return new this({
			nodeId,
			protocolData: raw.payload.subarray(bytesRead, bytesRead + 5),
			callbackId: raw.payload[bytesRead + 5],
		});
	}

	public readonly nodeId: number;
	public readonly protocolData: Bytes;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			encodeNodeID(this.nodeId, ctx.nodeIdType),
			this.protocolData,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: {
				...ret.message,
				"node ID": this.nodeId,
				"protocol data": logBuffer(this.protocolData),
			},
		};
	}
}

export interface NetworkRestoreNeighborsRequestOptions {
	nodeId: number;
	neighbors: BytesView;
}

@subCommandRequest(NetworkRestoreCommand.RestoreNeighbors)
export class NetworkRestoreNeighborsRequest extends NetworkRestoreRequest {
	public constructor(
		options: NetworkRestoreNeighborsRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.nodeId = options.nodeId;
		this.neighbors = Bytes.from(options.neighbors);
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): NetworkRestoreNeighborsRequest {
		const { nodeId, bytesRead } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
		);
		return new this({
			nodeId,
			neighbors: raw.payload.subarray(bytesRead, bytesRead + 29),
			callbackId: raw.payload[bytesRead + 29],
		});
	}

	public readonly nodeId: number;
	public readonly neighbors: Bytes;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			encodeNodeID(this.nodeId, ctx.nodeIdType),
			this.neighbors,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: {
				...ret.message,
				"node ID": this.nodeId,
				neighbors: logBuffer(this.neighbors),
			},
		};
	}
}

export interface NetworkRestoreRoutesRequestOptions {
	nodeId: number;
	routes: NetworkRestoreRoute[];
}

@subCommandRequest(NetworkRestoreCommand.RestoreRoutes)
export class NetworkRestoreRoutesRequest extends NetworkRestoreRequest {
	public constructor(
		options: NetworkRestoreRoutesRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.nodeId = options.nodeId;
		this.routes = options.routes.map((route) => ({
			...route,
			hops: [...route.hops],
		}));
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): NetworkRestoreRoutesRequest {
		const { nodeId, bytesRead } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
		);
		const routeCount = raw.payload[bytesRead];

		const routes: NetworkRestoreRoute[] = [];
		for (let i = 0; i < routeCount; i++) {
			const offset = bytesRead + 1 + i * 6;
			routes.push(parseRoute(raw.payload.subarray(offset, offset + 6)));
		}

		return new this({
			nodeId,
			routes,
			callbackId: raw.payload.at(-1),
		});
	}

	public readonly nodeId: number;
	public readonly routes: NetworkRestoreRoute[];

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			encodeNodeID(this.nodeId, ctx.nodeIdType),
			[this.routes.length],
			...this.routes.map(encodeRoute),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		const message: MessageRecord = {
			command: getEnumMemberName(NetworkRestoreCommand, this.command),
			"callback id": this.callbackId ?? "(not set)",
			"node ID": this.nodeId,
			routes: this.routes.length,
		};
		for (const route of this.routes) {
			message[getEnumMemberName(NetworkRestoreRouteType, route.type)] =
				`${route.hops.length ? route.hops.join(" -> ") : "direct"}, ${
					getEnumMemberName(ZWaveDataRate, route.speed)
				}, ${route.beam || "no beam"}`;
		}
		return {
			...ret,
			message,
		};
	}
}

@subCommandRequest(NetworkRestoreCommand.Finalize)
export class NetworkRestoreFinalizeRequest extends NetworkRestoreRequest {
	public constructor(options: MessageBaseOptions = {}) {
		super(options);
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NetworkRestoreFinalizeRequest {
		return new this({ callbackId: raw.payload[0] });
	}
}

export interface NetworkRestoreResponseOptions {
	command: NetworkRestoreCommand;
	wasAccepted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.NetworkRestore)
export class NetworkRestoreResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: NetworkRestoreResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.command = options.command;
		this.wasAccepted = options.wasAccepted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NetworkRestoreResponse {
		return new this({
			command: raw.payload[0],
			wasAccepted: raw.payload[1] !== 0,
		});
	}

	public readonly command: NetworkRestoreCommand;
	public readonly wasAccepted: boolean;

	public isOK(): boolean {
		return this.wasAccepted;
	}

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			this.command,
			this.wasAccepted ? 1 : 0,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				command: getEnumMemberName(NetworkRestoreCommand, this.command),
				accepted: this.wasAccepted,
			},
		};
	}
}

export interface NetworkRestoreCallbackOptions {
	status: NetworkRestoreStatus;
}

export class NetworkRestoreCallback extends NetworkRestoreRequestBase
	implements SuccessIndicator
{
	public constructor(
		options: NetworkRestoreCallbackOptions & MessageBaseOptions,
	) {
		super(options);
		this.callbackId = options.callbackId;
		this.status = options.status;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NetworkRestoreCallback {
		return new this({
			callbackId: raw.payload[0],
			status: raw.payload[1],
		});
	}

	public readonly status: NetworkRestoreStatus;

	public isOK(): boolean {
		return this.status === NetworkRestoreStatus.OK;
	}

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.callbackId!, this.status]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId!,
				status: getEnumMemberName(NetworkRestoreStatus, this.status),
			},
		};
	}
}
