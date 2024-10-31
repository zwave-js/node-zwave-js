import {
	type CCValueOptions,
	CommandClass,
	defaultCCValueOptions,
	getCCValues,
} from "@zwave-js/cc";
import {
	type CommandClasses,
	type MaybeNotKnown,
	type MetadataUpdatedArgs,
	ValueDB,
	type ValueID,
	ValueMetadata,
	type ValueUpdatedArgs,
	applicationCCs,
	getCCName,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import { type Driver } from "../../driver/Driver.js";
import { type DeviceClass } from "../DeviceClass.js";
import { type ZWaveNodeValueEventCallbacks } from "../_Types.js";
import * as nodeUtils from "../utils.js";
import { NodeWakeupMixin } from "./30_Wakeup.js";

/** Defines functionality of Z-Wave nodes related to the value DB */
export interface NodeValues {
	/**
	 * Provides access to this node's values
	 * @internal
	 */
	readonly valueDB: ValueDB;

	/**
	 * Retrieves a stored value for a given value id.
	 * This does not request an updated value from the node!
	 */
	getValue<T = unknown>(valueId: ValueID): MaybeNotKnown<T>;

	/**
	 * Returns when the given value id was last updated by an update from the node.
	 */
	getValueTimestamp(valueId: ValueID): MaybeNotKnown<number>;

	/**
	 * Retrieves metadata for a given value id.
	 * This can be used to enhance the user interface of an application
	 */
	getValueMetadata(valueId: ValueID): ValueMetadata;
}

export abstract class NodeValuesMixin extends NodeWakeupMixin
	implements NodeValues
{
	public constructor(
		nodeId: number,
		driver: Driver,
		endpointIndex: number,
		deviceClass?: DeviceClass,
		supportedCCs?: CommandClasses[],
		valueDB?: ValueDB,
	) {
		// Define this node's intrinsic endpoint as the root device (0)
		super(nodeId, driver, endpointIndex, deviceClass, supportedCCs);
		this._valueDB = valueDB
			?? new ValueDB(nodeId, driver.valueDB!, driver.metadataDB!);

		// Pass value events to our listeners
		for (
			const event of [
				"value added",
				"value updated",
				"value removed",
				"value notification",
				"metadata updated",
			] as const
		) {
			this._valueDB.on(event, this.translateValueEvent.bind(this, event));
		}
	}

	protected _valueDB: ValueDB;
	public get valueDB(): ValueDB {
		return this._valueDB;
	}

	public getValue<T = unknown>(valueId: ValueID): MaybeNotKnown<T> {
		return this._valueDB.getValue(valueId);
	}

	public getValueTimestamp(valueId: ValueID): MaybeNotKnown<number> {
		return this._valueDB.getTimestamp(valueId);
	}

	public getValueMetadata(valueId: ValueID): ValueMetadata {
		// Check if a corresponding CC value is defined for this value ID
		// so we can extend the returned metadata
		const definedCCValues = getCCValues(valueId.commandClass);
		let valueOptions: Required<CCValueOptions> | undefined;
		let meta: ValueMetadata | undefined;
		if (definedCCValues) {
			const value = Object.values(definedCCValues)
				.find((v) => v?.is(valueId));
			if (value) {
				if (typeof value !== "function") {
					meta = value.meta;
				}
				valueOptions = value.options;
			}
		}

		const existingMetadata = this._valueDB.getMetadata(valueId);
		return {
			// The priority for returned metadata is valueDB > defined value > Any (default)
			...(existingMetadata ?? meta ?? ValueMetadata.Any),
			// ...except for these flags, which are taken from defined values:
			stateful: valueOptions?.stateful ?? defaultCCValueOptions.stateful,
			secret: valueOptions?.secret ?? defaultCCValueOptions.secret,
		};
	}

	/**
	 * Enhances the raw event args of the ValueDB so it can be consumed better by applications
	 */
	protected translateValueEvent<T extends ValueID>(
		eventName: keyof ZWaveNodeValueEventCallbacks,
		arg: T,
	): void {
		// Try to retrieve the speaking CC name
		const outArg = nodeUtils.translateValueID(this.driver, this, arg);
		// This can happen for value updated events
		if ("source" in outArg) delete outArg.source;

		const loglevel = this.driver.getLogConfig().level;

		// If this is a metadata event, make sure we return the merged metadata
		if ("metadata" in outArg) {
			(outArg as unknown as MetadataUpdatedArgs).metadata = this
				.getValueMetadata(arg);
		}

		const ccInstance = CommandClass.createInstanceUnchecked(
			this,
			arg.commandClass,
		);
		const isInternalValue = !!ccInstance?.isInternalValue(arg);
		// Check whether this value change may be logged
		const isSecretValue = !!ccInstance?.isSecretValue(arg);

		if (loglevel === "silly") {
			this.driver.controllerLog.logNode(this.id, {
				message: `[translateValueEvent: ${eventName}]
  commandClass: ${getCCName(arg.commandClass)}
  endpoint:     ${arg.endpoint}
  property:     ${arg.property}
  propertyKey:  ${arg.propertyKey}
  internal:     ${isInternalValue}
  secret:       ${isSecretValue}
  event source: ${(arg as any as ValueUpdatedArgs).source}`,
				level: "silly",
			});
		}

		if (
			!isSecretValue
			&& (arg as any as ValueUpdatedArgs).source !== "driver"
		) {
			// Log the value change, except for updates caused by the driver itself
			// I don't like the splitting and any but its the easiest solution here
			const [changeTarget, changeType] = eventName.split(" ");
			const logArgument = {
				...outArg,
				nodeId: this.id,
				internal: isInternalValue,
			};
			if (changeTarget === "value") {
				this.driver.controllerLog.value(
					changeType as any,
					logArgument as any,
				);
			} else if (changeTarget === "metadata") {
				this.driver.controllerLog.metadataUpdated(logArgument);
			}
		}

		// Don't expose value events for internal value IDs...
		if (isInternalValue) return;

		if (loglevel === "silly") {
			this.driver.controllerLog.logNode(this.id, {
				message: `[translateValueEvent: ${eventName}]
  is root endpoint:        ${!arg.endpoint}
  is application CC:       ${applicationCCs.includes(arg.commandClass)}
  should hide root values: ${
					nodeUtils.shouldHideRootApplicationCCValues(
						this.driver,
						this.id,
					)
				}`,
				level: "silly",
			});
		}

		// ... and root values ID that mirrors endpoint functionality
		if (
			// Only root endpoint values need to be filtered
			!arg.endpoint
			// Only application CCs need to be filtered
			&& applicationCCs.includes(arg.commandClass)
			// and only if the endpoints are not unnecessary and the root values mirror them
			&& nodeUtils.shouldHideRootApplicationCCValues(this.driver, this.id)
		) {
			// Iterate through all possible non-root endpoints of this node and
			// check if there is a value ID that mirrors root endpoint functionality
			for (
				const endpoint of nodeUtils.getEndpointIndizes(
					this.driver,
					this.id,
				)
			) {
				const possiblyMirroredValueID: ValueID = {
					// same CC, property and key
					...pick(arg, ["commandClass", "property", "propertyKey"]),
					// but different endpoint
					endpoint,
				};
				if (this.valueDB.hasValue(possiblyMirroredValueID)) {
					if (loglevel === "silly") {
						this.driver.controllerLog.logNode(this.id, {
							message:
								`[translateValueEvent: ${eventName}] found mirrored value ID on different endpoint, ignoring event:
  commandClass: ${getCCName(possiblyMirroredValueID.commandClass)}
  endpoint:     ${possiblyMirroredValueID.endpoint}
  property:     ${possiblyMirroredValueID.property}
  propertyKey:  ${possiblyMirroredValueID.propertyKey}`,
							level: "silly",
						});
					}

					return;
				}
			}
		}
		// And pass the translated event to our listeners
		this._emit(eventName, this, outArg as any);
	}
}
