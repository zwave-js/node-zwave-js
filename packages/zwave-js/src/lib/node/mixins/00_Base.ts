import { type NodeId } from "@zwave-js/core/safe";
import { Endpoint } from "../Endpoint.js";

export abstract class ZWaveNodeBase extends Endpoint implements NodeId {
	/**
	 * Whether the node should be kept awake when there are no pending messages.
	 */
	public keepAwake: boolean = false;

	/** The ID of this node */
	public get id(): number {
		return this.nodeId;
	}
}
