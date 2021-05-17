import {
	isZWaveError,
	ValueID,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { CCAPI } from "../commandclass/API";
import type { Driver } from "../driver/Driver";
import type { ZWaveNode } from "./Node";
import { VirtualEndpoint } from "./VirtualEndpoint";

export class VirtualNode extends VirtualEndpoint {
	public constructor(
		public readonly id: number | undefined,
		driver: Driver,
		/** The references to the physical node this virtual node abstracts */
		physicalNodes: Iterable<ZWaveNode>,
	) {
		// Define this node's intrinsic endpoint as the root device (0)
		super(undefined, driver, 0);
		// Set the reference to this and the physical nodes
		super.setNode(this);
		this.physicalNodes = [...physicalNodes].filter(
			// And avoid including the controller node in the support checks
			(n) => n.id !== driver.controller.ownNodeId,
		);
	}

	public readonly physicalNodes: ZWaveNode[];

	/**
	 * Updates a value for a given property of a given CommandClass.
	 * This will communicate with the physical node(s) this virtual node represents!
	 */
	public async setValue(valueId: ValueID, value: unknown): Promise<boolean> {
		// Try to retrieve the corresponding CC API
		try {
			// Access the CC API by name
			const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
			if (!endpointInstance) return false;
			const api = (endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI;
			// Check if the setValue method is implemented
			if (!api.setValue) return false;
			// And call it
			await api.setValue(
				{
					property: valueId.property,
					propertyKey: valueId.propertyKey,
				},
				value,
			);
			if (api.isSetValueOptimistic(valueId)) {
				// If the call did not throw, assume that the call was successful and remember the new value
				// for each node that was affected by this command
				const affectedNodes = endpointInstance.node.physicalNodes.filter(
					(node) =>
						node
							.getEndpoint(endpointInstance.index)
							?.supportsCC(valueId.commandClass),
				);
				for (const node of affectedNodes) {
					node.valueDB.setValue(valueId, value);
				}
			}

			return true;
		} catch (e: unknown) {
			// Define which errors during setValue are expected and won't crash
			// the driver:
			if (isZWaveError(e)) {
				let handled = false;
				let emitErrorEvent = false;
				switch (e.code) {
					// This CC or API is not implemented
					case ZWaveErrorCodes.CC_NotImplemented:
					case ZWaveErrorCodes.CC_NoAPI:
						handled = true;
						break;
					// A user tried to set an invalid value
					case ZWaveErrorCodes.Argument_Invalid:
						handled = true;
						emitErrorEvent = true;
						break;
				}
				if (emitErrorEvent) this.driver.emit("error", e);
				if (handled) return false;
			}
			throw e;
		}
	}

	/** Cache for this node's endpoint instances */
	private _endpointInstances = new Map<number, VirtualEndpoint>();
	/**
	 * Returns an endpoint of this node with the given index. 0 returns the node itself.
	 */
	public getEndpoint(index: 0): VirtualEndpoint;
	public getEndpoint(index: number): VirtualEndpoint | undefined;
	public getEndpoint(index: number): VirtualEndpoint | undefined {
		if (index < 0)
			throw new ZWaveError(
				"The endpoint index must be positive!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		// Zero is the root endpoint - i.e. this node
		if (index === 0) return this;
		// Check if the Multi Channel CC interviews for all nodes are completed,
		// because we don't have all the information before that
		if (!this.isMultiChannelInterviewComplete) {
			this.driver.driverLog.print(
				`Virtual node ${
					this.id ?? "??"
				}, Endpoint ${index}: Trying to access endpoint instance before the Multi Channel interview of all nodes was completed!`,
				"error",
			);
			return undefined;
		}

		// Check if the requested endpoint exists on any physical node
		if (index > this.getEndpointCount()) return undefined;
		// Create an endpoint instance if it does not exist
		if (!this._endpointInstances.has(index)) {
			this._endpointInstances.set(
				index,
				new VirtualEndpoint(this, this.driver, index),
			);
		}
		return this._endpointInstances.get(index)!;
	}

	/** Returns the current endpoint count of this virtual node (the maximum in the list of physical nodes) */
	public getEndpointCount(): number {
		let ret = 0;
		for (const node of this.physicalNodes) {
			const count = node.getEndpointCount();
			ret = Math.max(ret, count);
		}
		return ret;
	}

	private get isMultiChannelInterviewComplete(): boolean {
		for (const node of this.physicalNodes) {
			// wotan-disable-next-line no-restricted-property-access
			if (!node["isMultiChannelInterviewComplete"]) return false;
		}
		return true;
	}
}
