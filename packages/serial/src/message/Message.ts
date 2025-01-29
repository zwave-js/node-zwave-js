import { type GetDeviceConfig } from "@zwave-js/config";
import {
	type GetNode,
	type GetSupportedCCVersion,
	type HostIDs,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type MessagePriority,
	type NodeIDType,
	type NodeId,
	type SecurityClass,
	type SecurityManagers,
	ZWaveError,
	ZWaveErrorCodes,
	getNodeTag,
	highResTimestamp,
} from "@zwave-js/core";
import { createReflectionDecorator } from "@zwave-js/core/reflection";
import {
	Bytes,
	type JSONObject,
	type TypedClassDecorator,
} from "@zwave-js/shared/safe";
import { num2hex, staticExtends } from "@zwave-js/shared/safe";
import { FunctionType, MessageType } from "./Constants.js";
import { MessageHeaders } from "./MessageHeaders.js";

export type MessageConstructor<T extends Message> = typeof Message & {
	new (options: MessageBaseOptions): T;
};

/** Where a serialized message originates from, to distinguish how certain messages need to be deserialized */
export enum MessageOrigin {
	Controller,
	Host,
}

export interface MessageParsingContext extends HostIDs, GetDeviceConfig {
	/** How many bytes a node ID occupies in serial API commands */
	nodeIdType: NodeIDType;
	sdkVersion: string | undefined;
	requestStorage: Map<FunctionType, Record<string, unknown>> | undefined;
	origin?: MessageOrigin;
}

export interface MessageBaseOptions {
	callbackId?: number;
}

export interface MessageOptions extends MessageBaseOptions {
	type?: MessageType;
	functionType?: FunctionType;
	expectedResponse?: FunctionType | typeof Message | ResponsePredicate;
	expectedCallback?: FunctionType | typeof Message | ResponsePredicate;
	payload?: Bytes;
}

export interface MessageEncodingContext
	extends
		Readonly<SecurityManagers>,
		HostIDs,
		GetSupportedCCVersion,
		GetDeviceConfig
{
	/** How many bytes a node ID occupies in serial API commands */
	nodeIdType: NodeIDType;

	getHighestSecurityClass(nodeId: number): MaybeNotKnown<SecurityClass>;

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean>;

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void;
}

export interface HasNodeId {
	nodeId: number;
}

/** Tests if the given message is for a node or references a node */
export function hasNodeId<T extends Message>(msg: T): msg is T & HasNodeId {
	return typeof (msg as any).nodeId === "number";
}

/** Returns the number of bytes the first message in the buffer occupies */
function getMessageLength(data: Uint8Array): number {
	const remainingLength = data[1];
	return remainingLength + 2;
}

export class MessageRaw {
	public constructor(
		public readonly type: MessageType,
		public readonly functionType: FunctionType,
		public readonly payload: Bytes,
	) {}

