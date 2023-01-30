import {
	createReflectionDecorator,
	getNodeTag,
	highResTimestamp,
	IZWaveNode,
	MessageOrCCLogEntry,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import type { JSONObject, TypedClassDecorator } from "@zwave-js/shared/safe";
import { num2hex, staticExtends } from "@zwave-js/shared/safe";
import { MessageHeaders } from "../MessageHeaders";
import { FunctionType, MessageType } from "./Constants";
import { isNodeQuery } from "./INodeQuery";

export type MessageConstructor<T extends Message> = new (
	host: ZWaveHost,
	options?: MessageOptions,
) => T;

export type DeserializingMessageConstructor<T extends Message> = new (
	host: ZWaveHost,
	options: MessageDeserializationOptions,
) => T;

/** Where a serialized message originates from, to distinguish how certain messages need to be deserialized */
export enum MessageOrigin {
	Controller,
	Host,
}

export interface MessageDeserializationOptions {
	data: Buffer;
	origin?: MessageOrigin;
	/** Whether CCs should be parsed immediately (only affects messages that contain CCs). Default: `true` */
	parseCCs?: boolean;
}

/**
 * Tests whether the given message constructor options contain a buffer for deserialization
 */
export function gotDeserializationOptions(
	options: Record<any, any> | undefined,
): options is MessageDeserializationOptions {
	return options != undefined && Buffer.isBuffer(options.data);
}

export interface MessageBaseOptions {
	callbackId?: number;
}

export interface MessageCreationOptions extends MessageBaseOptions {
	type?: MessageType;
	functionType?: FunctionType;
	expectedResponse?: FunctionType | typeof Message | ResponsePredicate;
	expectedCallback?: FunctionType | typeof Message | ResponsePredicate;
	payload?: Buffer;
}

export type MessageOptions =
	| MessageCreationOptions
	| MessageDeserializationOptions;

/**
 * Represents a Z-Wave message for communication with the serial interface
 */
export class Message {
	public constructor(
		protected host: ZWaveHost,
		options: MessageOptions = {},
	) {
		// decide which implementation we follow
		if (gotDeserializationOptions(options)) {
			// #1: deserialize from payload
			const payload = options.data;

			// SOF, length, type, commandId and checksum must be present
			if (!payload.length || payload.length < 5) {
				throw new ZWaveError(
					"Could not deserialize the message because it was truncated",
					ZWaveErrorCodes.PacketFormat_Truncated,
				);
			}
			// the packet has to start with SOF
			if (payload[0] !== MessageHeaders.SOF) {
				throw new ZWaveError(
					"Could not deserialize the message because it does not start with SOF",
					ZWaveErrorCodes.PacketFormat_Invalid,
				);
			}
			// check the length again, this time with the transmitted length
			const messageLength = Message.getMessageLength(payload);
			if (payload.length < messageLength) {
				throw new ZWaveError(
					"Could not deserialize the message because it was truncated",
					ZWaveErrorCodes.PacketFormat_Truncated,
				);
			}
			// check the checksum
			const expectedChecksum = computeChecksum(
				payload.slice(0, messageLength),
			);
			if (payload[messageLength - 1] !== expectedChecksum) {
				throw new ZWaveError(
					"Could not deserialize the message because the checksum didn't match",
					ZWaveErrorCodes.PacketFormat_Checksum,
				);
			}

			this.type = payload[2];
			this.functionType = payload[3];
			const payloadLength = messageLength - 5;
			this.payload = payload.slice(4, 4 + payloadLength);
		} else {
			// Try to determine the message type
			if (options.type == undefined) options.type = getMessageType(this);
			if (options.type == undefined) {
				throw new ZWaveError(
					"A message must have a given or predefined message type",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.type = options.type;

			if (options.functionType == undefined)
				options.functionType = getFunctionType(this);
			if (options.functionType == undefined) {
				throw new ZWaveError(
					"A message must have a given or predefined function type",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.functionType = options.functionType;

			// Fall back to decorated response/callback types if none is given
			this.expectedResponse =
				options.expectedResponse ?? getExpectedResponse(this);
			this.expectedCallback =
				options.expectedCallback ?? getExpectedCallback(this);

			this._callbackId = options.callbackId;

			this.payload = options.payload || Buffer.allocUnsafe(0);
		}
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
	public payload: Buffer; // TODO: Length limit 255

	private _callbackId: number | undefined;
	/**
	 * Used to map requests to responses.
	 *
	 * WARNING: Accessing this property will generate a new callback ID if this message had none.
	 * If you want to compare the callback ID, use `hasCallbackId()` beforehand to check if the callback ID is already defined.
	 */
	public get callbackId(): number {
		if (this._callbackId == undefined) {
			this._callbackId = this.host.getNextCallbackId();
		}
		return this._callbackId;
	}
	public set callbackId(v: number | undefined) {
		this._callbackId = v;
	}

	/**
	 * Tests whether this message's callback ID is defined
	 */
	public hasCallbackId(): boolean {
		return this._callbackId != undefined;
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

	/** Serializes this message into a Buffer */
	public serialize(): Buffer {
		const ret = Buffer.allocUnsafe(this.payload.length + 5);
		ret[0] = MessageHeaders.SOF;
		// length of the following data, including the checksum
		ret[1] = this.payload.length + 3;
		// write the remaining data
		ret[2] = this.type;
		ret[3] = this.functionType;
		this.payload.copy(ret, 4);
		// followed by the checksum
		ret[ret.length - 1] = computeChecksum(ret);
		return ret;
	}

	/** Returns the number of bytes the first message in the buffer occupies */
	public static getMessageLength(data: Buffer): number {
		const remainingLength = data[1];
		return remainingLength + 2;
	}

	/**
	 * Checks if there's enough data in the buffer to deserialize
	 */
	public static isComplete(data?: Buffer): boolean {
		if (!data || !data.length || data.length < 5) return false; // not yet

		const messageLength = Message.getMessageLength(data);
		if (data.length < messageLength) return false; // not yet

		return true; // probably, but the checksum may be wrong
	}

	/**
	 * Retrieves the correct constructor for the next message in the given Buffer.
	 * It is assumed that the buffer has been checked beforehand
	 */
	public static getConstructor(data: Buffer): MessageConstructor<Message> {
		return getMessageConstructor(data[2], data[3]) || Message;
	}

	/** Creates an instance of the message that is serialized in the given buffer */
	public static from(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	): Message {
		const Constructor = Message.getConstructor(options.data);
		const ret = new Constructor(host, options);
		return ret;
	}

	/** Returns the slice of data which represents the message payload */
	public static extractPayload(data: Buffer): Buffer {
		const messageLength = Message.getMessageLength(data);
		const payloadLength = messageLength - 5;
		return data.slice(4, 4 + payloadLength);
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
			message:
				this.payload.length > 0
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
			functionType:
				FunctionType[this.functionType] || num2hex(this.functionType),
		};
		if (this.expectedResponse != null)
			ret.expectedResponse = FunctionType[this.functionType];
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

	/** Tests whether this message expects a response from the controller */
	public expectsResponse(): boolean {
		return !!this.expectedResponse;
	}

	/** Tests whether this message expects a callback from the controller */
	public expectsCallback(): boolean {
		// A message expects a callback...
		return (
			// ...when it has a callback id that is not 0 (no callback)
			((this.hasCallbackId() && this.callbackId !== 0) ||
				// or the message type does not need a callback id to match the response
				!this.needsCallbackId()) &&
			// and the expected callback is defined
			!!this.expectedCallback
		);
	}

	/** Tests whether this message expects an update from the target node to finalize the transaction */
	public expectsNodeUpdate(): boolean {
		// Most messages don't expect an update by default
		return false;
	}

	/** Checks if a message is an expected response for this message */
	public isExpectedResponse(msg: Message): boolean {
		return (
			msg.type === MessageType.Response &&
			this.testMessage(msg, this.expectedResponse)
		);
	}

	/** Checks if a message is an expected callback for this message */
	public isExpectedCallback(msg: Message): boolean {
		if (msg.type !== MessageType.Request) return false;
		// If a received request included a callback id, enforce that the response contains the same
		if (
			this.hasCallbackId() &&
			(!msg.hasCallbackId() || this._callbackId !== msg._callbackId)
		) {
			return false;
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
		if (isNodeQuery(this)) return this.nodeId;
		// Override this in subclasses if a different behavior is desired
	}

	/**
	 * Returns the node this message is linked to or undefined
	 */
	public getNodeUnsafe(
		applHost: ZWaveApplicationHost,
	): IZWaveNode | undefined {
		const nodeId = this.getNodeId();
		if (nodeId != undefined) return applHost.nodes.get(nodeId);
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
function computeChecksum(message: Buffer): number {
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
	Message,
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
	Message,
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
	Message,
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
export function expectedCallback<TSent extends Message>(
	typeOrPredicate: FunctionType | typeof Message | ResponsePredicate<TSent>,
): TypedClassDecorator<Message> {
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
	Message,
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
