import { Endpoint } from "../Endpoint";

export abstract class ZWaveNodeBase extends Endpoint {
	/**
	 * Whether the node should be kept awake when there are no pending messages.
	 */
	public keepAwake: boolean = false;

	/** The ID of this node */
	public get id(): number {
		return this.nodeId;
	}
}
