import {
	type DataRate,
	type FLiRS,
	type MaybeNotKnown,
	NOT_KNOWN,
	type NodeType,
	type ProtocolVersion,
	Protocols,
	isLongRangeNodeId,
} from "@zwave-js/core";
import { cacheKeys } from "../../driver/NetworkCache.js";
import { ZWaveNodeBase } from "./00_Base.js";

export interface NodeNetworkRole {
	/** Whether this node is always listening or not */
	readonly isListening: MaybeNotKnown<boolean>;

	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	readonly isFrequentListening: MaybeNotKnown<FLiRS>;

	/** Whether this node can sleep */
	readonly canSleep: MaybeNotKnown<boolean>;

	/** Whether the node supports routing/forwarding messages. */
	readonly isRouting: MaybeNotKnown<boolean>;

	/** All supported data rates of this node */
	readonly supportedDataRates: MaybeNotKnown<readonly DataRate[]>;

	/** The maximum data rate supported by this node */
	readonly maxDataRate: MaybeNotKnown<DataRate>;

	/** The Z-Wave protocol version this node implements */
	readonly protocolVersion: MaybeNotKnown<ProtocolVersion>;

	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	readonly nodeType: MaybeNotKnown<NodeType>;

	/**
	 * Whether this node supports security (S0 or S2).
	 * **WARNING:** Nodes often report this incorrectly - do not blindly trust it.
	 */
	readonly supportsSecurity: MaybeNotKnown<boolean>;

	/** Whether this node can issue wakeup beams to FLiRS nodes */
	readonly supportsBeaming: MaybeNotKnown<boolean>;

	/** Which protocol is used to communicate with this node */
	readonly protocol: Protocols;

	/** Returns whether this node is the controller */
	readonly isControllerNode: boolean;
}

export abstract class NetworkRoleMixin extends ZWaveNodeBase
	implements NodeNetworkRole
{
	public get isListening(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).isListening);
	}
	protected set isListening(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).isListening, value);
	}

	public get isFrequentListening(): MaybeNotKnown<FLiRS> {
		return this.driver.cacheGet(
			cacheKeys.node(this.id).isFrequentListening,
		);
	}
	protected set isFrequentListening(value: MaybeNotKnown<FLiRS>) {
		this.driver.cacheSet(
			cacheKeys.node(this.id).isFrequentListening,
			value,
		);
	}

	public get canSleep(): MaybeNotKnown<boolean> {
		// The controller node can never sleep (apparently it can report otherwise though)
		if (this.isControllerNode) return false;
		if (this.isListening == NOT_KNOWN) return NOT_KNOWN;
		if (this.isFrequentListening == NOT_KNOWN) return NOT_KNOWN;
		return !this.isListening && !this.isFrequentListening;
	}

	public get isRouting(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).isRouting);
	}
	protected set isRouting(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).isRouting, value);
	}

	public get supportedDataRates(): MaybeNotKnown<readonly DataRate[]> {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportedDataRates);
	}
	protected set supportedDataRates(
		value: MaybeNotKnown<readonly DataRate[]>,
	) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportedDataRates, value);
	}

	public get maxDataRate(): MaybeNotKnown<DataRate> {
		if (this.supportedDataRates) {
			return Math.max(...this.supportedDataRates) as DataRate;
		}
	}

	public get protocolVersion(): MaybeNotKnown<ProtocolVersion> {
		return this.driver.cacheGet(cacheKeys.node(this.id).protocolVersion);
	}
	protected set protocolVersion(value: MaybeNotKnown<ProtocolVersion>) {
		this.driver.cacheSet(cacheKeys.node(this.id).protocolVersion, value);
	}

	public get nodeType(): MaybeNotKnown<NodeType> {
		return this.driver.cacheGet(cacheKeys.node(this.id).nodeType);
	}
	protected set nodeType(value: MaybeNotKnown<NodeType>) {
		this.driver.cacheSet(cacheKeys.node(this.id).nodeType, value);
	}

	public get supportsSecurity(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportsSecurity);
	}
	protected set supportsSecurity(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportsSecurity, value);
	}

	public get supportsBeaming(): MaybeNotKnown<boolean> {
		return this.driver.cacheGet(cacheKeys.node(this.id).supportsBeaming);
	}
	protected set supportsBeaming(value: MaybeNotKnown<boolean>) {
		this.driver.cacheSet(cacheKeys.node(this.id).supportsBeaming, value);
	}

	public get protocol(): Protocols {
		return isLongRangeNodeId(this.id)
			? Protocols.ZWaveLongRange
			: Protocols.ZWave;
	}

	public get isControllerNode(): boolean {
		return this.id === this.driver.controller.ownNodeId;
	}
}
