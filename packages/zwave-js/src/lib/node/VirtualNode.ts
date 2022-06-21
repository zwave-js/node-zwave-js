import { BasicCCValues, CCAPI, SetValueAPIOptions } from "@zwave-js/cc";
import {
	actuatorCCs,
	isZWaveError,
	IVirtualNode,
	TranslatedValueID,
	ValueID,
	valueIdToString,
	ValueMetadata,
	ValueMetadataNumeric,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { distinct } from "alcalzone-shared/arrays";
import type { Driver } from "../driver/Driver";
import type { ZWaveNode } from "./Node";
import { VirtualEndpoint } from "./VirtualEndpoint";

export interface VirtualValueID extends TranslatedValueID {
	/** The metadata that belongs to this virtual value ID */
	metadata: ValueMetadata;
	/** The maximum supported CC version among all nodes targeted by this virtual value ID */
	ccVersion: number;
}

export class VirtualNode extends VirtualEndpoint implements IVirtualNode {
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
	public async setValue(
		valueId: ValueID,
		value: unknown,
		options?: SetValueAPIOptions,
	): Promise<boolean> {
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
				options,
			);
			if (api.isSetValueOptimistic(valueId)) {
				// If the call did not throw, assume that the call was successful and remember the new value
				// for each node that was affected by this command
				const affectedNodes =
					endpointInstance.node.physicalNodes.filter((node) =>
						node
							.getEndpoint(endpointInstance.index)
							?.supportsCC(valueId.commandClass),
					);
				for (const node of affectedNodes) {
					node.valueDB.setValue(valueId, value);
				}
			}

			return true;
		} catch (e) {
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

	/**
	 * Returns a list of all value IDs and their metadata that can be used to
	 * control the physical node(s) this virtual node represents.
	 */
	public getDefinedValueIDs(): VirtualValueID[] {
		// If all nodes are secure, we can't use broadcast/multicast commands
		if (this.physicalNodes.every((n) => n.isSecure === true)) return [];

		// In order to compare value ids, we need them to be strings
		const ret = new Map<string, VirtualValueID>();

		for (const pNode of this.physicalNodes) {
			// Secure nodes cannot be used for broadcast
			if (pNode.isSecure === true) continue;

			// Take only the actuator values
			const valueIDs: TranslatedValueID[] = pNode
				.getDefinedValueIDs()
				.filter((v) => actuatorCCs.includes(v.commandClass));
			// And add them to the returned array if they aren't included yet or if the version is higher

			for (const valueId of valueIDs) {
				const mapKey = valueIdToString(valueId);
				const ccVersion = pNode.getCCVersion(valueId.commandClass);
				const metadata = pNode.getValueMetadata(valueId);
				// Don't expose read-only values for virtual nodes, they won't ever have any value
				if (!metadata.writeable) continue;

				const needsUpdate =
					!ret.has(mapKey) || ret.get(mapKey)!.ccVersion < ccVersion;
				if (needsUpdate) {
					ret.set(mapKey, {
						...valueId,
						ccVersion,
						metadata: {
							...metadata,
							// Metadata of virtual nodes is only writable
							readable: false,
						},
					});
				}
			}
		}

		// Basic CC is not exposed, but virtual nodes need it to control multiple different devices together
		const exposedEndpoints = distinct(
			[...ret.values()]
				.map((v) => v.endpoint)
				.filter((e): e is number => e !== undefined),
		);
		for (const endpoint of exposedEndpoints) {
			// TODO: This should be defined in the Basic CC file
			const valueId: TranslatedValueID = {
				...BasicCCValues.targetValue.endpoint(endpoint),
				commandClassName: "Basic",
				propertyName: "Target value",
			};
			const ccVersion = 1;
			const metadata: ValueMetadataNumeric = {
				...BasicCCValues.targetValue.meta,
				readable: false,
			};
			ret.set(valueIdToString(valueId), {
				...valueId,
				ccVersion,
				metadata,
			});
		}

		return [...ret.values()];
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

	public getEndpointOrThrow(index: number): VirtualEndpoint {
		const ret = this.getEndpoint(index);
		if (!ret) {
			throw new ZWaveError(
				`Endpoint ${index} does not exist on virtual node ${
					this.id ?? "??"
				}`,
				ZWaveErrorCodes.Controller_EndpointNotFound,
			);
		}
		return ret;
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
			if (!node["isMultiChannelInterviewComplete"]) return false;
		}
		return true;
	}
}
