import { MultiChannelCCValues } from "@zwave-js/cc";
import {
	type CommandClasses,
	type GetAllEndpoints,
	type GetEndpoint,
	type MaybeNotKnown,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { DeviceClass } from "../DeviceClass.js";
import { Endpoint } from "../Endpoint.js";
import * as nodeUtils from "../utils.js";
import { NodeValuesMixin } from "./40_Values.js";

/** Defines functionality of Z-Wave nodes related to accessing endpoints and their capabilities */
export interface Endpoints {
	/** Whether the endpoint count is dynamic */
	readonly endpointCountIsDynamic: MaybeNotKnown<boolean>;
	/** Whether all endpoints have identical capabilities */
	readonly endpointsHaveIdenticalCapabilities: MaybeNotKnown<boolean>;
	/** The number of individual endpoints */
	readonly individualEndpointCount: MaybeNotKnown<number>;
	/** The number of aggregated endpoints */
	readonly aggregatedEndpointCount: MaybeNotKnown<number>;
	/** Returns the current endpoint count of this node.
	 *
	 * If you want to enumerate the existing endpoints, use `getEndpointIndizes` instead.
	 * Some devices are known to contradict themselves.
	 */
	getEndpointCount(): number;
	/** Returns indizes of all endpoints on the node. */
	getEndpointIndizes(): number[];
	/** Returns an endpoint of this node with the given index. 0 returns the node itself. */
	getEndpoint(index: 0): Endpoint;
	getEndpoint(index: number): Endpoint | undefined;
	/** Returns an endpoint of this node with the given index. Throws if the endpoint does not exist. */
	getEndpointOrThrow(index: number): Endpoint;
	/** Returns a list of all endpoints of this node, including the root endpoint (index 0) */
	getAllEndpoints(): Endpoint[];
}

export abstract class EndpointsMixin extends NodeValuesMixin
	implements Endpoints, GetEndpoint<Endpoint>, GetAllEndpoints<Endpoint>
{
	public get endpointCountIsDynamic(): MaybeNotKnown<boolean> {
		return nodeUtils.endpointCountIsDynamic(this.driver, this.id);
	}

	public get endpointsHaveIdenticalCapabilities(): MaybeNotKnown<boolean> {
		return nodeUtils.endpointsHaveIdenticalCapabilities(
			this.driver,
			this.id,
		);
	}

	public get individualEndpointCount(): MaybeNotKnown<number> {
		return nodeUtils.getIndividualEndpointCount(this.driver, this.id);
	}

	public get aggregatedEndpointCount(): MaybeNotKnown<number> {
		return nodeUtils.getAggregatedEndpointCount(this.driver, this.id);
	}

	/** Returns the device class of an endpoint. Falls back to the node's device class if the information is not known. */
	private getEndpointDeviceClass(index: number): MaybeNotKnown<DeviceClass> {
		const deviceClass = this.getValue<{
			generic: number;
			specific: number;
		}>(
			MultiChannelCCValues.endpointDeviceClass.endpoint(
				this.endpointsHaveIdenticalCapabilities ? 1 : index,
			),
		);
		if (deviceClass && this.deviceClass) {
			return new DeviceClass(
				this.deviceClass.basic,
				deviceClass.generic,
				deviceClass.specific,
			);
		}
		// fall back to the node's device class if it is known
		return this.deviceClass;
	}

	private getEndpointCCs(index: number): MaybeNotKnown<CommandClasses[]> {
		const ret = this.getValue(
			MultiChannelCCValues.endpointCCs.endpoint(
				this.endpointsHaveIdenticalCapabilities ? 1 : index,
			),
		);
		// Workaround for the change in #1977
		if (isArray(ret)) {
			// The value is set up correctly, return it
			return ret as CommandClasses[];
		} else if (isObject(ret) && "supportedCCs" in ret) {
			return ret.supportedCCs as CommandClasses[];
		}
	}

	/**
	 * Returns the current endpoint count of this node.
	 *
	 * If you want to enumerate the existing endpoints, use `getEndpointIndizes` instead.
	 * Some devices are known to contradict themselves.
	 */
	public getEndpointCount(): number {
		return nodeUtils.getEndpointCount(this.driver, this.id);
	}

	/**
	 * Returns indizes of all endpoints on the node.
	 */
	public getEndpointIndizes(): number[] {
		return nodeUtils.getEndpointIndizes(this.driver, this.id);
	}

	/** Whether the Multi Channel CC has been interviewed and all endpoint information is known */
	private get isMultiChannelInterviewComplete(): boolean {
		return nodeUtils.isMultiChannelInterviewComplete(this.driver, this.id);
	}

	/** Cache for this node's endpoint instances */
	protected _endpointInstances = new Map<number, Endpoint>();
	/**
	 * Returns an endpoint of this node with the given index. 0 returns the node itself.
	 */
	public getEndpoint(index: 0): Endpoint;
	public getEndpoint(index: number): Endpoint | undefined;
	public getEndpoint(index: number): Endpoint | undefined {
		if (index < 0) {
			throw new ZWaveError(
				"The endpoint index must be positive!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		// Zero is the root endpoint - i.e. this node
		if (index === 0) return this;
		// Check if the Multi Channel CC interview for this node is completed,
		// because we don't have all the information before that
		if (!this.isMultiChannelInterviewComplete) {
			this.driver.driverLog.print(
				`Node ${this.id}, Endpoint ${index}: Trying to access endpoint instance before Multi Channel interview`,
				"error",
			);
			return undefined;
		}
		// Check if the endpoint index is in the list of known endpoint indizes
		if (!this.getEndpointIndizes().includes(index)) return undefined;

		// Create an endpoint instance if it does not exist
		if (!this._endpointInstances.has(index)) {
			this._endpointInstances.set(
				index,
				new Endpoint(
					this.id,
					this.driver,
					index,
					this.getEndpointDeviceClass(index),
					this.getEndpointCCs(index),
				),
			);
		}
		return this._endpointInstances.get(index)!;
	}

	public getEndpointOrThrow(index: number): Endpoint {
		const ret = this.getEndpoint(index);
		if (!ret) {
			throw new ZWaveError(
				`Endpoint ${index} does not exist on Node ${this.id}`,
				ZWaveErrorCodes.Controller_EndpointNotFound,
			);
		}
		return ret;
	}

	/** Returns a list of all endpoints of this node, including the root endpoint (index 0) */
	public getAllEndpoints(): Endpoint[] {
		return nodeUtils.getAllEndpoints(this.driver, this);
	}
}