	public static parse(data: Uint8Array): MessageRaw {
		// SOF, length, type, commandId and checksum must be present
		if (!data.length || data.length < 5) {
			throw new ZWaveError(
				"Could not deserialize the message because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// the packet has to start with SOF
		if (data[0] !== MessageHeaders.SOF) {
			throw new ZWaveError(
				"Could not deserialize the message because it does not start with SOF",
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
		// check the length again, this time with the transmitted length
		const messageLength = getMessageLength(data);
		if (data.length < messageLength) {
			throw new ZWaveError(
				"Could not deserialize the message because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// check the checksum
		const expectedChecksum = computeChecksum(
			data.subarray(0, messageLength),
		);
		if (data[messageLength - 1] !== expectedChecksum) {
			throw new ZWaveError(
				"Could not deserialize the message because the checksum didn't match",
				ZWaveErrorCodes.PacketFormat_Checksum,
			);
		}

		const type: MessageType = data[2];
		const functionType: FunctionType = data[3];
		const payloadLength = messageLength - 5;
		const payload = Bytes.view(data.subarray(4, 4 + payloadLength));

		return new MessageRaw(type, functionType, payload);
	}

	public withPayload(payload: Bytes): MessageRaw {
		return new MessageRaw(this.type, this.functionType, payload);
	}
}

/**
 * Represents a Z-Wave message for communication with the serial interface
 */
export class Message {
	public constructor(
		options: MessageOptions = {},
	) {
		const {
			// Try to determine the message type if none is given
			type = getMessageType(this),
			// Try to determine the function type if none is given
			functionType = getFunctionType(this),
			// Fall back to decorated response/callback types if none is given
			expectedResponse = getExpectedResponse(this),
			expectedCallback = getExpectedCallback(this),
			payload = new Bytes(),
			callbackId,
		} = options;

		if (type == undefined) {
			throw new ZWaveError(
				"A message must have a given or predefined message type",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (functionType == undefined) {
			throw new ZWaveError(
				"A message must have a given or predefined function type",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.type = type;
		this.functionType = functionType;
		this.expectedResponse = expectedResponse;
		this.expectedCallback = expectedCallback;
		this.callbackId = callbackId;
		this.payload = payload;
	}

	public static parse(
		data: Uint8Array,
		ctx: MessageParsingContext,
	): Message {
		const raw = MessageRaw.parse(data);

		const Constructor = getMessageConstructor(raw.type, raw.functionType)
			?? Message;

		return Constructor.from(raw, ctx);
	}

	/** Creates an instance of the message that is serialized in the given buffer */
	public static from(
		raw: MessageRaw,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		ctx: MessageParsingContext,
	): Message {
		return new this({
			type: raw.type,
			functionType: raw.functionType,
			payload: raw.payload,
		});
	}

	public type: MessageType;
	public functionType: FunctionType;
	public expectedResponse:
		| FunctionType
		| typeof Message
		| ResponsePredicate
		| undefined;
	public expectedCallback:
		| FunctionType
		| typeof Message
		| ResponsePredicate
		| undefined;
	public payload: Bytes; // TODO: Length limit 255

	/** Used to map requests to callbacks */
	public callbackId: number | undefined;

	protected assertCallbackId(): asserts this is this & {
		callbackId: number;
	} {
		if (this.callbackId == undefined) {
			throw new ZWaveError(
				"Callback ID required but not set",
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
	}

	/** Returns whether the callback ID is set */
	public hasCallbackId(): this is this & { callbackId: number } {
		return this.callbackId != undefined;
	}

	/**
	 * Tests whether this message needs a callback ID to match its response
	 */
	public needsCallbackId(): boolean {
		return true;
	}

	/** Returns the response timeout for this message in case the default settings do not apply. */
	public getResponseTimeout(): number | undefined {
		// Use default timeout
		return;
	}

	/** Returns the callback timeout for this message in case the default settings do not apply. */
	public getCallbackTimeout(): number | undefined {
		// Use default timeout
		return;
	}

	/**
	 * Serializes this message into a Buffer
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		const ret = new Bytes(this.payload.length + 5);
		ret[0] = MessageHeaders.SOF;
		// length of the following data, including the checksum
		ret[1] = this.payload.length + 3;
		// write the remaining data
		ret[2] = this.type;
		ret[3] = this.functionType;
		ret.set(this.payload, 4);
		// followed by the checksum
		ret[ret.length - 1] = computeChecksum(ret);
		return ret;
	}

	/** Generates a representation of this Message for the log */
	public toLogEntry(): MessageOrCCLogEntry {
		const tags = [
			this.type === MessageType.Request ? "REQ" : "RES",
			FunctionType[this.functionType],
		];
		const nodeId = this.getNodeId();
		if (nodeId) tags.unshift(getNodeTag(nodeId));

		return {
			tags,
			message: this.payload.length > 0
				? { payload: `0x${this.payload.toString("hex")}` }
				: undefined,
		};
	}

	/** Generates the JSON representation of this Message */
	public toJSON(): JSONObject {
		return this.toJSONInternal();
	}

	private toJSONInternal(): JSONObject {
		const ret: JSONObject = {
			name: this.constructor.name,
			type: MessageType[this.type],
			functionType: FunctionType[this.functionType]
				|| num2hex(this.functionType),
		};
		if (this.expectedResponse != null) {
			ret.expectedResponse = FunctionType[this.functionType];
		}
		ret.payload = this.payload.toString("hex");
		return ret;
	}

	private testMessage(
		msg: Message,
		predicate: Message["expectedResponse"],
	): boolean {
		if (predicate == undefined) return false;
		if (typeof predicate === "number") {
			return msg.functionType === predicate;
		}
		if (staticExtends(predicate, Message)) {
			// predicate is a Message constructor
			return msg instanceof predicate;
		} else {
			// predicate is a ResponsePredicate
			return predicate(this, msg);
		}
	}

	/** Tests whether this message expects an ACK from the controller */
	public expectsAck(): boolean {
		// By default, all commands expect an ACK
		return true;
	}

	/** Tests whether this message expects a response from the controller */
	public expectsResponse(): boolean {
		return !!this.expectedResponse;
	}

	/** Tests whether this message expects a callback from the controller */
	public expectsCallback(): boolean {
		// A message expects a callback...
		return (
			// ...when it has a callback id that is not 0 (no callback)
			((this.hasCallbackId() && this.callbackId !== 0)
				// or the message type does not need a callback id to match the response
				|| !this.needsCallbackId())
			// and the expected callback is defined
			&& !!this.expectedCallback
		);
	}

	/** Tests whether this message expects an update from the target node to finalize the transaction */
	public expectsNodeUpdate(): boolean {
		// Most messages don't expect an update by default
		return false;
	}

	/** Returns a message specific timeout used to wait for an update from the target node */
	public nodeUpdateTimeout: number | undefined; // Default: use driver timeout

	/** Checks if a message is an expected response for this message */
	public isExpectedResponse(msg: Message): boolean {
		return (
			msg.type === MessageType.Response
			&& this.testMessage(msg, this.expectedResponse)
		);
	}

	/** Checks if a message is an expected callback for this message */
	public isExpectedCallback(msg: Message): boolean {
		if (msg.type !== MessageType.Request) return false;

		// Some controllers have a bug causing them to send a callback with a function type of 0 and no callback ID
		// To prevent this from triggering the unresponsive controller detection we need to forward these messages as if they were correct
		if (msg.functionType !== 0 as any) {
			// If a received request included a callback id, enforce that the response contains the same
			if (this.callbackId !== msg.callbackId) {
				return false;
			}
		}

		return this.testMessage(msg, this.expectedCallback);
	}

	/** Checks if a message is an expected node update for this message */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public isExpectedNodeUpdate(msg: Message): boolean {
		// Most messages don't expect an update by default
		return false;
	}

	/** Gets set by the driver to remember an expected node update for this message that arrived before the Serial API command has finished. */
	public prematureNodeUpdate: Message | undefined;

	/** Finds the ID of the target or source node in a message, if it contains that information */
	public getNodeId(): number | undefined {
		if (hasNodeId(this)) return this.nodeId;
		// Override this in subclasses if a different behavior is desired
	}

	/**
	 * Returns the node this message is linked to or undefined
	 */
	public tryGetNode<T extends NodeId>(
		ctx: GetNode<T>,
	): T | undefined {
		const nodeId = this.getNodeId();
		if (nodeId != undefined) return ctx.getNode(nodeId);
	}

	private _transmissionTimestamp: number | undefined;
	/** The timestamp when this message was (last) transmitted (in nanoseconds) */
	public get transmissionTimestamp(): number | undefined {
		return this._transmissionTimestamp;
	}

	/** Marks this message as sent and sets the transmission timestamp */
	public markAsSent(): void {
		this._transmissionTimestamp = highResTimestamp();
		this._completedTimestamp = undefined;
	}

	private _completedTimestamp: number | undefined;
	public get completedTimestamp(): number | undefined {
		return this._completedTimestamp;
	}

	/** Marks this message as completed and sets the corresponding timestamp */
	public markAsCompleted(): void {
		this._completedTimestamp = highResTimestamp();
	}

	/** Returns the round trip time of this message from transmission until completion. */
	public get rtt(): number | undefined {
		if (this._transmissionTimestamp == undefined) return undefined;
		if (this._completedTimestamp == undefined) return undefined;
		return this._completedTimestamp - this._transmissionTimestamp;
	}
}

/** Computes the checksum for a serialized message as defined in the Z-Wave specs */
function computeChecksum(message: Uint8Array): number {
	let ret = 0xff;
	// exclude SOF and checksum byte from the computation
	for (let i = 1; i < message.length - 1; i++) {
		ret ^= message[i];
	}
	return ret;
}

// =======================
// use decorators to link function types to message classes

export type ResponseRole =
	| "unexpected" // a message that does not belong to this transaction
	| "confirmation" // a confirmation response, e.g. controller reporting that a message was sent
	| "final" // a final response (leading to a resolved transaction)
	| "fatal_controller" // a response from the controller that leads to a rejected transaction
	| "fatal_node"; // a response or (lack thereof) from the node that leads to a rejected transaction/**

/**
 * A predicate function to test if a received message matches to the sent message
 */
export type ResponsePredicate<TSent extends Message = Message> = (
	sentMessage: TSent,
	receivedMessage: Message,
) => boolean;

function getMessageTypeMapKey(
	messageType: MessageType,
	functionType: FunctionType,
): string {
	return JSON.stringify({ messageType, functionType });
}

const messageTypesDecorator = createReflectionDecorator<
	typeof Message,
	[messageType: MessageType, functionType: FunctionType],
	{ messageType: MessageType; functionType: FunctionType },
	MessageConstructor<Message>
>({
	name: "messageTypes",
	valueFromArgs: (messageType, functionType) => ({
		messageType,
		functionType,
	}),
	constructorLookupKey(target, messageType, functionType) {
		return getMessageTypeMapKey(messageType, functionType);
	},
});

/**
 * Defines the message and function type associated with a Z-Wave message
 */
export const messageTypes = messageTypesDecorator.decorator;

/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export function getMessageType<T extends Message>(
	messageClass: T,
): MessageType | undefined {
	return messageTypesDecorator.lookupValue(messageClass)?.messageType;
}

/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export function getMessageTypeStatic<T extends MessageConstructor<Message>>(
	classConstructor: T,
): MessageType | undefined {
	return messageTypesDecorator.lookupValueStatic(classConstructor)
		?.messageType;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getFunctionType<T extends Message>(
	messageClass: T,
): FunctionType | undefined {
	return messageTypesDecorator.lookupValue(messageClass)?.functionType;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getFunctionTypeStatic<T extends MessageConstructor<Message>>(
	classConstructor: T,
): FunctionType | undefined {
	return messageTypesDecorator.lookupValueStatic(classConstructor)
		?.functionType;
}

/**
 * Looks up the message constructor for a given message type and function type
 */
function getMessageConstructor(
	messageType: MessageType,
	functionType: FunctionType,
): MessageConstructor<Message> | undefined {
	return messageTypesDecorator.lookupConstructorByKey(
		getMessageTypeMapKey(messageType, functionType),
	);
}

const expectedResponseDecorator = createReflectionDecorator<
	typeof Message,
	[typeOrPredicate: FunctionType | typeof Message | ResponsePredicate],
	FunctionType | typeof Message | ResponsePredicate,
	MessageConstructor<Message>
>({
	name: "expectedResponse",
	valueFromArgs: (typeOrPredicate) => typeOrPredicate,
	constructorLookupKey: false,
});

/**
 * Defines the expected response function type or message class for a Z-Wave message
 */
export const expectedResponse = expectedResponseDecorator.decorator;

/**
 * Retrieves the expected response function type or message class defined for a Z-Wave message class
 */
export function getExpectedResponse<T extends Message>(
	messageClass: T,
): FunctionType | typeof Message | ResponsePredicate | undefined {
	return expectedResponseDecorator.lookupValue(messageClass);
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getExpectedResponseStatic<
	T extends MessageConstructor<Message>,
>(
	classConstructor: T,
): FunctionType | typeof Message | ResponsePredicate | undefined {
	return expectedResponseDecorator.lookupValueStatic(classConstructor);
}

const expectedCallbackDecorator = createReflectionDecorator<
	typeof Message,
	[typeOrPredicate: FunctionType | typeof Message | ResponsePredicate],
	FunctionType | typeof Message | ResponsePredicate,
	MessageConstructor<Message>
>({
	name: "expectedCallback",
	valueFromArgs: (typeOrPredicate) => typeOrPredicate,
	constructorLookupKey: false,
});

/**
 * Defines the expected callback function type or message class for a Z-Wave message
 */
export function expectedCallback<TSent extends typeof Message>(
	typeOrPredicate:
		| FunctionType
		| typeof Message
		| ResponsePredicate<InstanceType<TSent>>,
): TypedClassDecorator<TSent> {
	return expectedCallbackDecorator.decorator(typeOrPredicate as any);
}

/**
 * Retrieves the expected callback function type or message class defined for a Z-Wave message class
 */
export function getExpectedCallback<T extends Message>(
	messageClass: T,
): FunctionType | typeof Message | ResponsePredicate | undefined {
	return expectedCallbackDecorator.lookupValue(messageClass);
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getExpectedCallbackStatic<
	T extends MessageConstructor<Message>,
>(
	classConstructor: T,
): FunctionType | typeof Message | ResponsePredicate | undefined {
	return expectedCallbackDecorator.lookupValueStatic(classConstructor);
}

const priorityDecorator = createReflectionDecorator<
	typeof Message,
	[prio: MessagePriority],
	MessagePriority
>({
	name: "priority",
	valueFromArgs: (priority) => priority,
	constructorLookupKey: false,
});

/**
 * Defines the default priority associated with a Z-Wave message
 */
export const priority = priorityDecorator.decorator;

/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
export function getDefaultPriority<T extends Message>(
	messageClass: T,
): MessagePriority | undefined {
	return priorityDecorator.lookupValue(messageClass);
}

/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
export function getDefaultPriorityStatic<T extends MessageConstructor<Message>>(
	classConstructor: T,
): MessagePriority | undefined {
	return priorityDecorator.lookupValueStatic(classConstructor);
}
