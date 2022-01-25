import { NUM_NODEMASK_BYTES } from "@zwave-js/core";
import type { JSONObject } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";
import { parseNodeBitMask } from "./NodeBitMask";

enum InitCapabilityFlags {
	Slave = 1 << 0, // Controller is a slave
	SupportsTimers = 1 << 1, // The controller supports timers
	Secondary = 1 << 2, // The controller is a secondary
	SUC = 1 << 3, // The controller is a SUC
}

@messageTypes(MessageType.Request, FunctionType.GetSerialApiInitData)
@expectedResponse(FunctionType.GetSerialApiInitData)
@priority(MessagePriority.Controller)
export class GetSerialApiInitDataRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiInitData)
export class GetSerialApiInitDataResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		this._initVersion = this.payload[0];
		this._initCaps = this.payload[1];
		this._nodeIds = [];
		if (this.payload.length > 2 && this.payload[2] === NUM_NODEMASK_BYTES) {
			// the payload contains a bit mask of all existing nodes
			const nodeBitMask = this.payload.slice(3, 3 + NUM_NODEMASK_BYTES);
			this._nodeIds = parseNodeBitMask(nodeBitMask);
		}
	}

	private _initVersion: number;
	public get initVersion(): number {
		return this._initVersion;
	}

	private _initCaps: number;
	public get isSlave(): boolean {
		return !!(this._initCaps & InitCapabilityFlags.Slave);
	}
	public get supportsTimers(): boolean {
		return !!(this._initCaps & InitCapabilityFlags.SupportsTimers);
	}
	public get isSecondary(): boolean {
		return !!(this._initCaps & InitCapabilityFlags.Secondary);
	}
	public get isStaticUpdateController(): boolean {
		return !!(this._initCaps & InitCapabilityFlags.SUC);
	}

	private _nodeIds: number[];
	public get nodeIds(): number[] {
		return this._nodeIds;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			initVersion: this.initVersion,
			isSlave: this.isSlave,
			supportsTimers: this.supportsTimers,
			isSecondary: this.isSecondary,
			isStaticUpdateController: this.isStaticUpdateController,
			nodeIds: this.nodeIds,
		});
	}
}
