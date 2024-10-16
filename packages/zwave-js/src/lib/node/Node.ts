import {
	AssociationGroupInfoProfile,
	type CCAPI,
	CentralSceneKeys,
	ClockCommand,
	CommandClass,
	DeviceResetLocallyCCNotification,
	DeviceResetLocallyCommand,
	DoorLockMode,
	EntryControlDataTypes,
	type FirmwareUpdateCapabilities,
	InclusionControllerCCInitiate,
	InclusionControllerStep,
	IndicatorCCDescriptionGet,
	IndicatorCCGet,
	IndicatorCCSet,
	IndicatorCCSupportedGet,
	MultiChannelAssociationCCGet,
	MultiChannelAssociationCCRemove,
	MultiChannelAssociationCCSet,
	MultiChannelAssociationCCSupportedGroupingsGet,
	MultiCommandCCCommandEncapsulation,
	MultilevelSwitchCommand,
	type PollValueImplementation,
	Powerlevel,
	PowerlevelTestStatus,
	ScheduleEntryLockCommand,
	Security2Command,
	type SetValueAPIOptions,
	TimeCCDateGet,
	TimeCCTimeGet,
	TimeCCTimeOffsetGet,
	TimeCommand,
	TimeParametersCommand,
	UserCodeCCValues,
	type ValueIDProperties,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
	entryControlEventTypeLabels,
	getEffectiveCCVersion,
	getImplementedVersion,
	isCommandClassContainer,
	utils as ccUtils,
} from "@zwave-js/cc";
import {
	AssociationCCGet,
	AssociationCCRemove,
	AssociationCCSet,
	AssociationCCSpecificGroupGet,
	AssociationCCSupportedGroupingsGet,
	AssociationCCValues,
} from "@zwave-js/cc/AssociationCC";
import {
	AssociationGroupInfoCCCommandListGet,
	AssociationGroupInfoCCInfoGet,
	AssociationGroupInfoCCNameGet,
} from "@zwave-js/cc/AssociationGroupInfoCC";
import {
	BasicCC,
	BasicCCReport,
	BasicCCSet,
	BasicCCValues,
} from "@zwave-js/cc/BasicCC";
import {
	type BinarySwitchCC,
	BinarySwitchCCSet,
	BinarySwitchCCValues,
} from "@zwave-js/cc/BinarySwitchCC";
import {
	CentralSceneCCNotification,
	CentralSceneCCValues,
} from "@zwave-js/cc/CentralSceneCC";
import { ClockCCReport } from "@zwave-js/cc/ClockCC";
import { DoorLockCCValues } from "@zwave-js/cc/DoorLockCC";
import { EntryControlCCNotification } from "@zwave-js/cc/EntryControlCC";
import {
	FirmwareUpdateMetaDataCCGet,
	FirmwareUpdateMetaDataCCMetaDataGet,
	FirmwareUpdateMetaDataCCValues,
} from "@zwave-js/cc/FirmwareUpdateMetaDataCC";
import { HailCC } from "@zwave-js/cc/HailCC";
import { LockCCValues } from "@zwave-js/cc/LockCC";
import {
	ManufacturerSpecificCCGet,
	ManufacturerSpecificCCValues,
} from "@zwave-js/cc/ManufacturerSpecificCC";
import {
	MultilevelSwitchCC,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCStartLevelChange,
	MultilevelSwitchCCStopLevelChange,
	MultilevelSwitchCCValues,
} from "@zwave-js/cc/MultilevelSwitchCC";
import { NodeNamingAndLocationCCValues } from "@zwave-js/cc/NodeNamingCC";
import {
	NotificationCCReport,
	NotificationCCValues,
	getNotificationEnumBehavior,
	getNotificationStateValueWithEnum,
	getNotificationValueMetadata,
} from "@zwave-js/cc/NotificationCC";
import {
	PowerlevelCCGet,
	PowerlevelCCSet,
	PowerlevelCCTestNodeGet,
	PowerlevelCCTestNodeReport,
	PowerlevelCCTestNodeSet,
} from "@zwave-js/cc/PowerlevelCC";
import { SceneActivationCCSet } from "@zwave-js/cc/SceneActivationCC";
import {
	Security2CCCommandsSupportedGet,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
} from "@zwave-js/cc/Security2CC";
import {
	SecurityCCCommandsSupportedGet,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "@zwave-js/cc/SecurityCC";
import {
	type ThermostatModeCC,
	ThermostatModeCCSet,
	ThermostatModeCCValues,
} from "@zwave-js/cc/ThermostatModeCC";
import {
	VersionCCCapabilitiesGet,
	VersionCCCommandClassGet,
	VersionCCGet,
	VersionCCValues,
} from "@zwave-js/cc/VersionCC";
import {
	WakeUpCCValues,
	WakeUpCCWakeUpNotification,
} from "@zwave-js/cc/WakeUpCC";
import { ZWavePlusCCGet, ZWavePlusCCValues } from "@zwave-js/cc/ZWavePlusCC";
import {
	type SetValueResult,
	SetValueStatus,
	supervisionResultToSetValueResult,
} from "@zwave-js/cc/safe";
import { type DeviceConfig, embeddedDevicesDir } from "@zwave-js/config";
import {
	BasicDeviceClass,
	CommandClasses,
	Duration,
	EncapsulationFlags,
	type MaybeNotKnown,
	MessagePriority,
	NOT_KNOWN,
	NodeType,
	type NodeUpdatePayload,
	type Notification,
	type NotificationState,
	ProtocolVersion,
	Protocols,
	type QuerySecurityClasses,
	type RSSI,
	RssiError,
	SecurityClass,
	type SendCommandOptions,
	type SetValueOptions,
	type SinglecastCC,
	SupervisionStatus,
	type TXReport,
	type TranslatedValueID,
	TransmitOptions,
	type ValueDB,
	type ValueID,
	type ValueMetadata,
	type ValueMetadataNumeric,
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLibraryTypes,
	actuatorCCs,
	allCCs,
	applicationCCs,
	dskToString,
	encapsulationCCs,
	getCCName,
	getDSTInfo,
	getNotification,
	getNotificationValue,
	isRssiError,
	isSupervisionResult,
	isTransmissionError,
	isUnsupervisedOrSucceeded,
	isZWaveError,
	nonApplicationCCs,
	normalizeValueID,
	securityClassIsLongRange,
	securityClassIsS2,
	securityClassOrder,
	sensorCCs,
	serializeCacheValue,
	supervisedCommandFailed,
	supervisedCommandSucceeded,
	topologicalSort,
	valueIdToString,
} from "@zwave-js/core";
import { FunctionType, type Message } from "@zwave-js/serial";
import {
	Mixin,
	type TypedEventEmitter,
	cloneDeep,
	discreteLinearSearch,
	formatId,
	getEnumMemberName,
	getErrorMessage,
	noop,
	pick,
	stringify,
} from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { roundTo } from "alcalzone-shared/math";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { EventEmitter } from "node:events";
import path from "node:path";
import semver from "semver";
import { RemoveNodeReason } from "../controller/Inclusion";
import { determineNIF } from "../controller/NodeInformationFrame";
import { type Driver, libVersion } from "../driver/Driver";
import { cacheKeys } from "../driver/NetworkCache";
import type { StatisticsEventCallbacksWithSelf } from "../driver/Statistics";
import type { Transaction } from "../driver/Transaction";
import {
	type ApplicationUpdateRequest,
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../serialapi/application/ApplicationUpdateRequest";
import {
	GetNodeProtocolInfoRequest,
	type GetNodeProtocolInfoResponse,
} from "../serialapi/network-mgmt/GetNodeProtocolInfoMessages";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "../serialapi/network-mgmt/RequestNodeInfoMessages";
import { DeviceClass } from "./DeviceClass";
import { type NodeDump, type ValueDump } from "./Dump";
import { type Endpoint } from "./Endpoint";
import {
	formatLifelineHealthCheckSummary,
	formatRouteHealthCheckSummary,
	healthCheckTestFrameCount,
} from "./HealthCheck";
import {
	type NodeStatistics,
	NodeStatisticsHost,
	type RouteStatistics,
	routeStatisticsEquals,
} from "./NodeStatistics";
import {
	type DateAndTime,
	type LifelineHealthCheckResult,
	type LifelineHealthCheckSummary,
	LinkReliabilityCheckMode,
	type LinkReliabilityCheckOptions,
	type LinkReliabilityCheckResult,
	type RefreshInfoOptions,
	type RouteHealthCheckResult,
	type RouteHealthCheckSummary,
	type ZWaveNodeEventCallbacks,
} from "./_Types";
import { InterviewStage, NodeStatus } from "./_Types";
import { ZWaveNodeMixins } from "./mixins";
import * as nodeUtils from "./utils";

const MAX_ASSOCIATIONS = 1;

type AllNodeEvents =
	& ZWaveNodeEventCallbacks
	& StatisticsEventCallbacksWithSelf<ZWaveNode, NodeStatistics>;

export interface ZWaveNode
	extends TypedEventEmitter<AllNodeEvents>, NodeStatisticsHost
{}

/**
 * A ZWaveNode represents a node in a Z-Wave network. It is also an instance
 * of its root endpoint (index 0)
 */
@Mixin([EventEmitter, NodeStatisticsHost])
export class ZWaveNode extends ZWaveNodeMixins implements QuerySecurityClasses {
	public constructor(
		id: number,
		driver: Driver,
		deviceClass?: DeviceClass,
		supportedCCs: CommandClasses[] = [],
		controlledCCs: CommandClasses[] = [],
		valueDB?: ValueDB,
	) {
		super(
			id,
			driver,
			// Define this node's intrinsic endpoint as the root device (0)
			0,
			deviceClass,
			supportedCCs,
			valueDB,
		);

		// Add optional controlled CCs - endpoints don't have this
		for (const cc of controlledCCs) this.addCC(cc, { isControlled: true });
	}

	/**
	 * Cleans up all resources used by this node
	 */
	public destroy(): void {
		// Stop all state machines
		this.statusMachine.stop();
		this.readyMachine.stop();

		// Remove all timeouts
		for (
			const timeout of [
				this.centralSceneKeyHeldDownContext?.timeout,
				...this.notificationIdleTimeouts.values(),
			]
		) {
			if (timeout) clearTimeout(timeout);
		}

		// Remove all event handlers
		this.removeAllListeners();

		// Clear all scheduled polls that would interfere with the interview
		this.cancelAllScheduledPolls();
	}

	/**
	 * The device specific key (DSK) of this node in binary format.
	 * This is only set if included with Security S2.
	 */
	public get dsk(): Buffer | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).dsk);
	}
	/** @internal */
	public set dsk(value: Buffer | undefined) {
		const cacheKey = cacheKeys.node(this.id).dsk;
		this.driver.cacheSet(cacheKey, value);
	}

	public get manufacturerId(): MaybeNotKnown<number> {
		return this.getValue(ManufacturerSpecificCCValues.manufacturerId.id);
	}

	public get productId(): MaybeNotKnown<number> {
		return this.getValue(ManufacturerSpecificCCValues.productId.id);
	}

	public get productType(): MaybeNotKnown<number> {
		return this.getValue(ManufacturerSpecificCCValues.productType.id);
	}

	public get firmwareVersion(): MaybeNotKnown<string> {
		// On supporting nodes, use the applicationVersion, which MUST be
		// same as the first (main) firmware, plus the patch version.
		const firmware0Version = this.getValue<string[]>(
			VersionCCValues.firmwareVersions.id,
		)?.[0];
		const applicationVersion = this.getValue<string>(
			VersionCCValues.applicationVersion.id,
		);

		let ret = firmware0Version;
		if (applicationVersion) {
			// If the application version is set, we cannot blindly trust that it is the firmware version.
			// Some nodes incorrectly set this field to the Z-Wave Application Framework API Version
			if (!ret || applicationVersion.startsWith(`${ret}.`)) {
				ret = applicationVersion;
			}
		}

		// Special case for the official 700 series firmwares which are aligned with the SDK version
		// We want to work with the full x.y.z firmware version here.
		if (ret && this.isControllerNode) {
			const sdkVersion = this.sdkVersion;
			if (sdkVersion && sdkVersion.startsWith(`${ret}.`)) {
				return sdkVersion;
			}
		}
		// For all others, just return the simple x.y firmware version
		return ret;
	}

	public get hardwareVersion(): MaybeNotKnown<number> {
		return this.getValue(VersionCCValues.hardwareVersion.id);
	}

	public get sdkVersion(): MaybeNotKnown<string> {
		return this.getValue(VersionCCValues.sdkVersion.id);
	}

	public get zwavePlusVersion(): MaybeNotKnown<number> {
		return this.getValue(ZWavePlusCCValues.zwavePlusVersion.id);
	}

	public get zwavePlusNodeType(): MaybeNotKnown<ZWavePlusNodeType> {
		return this.getValue(ZWavePlusCCValues.nodeType.id);
	}

	public get zwavePlusRoleType(): MaybeNotKnown<ZWavePlusRoleType> {
		return this.getValue(ZWavePlusCCValues.roleType.id);
	}

	public get supportsWakeUpOnDemand(): MaybeNotKnown<boolean> {
		return this.getValue(WakeUpCCValues.wakeUpOnDemandSupported.id);
	}

	/**
	 * The user-defined name of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
	 *
	 * **Note:** Setting this value only updates the name locally. To permanently change the name of the node, use
	 * the `commandClasses` API.
	 */
	public get name(): MaybeNotKnown<string> {
		return this.getValue(NodeNamingAndLocationCCValues.name.id);
	}
	public set name(value: string | undefined) {
		if (value != undefined) {
			this._valueDB.setValue(
				NodeNamingAndLocationCCValues.name.id,
				value,
			);
		} else {
			this._valueDB.removeValue(NodeNamingAndLocationCCValues.name.id);
		}
	}

	/**
	 * The user-defined location of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
	 *
	 * **Note:** Setting this value only updates the location locally. To permanently change the location of the node, use
	 * the `commandClasses` API.
	 */
	public get location(): MaybeNotKnown<string> {
		return this.getValue(NodeNamingAndLocationCCValues.location.id);
	}
	public set location(value: string | undefined) {
		if (value != undefined) {
			this._valueDB.setValue(
				NodeNamingAndLocationCCValues.location.id,
				value,
			);
		} else {
			this._valueDB.removeValue(
				NodeNamingAndLocationCCValues.location.id,
			);
		}
	}

	/** Whether a SUC return route was configured for this node */
	public get hasSUCReturnRoute(): boolean {
		return !!this.driver.cacheGet(
			cacheKeys.node(this.id).hasSUCReturnRoute,
		);
	}
	public set hasSUCReturnRoute(value: boolean) {
		this.driver.cacheSet(cacheKeys.node(this.id).hasSUCReturnRoute, value);
	}

	private _deviceConfig: DeviceConfig | undefined;
	/**
	 * Contains additional information about this node, loaded from a config file
	 */
	public get deviceConfig(): DeviceConfig | undefined {
		return this._deviceConfig;
	}

	public get label(): string | undefined {
		return this._deviceConfig?.label;
	}

	public get deviceDatabaseUrl(): MaybeNotKnown<string> {
		if (
			this.manufacturerId != undefined
			&& this.productType != undefined
			&& this.productId != undefined
		) {
			const manufacturerId = formatId(this.manufacturerId);
			const productType = formatId(this.productType);
			const productId = formatId(this.productId);
			const firmwareVersion = this.firmwareVersion || "0.0";
			return `https://devices.zwave-js.io/?jumpTo=${manufacturerId}:${productType}:${productId}:${firmwareVersion}`;
		}
	}

	/** The last time a message was received from this node */
	public get lastSeen(): MaybeNotKnown<Date> {
		return this.driver.cacheGet(cacheKeys.node(this.id).lastSeen);
	}
	/** @internal */
	public set lastSeen(value: MaybeNotKnown<Date>) {
		this.driver.cacheSet(cacheKeys.node(this.id).lastSeen, value);
		// Also update statistics
		this.updateStatistics((cur) => ({
			...cur,
			lastSeen: value,
		}));
	}

	/**
	 * The default volume level to be used for activating a Sound Switch.
	 * Can be overridden by command-specific options.
	 */
	public get defaultVolume(): number | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).defaultVolume);
	}

	public set defaultVolume(value: number | undefined) {
		if (value != undefined && (value < 0 || value > 100)) {
			throw new ZWaveError(
				`The default volume must be a number between 0 and 100!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.driver.cacheSet(cacheKeys.node(this.id).defaultVolume, value);
	}

	/**
	 * The default transition duration to be used for transitions like dimming lights or activating scenes.
	 * Can be overridden by command-specific options.
	 */
	public get defaultTransitionDuration(): string | undefined {
		return this.driver.cacheGet(
			cacheKeys.node(this.id).defaultTransitionDuration,
		);
	}

	public set defaultTransitionDuration(value: string | Duration | undefined) {
		// Normalize to strings
		if (typeof value === "string") value = Duration.from(value);
		if (value instanceof Duration) value = value.toString();

		this.driver.cacheSet(
			cacheKeys.node(this.id).defaultTransitionDuration,
			value,
		);
	}

	/**
	 * @internal
	 * The hash of the device config that was applied during the last interview.
	 */
	public get deviceConfigHash(): Buffer | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).deviceConfigHash);
	}

	private set deviceConfigHash(value: Buffer | undefined) {
		this.driver.cacheSet(cacheKeys.node(this.id).deviceConfigHash, value);
	}

	/** Returns a list of all value names that are defined on all endpoints of this node */
	public getDefinedValueIDs(): TranslatedValueID[] {
		return nodeUtils.getDefinedValueIDs(this.driver, this);
	}

	/**
	 * Updates a value for a given property of a given CommandClass on the node.
	 * This will communicate with the node!
	 */
	public async setValue(
		valueId: ValueID,
		value: unknown,
		options?: SetValueAPIOptions,
	): Promise<SetValueResult> {
		// Ensure we're dealing with a valid value ID, with no extra properties
		valueId = normalizeValueID(valueId);

		const loglevel = this.driver.getLogConfig().level;

		// Try to retrieve the corresponding CC API
		try {
			// Access the CC API by name
			const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
			if (!endpointInstance) {
				return {
					status: SetValueStatus.EndpointNotFound,
					message:
						`Endpoint ${valueId.endpoint} does not exist on Node ${this.id}`,
				};
			}
			let api = (endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI;
			// Check if the setValue method is implemented
			if (!api.setValue) {
				return {
					status: SetValueStatus.NotImplemented,
					message: `The ${
						getCCName(
							valueId.commandClass,
						)
					} CC does not support setting values`,
				};
			}

			if (loglevel === "silly") {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: valueId.endpoint,
					message:
						`[setValue] calling SET_VALUE API ${api.constructor.name}:
  property:     ${valueId.property}
  property key: ${valueId.propertyKey}
  optimistic:   ${api.isSetValueOptimistic(valueId)}`,
					level: "silly",
				});
			}

			// Merge the provided value change options with the defaults
			options ??= {};
			options.transitionDuration ??= this.defaultTransitionDuration;
			options.volume ??= this.defaultVolume;

			const valueIdProps: ValueIDProperties = {
				property: valueId.property,
				propertyKey: valueId.propertyKey,
			};

			const hooks = api.setValueHooks?.(valueIdProps, value, options);

			if (hooks?.supervisionDelayedUpdates) {
				api = api.withOptions({
					requestStatusUpdates: true,
					onUpdate: async (update) => {
						try {
							if (update.status === SupervisionStatus.Success) {
								await hooks.supervisionOnSuccess();
							} else if (
								update.status === SupervisionStatus.Fail
							) {
								await hooks.supervisionOnFailure();
							}
						} catch {
							// TODO: Log error?
						}
					},
				});
			}

			// If the caller wants progress updates, they shall have them
			if (typeof options.onProgress === "function") {
				api = api.withOptions({
					onProgress: options.onProgress,
				});
			}

			// And call it
			const result = await api.setValue!.call(
				api,
				valueIdProps,
				value,
				options,
			);

			if (loglevel === "silly") {
				let message =
					`[setValue] result of SET_VALUE API call for ${api.constructor.name}:`;
				if (result) {
					if (isSupervisionResult(result)) {
						message += ` (SupervisionResult)
  status:   ${getEnumMemberName(SupervisionStatus, result.status)}`;
						if (result.remainingDuration) {
							message += `
  duration: ${result.remainingDuration.toString()}`;
						}
					} else {
						message += " (other) "
							+ JSON.stringify(result, null, 2);
					}
				} else {
					message += " undefined";
				}
				this.driver.controllerLog.logNode(this.id, {
					endpoint: valueId.endpoint,
					message,
					level: "silly",
				});
			}

			// Remember the new value for the value we just set, if...
			// ... the call did not throw (assume that the call was successful)
			// ... the call was supervised and successful
			if (
				api.isSetValueOptimistic(valueId)
				&& isUnsupervisedOrSucceeded(result)
			) {
				const emitEvent = !!result
					|| !!this.driver.options.emitValueUpdateAfterSetValue;

				if (loglevel === "silly") {
					const message = emitEvent
						? "updating value with event"
						: "updating value without event";
					this.driver.controllerLog.logNode(this.id, {
						endpoint: valueId.endpoint,
						message: `[setValue] ${message}`,
						level: "silly",
					});
				}

				const options: SetValueOptions = {};
				// We need to emit an event if applications opted in, or if this was a supervised call
				// because in this case there won't be a verification query which would result in an update
				if (emitEvent) {
					options.source = "driver";
				} else {
					options.noEvent = true;
				}
				// Only update the timestamp of the value for successful supervised commands. Otherwise we don't know
				// if the command was actually executed. If it wasn't, we'd have a wrong timestamp.
				options.updateTimestamp = supervisedCommandSucceeded(result);

				this._valueDB.setValue(valueId, value, options);
			} else if (loglevel === "silly") {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: valueId.endpoint,
					message: `[setValue] not updating value`,
					level: "silly",
				});
			}

			// Depending on the settings of the SET_VALUE implementation, we may have to
			// optimistically update a different value and/or verify the changes
			if (hooks) {
				const supervisedAndSuccessful = isSupervisionResult(result)
					&& result.status === SupervisionStatus.Success;

				const shouldUpdateOptimistically =
					api.isSetValueOptimistic(valueId)
					// For successful supervised commands, we know that an optimistic update is ok
					&& (supervisedAndSuccessful
						// For unsupervised commands that did not fail, we let the applciation decide whether
						// to update related value optimistically
						|| (!this.driver.options.disableOptimisticValueUpdate
							&& result == undefined));

				// The actual API implementation handles additional optimistic updates
				if (shouldUpdateOptimistically) {
					hooks.optimisticallyUpdateRelatedValues?.(
						supervisedAndSuccessful,
					);
				}

				// Verify the current value after a delay, unless...
				// ...the command was supervised and successful
				// ...and the CC API decides not to verify anyways
				if (
					!supervisedCommandSucceeded(result)
					|| hooks.forceVerifyChanges?.()
				) {
					// Let the CC API implementation handle the verification.
					// It may still decide not to do it.
					await hooks.verifyChanges?.();
				}
			}

			return supervisionResultToSetValueResult(result);
		} catch (e) {
			// Define which errors during setValue are expected and won't throw an error
			if (isZWaveError(e)) {
				let result: SetValueResult | undefined;
				switch (e.code) {
					// This CC or API is not implemented
					case ZWaveErrorCodes.CC_NotImplemented:
					case ZWaveErrorCodes.CC_NoAPI:
						result = {
							status: SetValueStatus.NotImplemented,
							message: e.message,
						};
						break;
					// A user tried to set an invalid value
					case ZWaveErrorCodes.Argument_Invalid:
						result = {
							status: SetValueStatus.InvalidValue,
							message: e.message,
						};
						break;
				}

				if (loglevel === "silly") {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: valueId.endpoint,
						message: `[setValue] raised ZWaveError (${
							!!result ? "handled" : "not handled"
						}, code ${
							getEnumMemberName(
								ZWaveErrorCodes,
								e.code,
							)
						}): ${e.message}`,
						level: "silly",
					});
				}

				if (result) return result;
			}
			throw e;
		}
	}

	/**
	 * Requests a value for a given property of a given CommandClass by polling the node.
	 * **Warning:** Some value IDs share a command, so make sure not to blindly call this for every property
	 */
	public pollValue<T = unknown>(
		valueId: ValueID,
		sendCommandOptions: SendCommandOptions = {},
	): Promise<MaybeNotKnown<T>> {
		// Ensure we're dealing with a valid value ID, with no extra properties
		valueId = normalizeValueID(valueId);

		// Try to retrieve the corresponding CC API
		const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
		if (!endpointInstance) {
			throw new ZWaveError(
				`Endpoint ${valueId.endpoint} does not exist on Node ${this.id}`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const api = (
			(endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI
		).withOptions({
			// We do not want to delay more important communication by polling, so give it
			// the lowest priority and don't retry unless overwritten by the options
			maxSendAttempts: 1,
			priority: MessagePriority.Poll,
			...sendCommandOptions,
		});

		// Check if the pollValue method is implemented
		if (!api.pollValue) {
			throw new ZWaveError(
				`The pollValue API is not implemented for CC ${
					getCCName(
						valueId.commandClass,
					)
				}!`,
				ZWaveErrorCodes.CC_NoAPI,
			);
		}

		// And call it
		return (api.pollValue as PollValueImplementation<T>).call(api, {
			property: valueId.property,
			propertyKey: valueId.propertyKey,
		});
	}

	private _interviewAttempts: number = 0;
	/** How many attempts to interview this node have already been made */
	public get interviewAttempts(): number {
		return this._interviewAttempts;
	}

	private _hasEmittedNoS2NetworkKeyError: boolean = false;
	private _hasEmittedNoS0NetworkKeyError: boolean = false;

	/**
	 * Starts or resumes a deferred initial interview of this node.
	 *
	 * **WARNING:** This is only allowed when the initial interview was deferred using the
	 * `interview.disableOnNodeAdded` option. Otherwise, this method will throw an error.
	 *
	 * **NOTE:** It is advised to NOT await this method as it can take a very long time (minutes to hours)!
	 */
	public async interview(): Promise<void> {
		// The initial interview of the controller node is always done
		// and cannot be deferred.
		if (this.isControllerNode) return;

		if (!this.driver.options.interview?.disableOnNodeAdded) {
			throw new ZWaveError(
				`Calling ZWaveNode.interview() is not allowed because automatic node interviews are enabled. Wait for the driver to interview the node or use ZWaveNode.refreshInfo() to re-interview a node.`,
				ZWaveErrorCodes.Driver_FeatureDisabled,
			);
		}

		return this.driver.interviewNodeInternal(this);
	}

	private _refreshInfoPending: boolean = false;

	/**
	 * Resets all information about this node and forces a fresh interview.
	 * **Note:** This does nothing for the controller node.
	 *
	 * **WARNING:** Take care NOT to call this method when the node is already being interviewed.
	 * Otherwise the node information may become inconsistent.
	 */
	public async refreshInfo(options: RefreshInfoOptions = {}): Promise<void> {
		// It does not make sense to re-interview the controller. All important information is queried
		// directly via the serial API
		if (this.isControllerNode) return;

		// The driver does deduplicate re-interview requests, but only at the end of this method.
		// Without blocking here, many re-interview tasks for sleeping nodes may be queued, leading to parallel interviews
		if (this._refreshInfoPending) return;
		this._refreshInfoPending = true;

		const { resetSecurityClasses = false, waitForWakeup = true } = options;
		// Unless desired, don't forget the information about sleeping nodes immediately, so they continue to function
		let didWakeUp = false;
		if (
			waitForWakeup
			&& this.canSleep
			&& this.supportsCC(CommandClasses["Wake Up"])
		) {
			this.driver.controllerLog.logNode(
				this.id,
				"Re-interview scheduled, waiting for node to wake up...",
			);
			didWakeUp = await this.waitForWakeup()
				.then(() => true)
				.catch(() => false);
		}

		// preserve the node name and location, since they might not be stored on the node
		const name = this.name;
		const location = this.location;

		// Preserve user codes if they aren't queried during the interview
		const preservedValues: (ValueID & { value: unknown })[] = [];
		const preservedMetadata: (ValueID & { metadata: ValueMetadata })[] = [];
		if (
			this.supportsCC(CommandClasses["User Code"])
			&& !this.driver.options.interview.queryAllUserCodes
		) {
			const mustBackup = (v: ValueID) =>
				UserCodeCCValues.userCode.is(v)
				|| UserCodeCCValues.userIdStatus.is(v)
				|| UserCodeCCValues.userCodeChecksum.is(v);

			const values = this.valueDB
				.getValues(CommandClasses["User Code"])
				.filter(mustBackup);
			preservedValues.push(...values);

			const meta = this.valueDB
				.getAllMetadata(CommandClasses["User Code"])
				.filter(mustBackup);
			preservedMetadata.push(...meta);
		}

		// Force a new detection of security classes if desired
		if (resetSecurityClasses) this.securityClasses.clear();

		this._interviewAttempts = 0;
		this.interviewStage = InterviewStage.None;
		this.ready = false;
		this.deviceClass = undefined;
		this.isListening = undefined;
		this.isFrequentListening = undefined;
		this.isRouting = undefined;
		this.supportedDataRates = undefined;
		this.protocolVersion = undefined;
		this.nodeType = undefined;
		this.supportsSecurity = undefined;
		this.supportsBeaming = undefined;
		this._deviceConfig = undefined;
		this.deviceConfigHash = undefined;
		this._hasEmittedNoS0NetworkKeyError = false;
		this._hasEmittedNoS2NetworkKeyError = false;
		for (const ep of this.getAllEndpoints()) {
			ep["reset"]();
		}
		this._valueDB.clear({ noEvent: true });
		this._endpointInstances.clear();
		super.reset();

		// Restart all state machines
		this.readyMachine.restart();
		this.statusMachine.restart();

		// Remove queued polls that would interfere with the interview
		this.cancelAllScheduledPolls();

		// Restore the previously saved name/location
		if (name != undefined) this.name = name;
		if (location != undefined) this.location = location;

		// And preserved values/metadata
		for (const { value, ...valueId } of preservedValues) {
			this.valueDB.setValue(valueId, value, { noEvent: true });
		}
		for (const { metadata, ...valueId } of preservedMetadata) {
			this.valueDB.setMetadata(valueId, metadata, { noEvent: true });
		}

		// Don't keep the node awake after the interview
		this.keepAwake = false;

		// If we did wait for the wakeup, mark the node as awake again so it does not
		// get considered asleep after querying protocol info.
		if (didWakeUp) this.markAsAwake();

		void this.driver.interviewNodeInternal(this);
		this._refreshInfoPending = false;
	}

	/**
	 * @internal
	 * Interviews this node. Returns true when it succeeded, false otherwise
	 *
	 * WARNING: Do not call this method from application code. To refresh the information
	 * for a specific node, use `node.refreshInfo()` instead
	 */
	public async interviewInternal(): Promise<boolean> {
		if (this.interviewStage === InterviewStage.Complete) {
			this.driver.controllerLog.logNode(
				this.id,
				`skipping interview because it is already completed`,
			);
			return true;
		} else {
			this.driver.controllerLog.interviewStart(this);
		}

		// Remember that we tried to interview this node
		this._interviewAttempts++;

		// Wrapper around interview methods to return false in case of a communication error
		// This way the single methods don't all need to have the same error handler
		const tryInterviewStage = async (
			method: () => Promise<void>,
		): Promise<boolean> => {
			try {
				await method();
				return true;
			} catch (e) {
				if (isTransmissionError(e)) {
					return false;
				}
				throw e;
			}
		};

		// The interview is done in several stages. At each point, the interview process might be aborted
		// due to a stage failing. The reached stage is saved, so we can continue it later without
		// repeating stages unnecessarily

		if (this.interviewStage === InterviewStage.None) {
			// do a full interview starting with the protocol info
			this.driver.controllerLog.logNode(
				this.id,
				`new node, doing a full interview...`,
			);
			this.emit("interview started", this);
			await this.queryProtocolInfo();
		}

		if (!this.isControllerNode) {
			if (
				(this.isListening || this.isFrequentListening)
				&& this.status !== NodeStatus.Alive
			) {
				// Ping non-sleeping nodes to determine their status
				if (!await this.ping()) {
					// Not alive, abort the interview
					return false;
				}
			}

			if (this.interviewStage === InterviewStage.ProtocolInfo) {
				if (
					!(await tryInterviewStage(() => this.interviewNodeInfo()))
				) {
					return false;
				}
			}

			// At this point the basic interview of new nodes is done. Start here when re-interviewing known nodes
			// to get updated information about command classes
			if (this.interviewStage === InterviewStage.NodeInfo) {
				// Only advance the interview if it was completed, otherwise abort
				if (await this.interviewCCs()) {
					this.setInterviewStage(InterviewStage.CommandClasses);
				} else {
					return false;
				}
			}
		}

		if (
			(this.isControllerNode
				&& this.interviewStage === InterviewStage.ProtocolInfo)
			|| (!this.isControllerNode
				&& this.interviewStage === InterviewStage.CommandClasses)
		) {
			// Load a config file for this node if it exists and overwrite the previously reported information
			await this.overwriteConfig();
		}

		// Remember the state of the device config that is used for this node
		this.deviceConfigHash = this._deviceConfig?.getHash();

		this.setInterviewStage(InterviewStage.Complete);
		this.readyMachine.send("INTERVIEW_DONE");

		// Tell listeners that the interview is completed
		// The driver will then send this node to sleep
		this.emit("interview completed", this);
		return true;
	}

	/** Updates this node's interview stage and saves to cache when appropriate */
	private setInterviewStage(completedStage: InterviewStage): void {
		this.interviewStage = completedStage;
		this.emit(
			"interview stage completed",
			this,
			getEnumMemberName(InterviewStage, completedStage),
		);
		this.driver.controllerLog.interviewStage(this);
	}

	/** Step #1 of the node interview */
	protected async queryProtocolInfo(): Promise<void> {
		this.driver.controllerLog.logNode(this.id, {
			message: "querying protocol info...",
			direction: "outbound",
		});
		// The GetNodeProtocolInfoRequest needs to know the node ID to distinguish
		// between ZWLR and ZW classic. We store it on the driver's context, so it
		// can be retrieved when needed.
		this.driver.requestContext.set(FunctionType.GetNodeProtocolInfo, {
			nodeId: this.id,
		});
		const resp = await this.driver.sendMessage<GetNodeProtocolInfoResponse>(
			new GetNodeProtocolInfoRequest({
				requestedNodeId: this.id,
			}),
		);
		this.isListening = resp.isListening;
		this.isFrequentListening = resp.isFrequentListening;
		this.isRouting = resp.isRouting;
		this.supportedDataRates = resp.supportedDataRates;
		this.protocolVersion = resp.protocolVersion;
		this.nodeType = resp.nodeType;
		this.supportsSecurity = resp.supportsSecurity;
		this.supportsBeaming = resp.supportsBeaming;

		this.deviceClass = new DeviceClass(
			resp.basicDeviceClass,
			resp.genericDeviceClass,
			resp.specificDeviceClass,
		);

		const logMessage = `received response for protocol info:
basic device class:    ${
			getEnumMemberName(BasicDeviceClass, this.deviceClass.basic)
		}
generic device class:  ${this.deviceClass.generic.label}
specific device class: ${this.deviceClass.specific.label}
node type:             ${getEnumMemberName(NodeType, this.nodeType)}
is always listening:   ${this.isListening}
is frequent listening: ${this.isFrequentListening}
can route messages:    ${this.isRouting}
supports security:     ${this.supportsSecurity}
supports beaming:      ${this.supportsBeaming}
maximum data rate:     ${this.maxDataRate} kbps
protocol version:      ${this.protocolVersion}`;
		this.driver.controllerLog.logNode(this.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Assume that sleeping nodes start asleep (unless we know it is awake)
		if (this.canSleep) {
			if (this.status === NodeStatus.Alive) {
				// If it was just included and is currently communicating with us,
				// then we didn't know yet that it can sleep. So we need to switch from alive/dead to awake/asleep
				this.markAsAwake();
			} else if (this.status !== NodeStatus.Awake) {
				this.markAsAsleep();
			}
		}

		this.setInterviewStage(InterviewStage.ProtocolInfo);
	}

	/** Node interview: pings the node to see if it responds */
	public async ping(): Promise<boolean> {
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot ping",
				"warn",
			);
			return true;
		}

		this.driver.controllerLog.logNode(this.id, {
			message: "pinging the node...",
			direction: "outbound",
		});

		try {
			await this.commandClasses["No Operation"].send();
			this.driver.controllerLog.logNode(this.id, {
				message: "ping successful",
				direction: "inbound",
			});
			return true;
		} catch (e) {
			this.driver.controllerLog.logNode(
				this.id,
				`ping failed: ${getErrorMessage(e)}`,
			);
			return false;
		}
	}

	/**
	 * Step #5 of the node interview
	 * Request node info
	 */
	protected async interviewNodeInfo(): Promise<void> {
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot query node info",
				"warn",
			);
			return;
		}

		// If we incorrectly assumed a sleeping node to be awake, this step will fail.
		// In order to fail the interview, we retry here
		for (let attempts = 1; attempts <= 2; attempts++) {
			this.driver.controllerLog.logNode(this.id, {
				message: "querying node info...",
				direction: "outbound",
			});
			try {
				const nodeInfo = await this.requestNodeInfo();
				const logLines: string[] = [
					"node info received",
					"supported CCs:",
				];
				for (const cc of nodeInfo.supportedCCs) {
					logLines.push(`· ${getCCName(cc)}`);
				}
				this.driver.controllerLog.logNode(this.id, {
					message: logLines.join("\n"),
					direction: "inbound",
				});
				this.updateNodeInfo(nodeInfo);
				break;
			} catch (e) {
				if (isZWaveError(e)) {
					if (
						attempts === 1
						&& this.canSleep
						&& this.status !== NodeStatus.Asleep
						&& e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						this.driver.controllerLog.logNode(
							this.id,
							`Querying the node info failed, the node is probably asleep. Retrying after wakeup...`,
							"error",
						);
						// We assumed the node to be awake, but it is not.
						this.markAsAsleep();
						// Retry the query when the node wakes up
						continue;
					}

					if (
						e.code === ZWaveErrorCodes.Controller_ResponseNOK
						|| e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						this.driver.controllerLog.logNode(
							this.id,
							`Querying the node info failed`,
							"error",
						);
					}
					throw e;
				}
			}
		}

		this.setInterviewStage(InterviewStage.NodeInfo);
	}

	public async requestNodeInfo(): Promise<NodeUpdatePayload> {
		const resp = await this.driver.sendMessage<
			RequestNodeInfoResponse | ApplicationUpdateRequest
		>(new RequestNodeInfoRequest({ nodeId: this.id }));
		if (resp instanceof RequestNodeInfoResponse && !resp.wasSent) {
			// TODO: handle this in SendThreadMachine
			throw new ZWaveError(
				`Querying the node info failed`,
				ZWaveErrorCodes.Controller_ResponseNOK,
			);
		} else if (
			resp instanceof ApplicationUpdateRequestNodeInfoRequestFailed
		) {
			// TODO: handle this in SendThreadMachine
			throw new ZWaveError(
				`Querying the node info failed`,
				ZWaveErrorCodes.Controller_CallbackNOK,
			);
		} else if (resp instanceof ApplicationUpdateRequestNodeInfoReceived) {
			const logLines: string[] = ["node info received", "supported CCs:"];
			for (const cc of resp.nodeInformation.supportedCCs) {
				logLines.push(`· ${getCCName(cc)}`);
			}
			this.driver.controllerLog.logNode(this.id, {
				message: logLines.join("\n"),
				direction: "inbound",
			});
			return resp.nodeInformation;
		}
		throw new ZWaveError(
			`Received unexpected response to RequestNodeInfoRequest`,
			ZWaveErrorCodes.Controller_CommandError,
		);
	}

	/**
	 * Loads the device configuration for this node from a config file
	 */
	protected async loadDeviceConfig(): Promise<void> {
		// But the configuration definitions might change
		if (
			this.manufacturerId != undefined
			&& this.productType != undefined
			&& this.productId != undefined
		) {
			// Try to load the config file
			this._deviceConfig = await this.driver.configManager.lookupDevice(
				this.manufacturerId,
				this.productType,
				this.productId,
				this.firmwareVersion,
			);
			if (this._deviceConfig) {
				this.driver.controllerLog.logNode(
					this.id,
					`${
						this._deviceConfig.isEmbedded
							? "Embedded"
							: "User-provided"
					} device config loaded`,
				);
			} else {
				this.driver.controllerLog.logNode(
					this.id,
					"No device config found",
					"warn",
				);
			}
		}
	}

	/** Step #? of the node interview */
	protected async interviewCCs(): Promise<boolean> {
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot interview CCs",
				"warn",
			);
			return true;
		}

		const securityManager2 = this.driver.getSecurityManager2(this.id);

		/**
		 * @param force When this is `true`, the interview will be attempted even when the CC is not supported by the endpoint.
		 */
		const interviewEndpoint = async (
			endpoint: Endpoint,
			cc: CommandClasses,
			force: boolean = false,
		): Promise<"continue" | false | void> => {
			let instance: CommandClass;
			try {
				if (force) {
					instance = CommandClass.createInstanceUnchecked(
						endpoint,
						cc,
					)!;
				} else {
					instance = endpoint.createCCInstance(cc)!;
				}
			} catch (e) {
				if (
					isZWaveError(e)
					&& e.code === ZWaveErrorCodes.CC_NotSupported
				) {
					// The CC is no longer supported. This can happen if the node tells us
					// something different in the Version interview than it did in its NIF
					return "continue";
				}
				// we want to pass all other errors through
				throw e;
			}
			if (
				endpoint.isCCSecure(cc)
				&& !this.driver.securityManager
				&& !securityManager2
			) {
				// The CC is only supported securely, but the network key is not set up
				// Skip the CC
				this.driver.controllerLog.logNode(
					this.id,
					`Skipping interview for secure CC ${
						getCCName(
							cc,
						)
					} because no network key is configured!`,
					"error",
				);
				return "continue";
			}

			// Skip this step if the CC was already interviewed
			if (instance.isInterviewComplete(this.driver)) return "continue";

			try {
				await instance.interview(this.driver);
			} catch (e) {
				if (isTransmissionError(e)) {
					// We had a CAN or timeout during the interview
					// or the node is presumed dead. Abort the process
					return false;
				}
				// we want to pass all other errors through
				throw e;
			}
		};

		// Always interview Security first because it changes the interview order
		if (this.supportsCC(CommandClasses["Security 2"])) {
			// Security S2 is always supported *securely*
			this.addCC(CommandClasses["Security 2"], { secure: true });

			// Query supported CCs unless we know for sure that the node wasn't assigned a S2 security class
			const securityClass = this.getHighestSecurityClass();
			if (
				securityClass == undefined
				|| securityClassIsS2(securityClass)
			) {
				this.driver.controllerLog.logNode(
					this.id,
					"Root device interview: Security S2",
					"silly",
				);

				if (!securityManager2) {
					if (!this._hasEmittedNoS2NetworkKeyError) {
						// Cannot interview a secure device securely without a network key
						const errorMessage =
							`supports Security S2, but no S2 network keys were configured. The interview might not include all functionality.`;
						this.driver.controllerLog.logNode(
							this.id,
							errorMessage,
							"error",
						);
						this.driver.emit(
							"error",
							new ZWaveError(
								`Node ${
									padStart(
										this.id.toString(),
										3,
										"0",
									)
								} ${errorMessage}`,
								ZWaveErrorCodes
									.Controller_NodeInsecureCommunication,
							),
						);
						this._hasEmittedNoS2NetworkKeyError = true;
					}
				} else {
					const action = await interviewEndpoint(
						this,
						CommandClasses["Security 2"],
					);
					if (typeof action === "boolean") return action;
				}
			}
		} else {
			// If there is any doubt about granted S2 security classes, we now know they are not granted
			for (
				const secClass of [
					SecurityClass.S2_AccessControl,
					SecurityClass.S2_Authenticated,
					SecurityClass.S2_Unauthenticated,
				] as const
			) {
				if (this.hasSecurityClass(secClass) === NOT_KNOWN) {
					this.securityClasses.set(secClass, false);
				}
			}
		}

		if (this.supportsCC(CommandClasses.Security)) {
			// Security S0 is always supported *securely*
			this.addCC(CommandClasses.Security, { secure: true });

			// Query supported CCs unless we know for sure that the node wasn't assigned the S0 security class
			if (this.hasSecurityClass(SecurityClass.S0_Legacy) !== false) {
				this.driver.controllerLog.logNode(
					this.id,
					"Root device interview: Security S0",
					"silly",
				);

				if (!this.driver.securityManager) {
					if (!this._hasEmittedNoS0NetworkKeyError) {
						// Cannot interview a secure device securely without a network key
						const errorMessage =
							`supports Security S0, but the S0 network key was not configured. The interview might not include all functionality.`;
						this.driver.controllerLog.logNode(
							this.id,
							errorMessage,
							"error",
						);
						this.driver.emit(
							"error",
							new ZWaveError(
								`Node ${
									padStart(
										this.id.toString(),
										3,
										"0",
									)
								} ${errorMessage}`,
								ZWaveErrorCodes
									.Controller_NodeInsecureCommunication,
							),
						);
						this._hasEmittedNoS0NetworkKeyError = true;
					}
				} else {
					const action = await interviewEndpoint(
						this,
						CommandClasses.Security,
					);
					if (typeof action === "boolean") return action;
				}
			}
		} else {
			if (this.hasSecurityClass(SecurityClass.S0_Legacy) === NOT_KNOWN) {
				// Remember that this node hasn't been granted the S0 security class
				this.securityClasses.set(SecurityClass.S0_Legacy, false);
			}
		}

		// Manufacturer Specific and Version CC need to be handled before the other CCs because they are needed to
		// identify the device and apply device configurations
		if (this.supportsCC(CommandClasses["Manufacturer Specific"])) {
			this.driver.controllerLog.logNode(
				this.id,
				"Root device interview: Manufacturer Specific",
				"silly",
			);

			const action = await interviewEndpoint(
				this,
				CommandClasses["Manufacturer Specific"],
			);
			if (typeof action === "boolean") return action;
		}

		if (this.supportsCC(CommandClasses.Version)) {
			this.driver.controllerLog.logNode(
				this.id,
				"Root device interview: Version",
				"silly",
			);

			const action = await interviewEndpoint(
				this,
				CommandClasses.Version,
			);
			if (typeof action === "boolean") return action;

			// After the version CC interview of the root endpoint, we have enough info to load the correct device config file
			await this.loadDeviceConfig();

			// At this point we may need to make some changes to the CCs the device reports
			this.applyCommandClassesCompatFlag();
		} else {
			this.driver.controllerLog.logNode(
				this.id,
				"Version CC is not supported. Using the highest implemented version for each CC",
				"debug",
			);

			for (const [ccId, info] of this.getCCs()) {
				if (
					info.isSupported
					// The support status of Basic CC is not known yet at this point
					|| ccId === CommandClasses.Basic
				) {
					this.addCC(ccId, { version: getImplementedVersion(ccId) });
				}
			}
		}

		// The Wakeup interview should be done as early as possible
		if (this.supportsCC(CommandClasses["Wake Up"])) {
			this.driver.controllerLog.logNode(
				this.id,
				"Root device interview: Wake Up",
				"silly",
			);

			const action = await interviewEndpoint(
				this,
				CommandClasses["Wake Up"],
			);
			if (typeof action === "boolean") return action;
		}

		this.modifySupportedCCBeforeInterview(this);

		// We determine the correct interview order of the remaining CCs by topologically sorting two dependency graph
		// In order to avoid emitting unnecessary value events for the root endpoint,
		// we defer the application CC interview until after the other endpoints have been interviewed
		// The following CCs are interviewed "manually" outside of the automatic interview sequence,
		// because there are special rules around them.
		const specialCCs = [
			CommandClasses.Security,
			CommandClasses["Security 2"],
			CommandClasses["Manufacturer Specific"],
			CommandClasses.Version,
			CommandClasses["Wake Up"],
			// Basic CC is interviewed last
			CommandClasses.Basic,
		];
		const rootInterviewGraphBeforeEndpoints = this.buildCCInterviewGraph([
			...specialCCs,
			...applicationCCs,
		]);
		let rootInterviewOrderBeforeEndpoints: CommandClasses[];

		const rootInterviewGraphAfterEndpoints = this.buildCCInterviewGraph([
			...specialCCs,
			...nonApplicationCCs,
		]);
		let rootInterviewOrderAfterEndpoints: CommandClasses[];

		try {
			rootInterviewOrderBeforeEndpoints = topologicalSort(
				rootInterviewGraphBeforeEndpoints,
			);
			rootInterviewOrderAfterEndpoints = topologicalSort(
				rootInterviewGraphAfterEndpoints,
			);
		} catch {
			// This interview cannot be done
			throw new ZWaveError(
				"The CC interview cannot be completed because there are circular dependencies between CCs!",
				ZWaveErrorCodes.CC_Invalid,
			);
		}

		this.driver.controllerLog.logNode(
			this.id,
			`Root device interviews before endpoints: ${
				rootInterviewOrderBeforeEndpoints
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join("")
			}`,
			"silly",
		);

		this.driver.controllerLog.logNode(
			this.id,
			`Root device interviews after endpoints: ${
				rootInterviewOrderAfterEndpoints
					.map((cc) => `\n· ${getCCName(cc)}`)
					.join("")
			}`,
			"silly",
		);

		// Now that we know the correct order, do the interview in sequence
		for (const cc of rootInterviewOrderBeforeEndpoints) {
			this.driver.controllerLog.logNode(
				this.id,
				`Root device interview: ${getCCName(cc)}`,
				"silly",
			);

			const action = await interviewEndpoint(this, cc);
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		// Before querying the endpoints, we may need to make some more changes to the CCs the device reports
		// This time, the non-root endpoints are relevant
		this.applyCommandClassesCompatFlag();

		// Now query ALL endpoints
		for (const endpointIndex of this.getEndpointIndizes()) {
			const endpoint = this.getEndpoint(endpointIndex);
			if (!endpoint) continue;

			// The root endpoint has been interviewed, so we know if the device supports security and which security classes it has
			const securityClass = this.getHighestSecurityClass();

			// From the specs, Multi Channel Capability Report Command:
			// Non-secure End Point capabilities MUST also be supported securely and MUST also be advertised in
			// the S0/S2 Commands Supported Report Commands unless they are encapsulated outside Security or
			// Security themselves.
			// Nodes supporting S2 MUST support addressing every End Point with S2 encapsulation and MAY
			// explicitly list S2 in the non-secure End Point capabilities.

			// This means we need to explicitly add S2 to the list of supported CCs of the endpoint, if the node is using S2.
			// Otherwise the communication will incorrectly use no encryption.
			const endpointMissingS2 = securityClassIsS2(securityClass)
				&& this.supportsCC(CommandClasses["Security 2"])
				&& !endpoint.supportsCC(CommandClasses["Security 2"]);
			if (endpointMissingS2) {
				endpoint.addCC(
					CommandClasses["Security 2"],
					this.implementedCommandClasses.get(
						CommandClasses["Security 2"],
					)!,
				);
			}

			// Always interview Security first because it changes the interview order

			if (endpoint.supportsCC(CommandClasses["Security 2"])) {
				// Security S2 is always supported *securely*
				endpoint.addCC(CommandClasses["Security 2"], { secure: true });

				// If S2 is the highest security class, interview it for the endpoint
				if (
					securityClassIsS2(securityClass)
					&& !!securityManager2
				) {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: endpoint.index,
						message:
							`Endpoint ${endpoint.index} interview: Security S2`,
						level: "silly",
					});

					const action = await interviewEndpoint(
						endpoint,
						CommandClasses["Security 2"],
					);
					if (typeof action === "boolean") return action;
				}
			}

			if (endpoint.supportsCC(CommandClasses.Security)) {
				// Security S0 is always supported *securely*
				endpoint.addCC(CommandClasses.Security, { secure: true });

				// If S0 is the highest security class, interview it for the endpoint
				if (
					securityClass === SecurityClass.S0_Legacy
					&& !!this.driver.securityManager
				) {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: endpoint.index,
						message:
							`Endpoint ${endpoint.index} interview: Security S0`,
						level: "silly",
					});

					const action = await interviewEndpoint(
						endpoint,
						CommandClasses.Security,
					);
					if (typeof action === "boolean") return action;
				}
			}

			// It has been found that legacy nodes do not always advertise the S0 Command Class in their Multi
			// Channel Capability Report and still accept all their Command Class using S0 encapsulation.
			// A controlling node SHOULD try to control End Points with S0 encapsulation even if S0 is not
			// listed in the Multi Channel Capability Report.

			const endpointMissingS0 = securityClass === SecurityClass.S0_Legacy
				&& this.supportsCC(CommandClasses.Security)
				&& !endpoint.supportsCC(CommandClasses.Security);

			if (endpointMissingS0) {
				// Define which CCs we can use to test this - and if supported, how
				const possibleTests: {
					ccId: CommandClasses;
					// The test must return a truthy value if the check was successful
					test: () => Promise<unknown>;
				}[] = [
					{
						ccId: CommandClasses["Z-Wave Plus Info"],
						test: () =>
							endpoint.commandClasses["Z-Wave Plus Info"].get(),
					},
					{
						ccId: CommandClasses["Binary Switch"],
						test: () =>
							endpoint.commandClasses["Binary Switch"].get(),
					},
					{
						ccId: CommandClasses["Binary Sensor"],
						test: () =>
							endpoint.commandClasses["Binary Sensor"].get(),
					},
					{
						ccId: CommandClasses["Multilevel Switch"],
						test: () =>
							endpoint.commandClasses["Multilevel Switch"].get(),
					},
					{
						ccId: CommandClasses["Multilevel Sensor"],
						test: () =>
							endpoint.commandClasses["Multilevel Sensor"].get(),
					},
					// TODO: add other tests if necessary
				];

				const foundTest = possibleTests.find((t) =>
					endpoint.supportsCC(t.ccId)
				);
				if (foundTest) {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: endpoint.index,
						message:
							`is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Testing if it accepts secure commands anyways.`,
						level: "silly",
					});

					const { ccId, test } = foundTest;

					// Temporarily mark the CC as secure so we can use it to test
					endpoint.addCC(ccId, { secure: true });

					// Perform the test and treat errors as negative results
					const success = !!(await test().catch(() => false));

					if (success) {
						this.driver.controllerLog.logNode(this.id, {
							endpoint: endpoint.index,
							message:
								`Endpoint ${endpoint.index} accepts/expects secure commands`,
							level: "silly",
						});
						// Mark all endpoint CCs as secure
						for (const [ccId] of endpoint.getCCs()) {
							endpoint.addCC(ccId, { secure: true });
						}
					} else {
						this.driver.controllerLog.logNode(this.id, {
							endpoint: endpoint.index,
							message:
								`Endpoint ${endpoint.index} is actually not using S0`,
							level: "silly",
						});
						// Mark the CC as not secure again
						endpoint.addCC(ccId, { secure: false });
					}
				} else {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: endpoint.index,
						message:
							`is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Found no way to test if accepts secure commands anyways.`,
						level: "silly",
					});
				}
			}

			// This intentionally checks for Version CC support on the root device.
			// Endpoints SHOULD not support this CC, but we still need to query their
			// CCs that the root device may or may not support
			if (this.supportsCC(CommandClasses.Version)) {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: endpoint.index,
					message: `Endpoint ${endpoint.index} interview: ${
						getCCName(
							CommandClasses.Version,
						)
					}`,
					level: "silly",
				});

				const action = await interviewEndpoint(
					endpoint,
					CommandClasses.Version,
					true,
				);
				if (typeof action === "boolean") return action;
			} else {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: endpoint.index,
					message:
						"Version CC is not supported. Using the highest implemented version for each CC",
					level: "debug",
				});

				for (const [ccId, info] of endpoint.getCCs()) {
					if (
						info.isSupported
						// The support status of Basic CC is not known yet at this point
						|| ccId === CommandClasses.Basic
					) {
						endpoint.addCC(ccId, {
							version: getImplementedVersion(ccId),
						});
					}
				}
			}

			// The Security S0/S2 CC adds new CCs to the endpoint, so we need to once more remove those
			// that aren't actually properly supported by the device.
			this.applyCommandClassesCompatFlag(endpoint.index);

			// We need to add/remove some CCs based on other criteria
			this.modifySupportedCCBeforeInterview(endpoint);

			const endpointInterviewGraph = endpoint.buildCCInterviewGraph([
				CommandClasses.Security,
				CommandClasses["Security 2"],
				CommandClasses.Version,
				CommandClasses.Basic,
			]);
			let endpointInterviewOrder: CommandClasses[];
			try {
				endpointInterviewOrder = topologicalSort(
					endpointInterviewGraph,
				);
			} catch {
				// This interview cannot be done
				throw new ZWaveError(
					"The CC interview cannot be completed because there are circular dependencies between CCs!",
					ZWaveErrorCodes.CC_Invalid,
				);
			}

			this.driver.controllerLog.logNode(this.id, {
				endpoint: endpoint.index,
				message: `Endpoint ${endpoint.index} interview order: ${
					endpointInterviewOrder
						.map((cc) => `\n· ${getCCName(cc)}`)
						.join("")
				}`,
				level: "silly",
			});

			// Now that we know the correct order, do the interview in sequence
			for (const cc of endpointInterviewOrder) {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: endpoint.index,
					message: `Endpoint ${endpoint.index} interview: ${
						getCCName(
							cc,
						)
					}`,
					level: "silly",
				});

				const action = await interviewEndpoint(endpoint, cc);
				if (action === "continue") continue;
				else if (typeof action === "boolean") return action;
			}
		}

		// Continue with the application CCs for the root endpoint
		for (const cc of rootInterviewOrderAfterEndpoints) {
			this.driver.controllerLog.logNode(
				this.id,
				`Root device interview: ${getCCName(cc)}`,
				"silly",
			);

			const action = await interviewEndpoint(this, cc);
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		// At the very end, figure out if Basic CC is supposed to be supported
		// First on the root device
		const compat = this.deviceConfig?.compat;
		if (
			!this.wasCCRemovedViaConfig(CommandClasses.Basic)
			&& this.getCCVersion(CommandClasses.Basic) > 0
		) {
			if (this.maySupportBasicCC()) {
				// The device probably supports Basic CC and is allowed to.
				// Interview the Basic CC to figure out if it actually supports it
				this.driver.controllerLog.logNode(
					this.id,
					`Root device interview: ${getCCName(CommandClasses.Basic)}`,
					"silly",
				);

				const action = await interviewEndpoint(
					this,
					CommandClasses.Basic,
					true,
				);
				if (typeof action === "boolean") return action;
			} else {
				// Consider the device to control Basic CC, but only if we want to expose the currentValue
				if (
					compat?.mapBasicReport === false
					|| compat?.mapBasicSet === "report"
				) {
					// TODO: Figure out if we need to consider mapBasicSet === "auto" in the case where it falls back to Basic CC currentValue
					this.addCC(CommandClasses.Basic, { isControlled: true });
				}
			}
		}

		// Then on all endpoints
		for (const endpointIndex of this.getEndpointIndizes()) {
			const endpoint = this.getEndpoint(endpointIndex);
			if (!endpoint) continue;
			if (endpoint.wasCCRemovedViaConfig(CommandClasses.Basic)) continue;
			if (endpoint.getCCVersion(CommandClasses.Basic) === 0) continue;

			if (endpoint.maySupportBasicCC()) {
				// The endpoint probably supports Basic CC and is allowed to.
				// Interview the Basic CC to figure out if it actually supports it
				this.driver.controllerLog.logNode(this.id, {
					endpoint: endpoint.index,
					message: `Endpoint ${endpoint.index} interview: Basic CC`,
					level: "silly",
				});

				const action = await interviewEndpoint(
					endpoint,
					CommandClasses.Basic,
					true,
				);
				if (typeof action === "boolean") return action;
			} else {
				// Consider the device to control Basic CC, but only if we want to expose the currentValue
				if (
					compat?.mapBasicReport === false
					|| compat?.mapBasicSet === "report"
				) {
					// TODO: Figure out if we need to consider mapBasicSet === "auto" in the case where it falls back to Basic CC currentValue
					endpoint.addCC(CommandClasses.Basic, {
						isControlled: true,
					});
				}
			}
		}

		return true;
	}

	/**
	 * @internal
	 * Handles the receipt of a NIF / NodeUpdatePayload
	 */
	public updateNodeInfo(nodeInfo: NodeUpdatePayload): void {
		if (this.interviewStage < InterviewStage.NodeInfo) {
			for (const cc of nodeInfo.supportedCCs) {
				if (cc === CommandClasses.Basic) {
					// Basic CC MUST not be in the NIF and we have special rules to determine support
					continue;
				}
				this.addCC(cc, { isSupported: true });
			}
		}

		// As the NIF is sent on wakeup, treat this as a sign that the node is awake
		this.markAsAwake();

		// SDS14223 Unless unsolicited <XYZ> Report Commands are received,
		// a controlling node MUST probe the current values when the
		// supporting node issues a Wake Up Notification Command for sleeping nodes.

		// This is not the handler for wakeup notifications, but some legacy devices send this
		// message whenever there's an update and want to be polled.
		// We do this unless we know for certain that the device sends unsolicited reports for its actuator or sensor CCs
		if (
			this.interviewStage === InterviewStage.Complete
			&& !this.supportsCC(CommandClasses["Z-Wave Plus Info"])
			&& (!this.valueDB.getValue(AssociationCCValues.hasLifeline.id)
				|| !ccUtils.doesAnyLifelineSendActuatorOrSensorReports(
					this.driver,
					this,
				))
		) {
			const delay = this.deviceConfig?.compat?.manualValueRefreshDelayMs
				|| 0;
			this.driver.controllerLog.logNode(this.id, {
				message:
					`Node does not send unsolicited updates; refreshing actuator and sensor values${
						delay > 0 ? ` in ${delay} ms` : ""
					}...`,
			});
			setTimeout(() => this.refreshValues(), delay);
		}
	}

	/**
	 * Rediscovers all capabilities of a single CC on this node and all endpoints.
	 * This can be considered a more targeted variant of `refreshInfo`.
	 *
	 * WARNING: It is not recommended to await this method!
	 */
	public async interviewCC(cc: CommandClasses): Promise<void> {
		const endpoints = this.getAllEndpoints();
		// Interview the node itself last
		endpoints.push(endpoints.shift()!);
		for (const endpoint of endpoints) {
			const instance = endpoint.createCCInstanceUnsafe(cc);
			if (instance) {
				try {
					await instance.interview(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to interview CC ${
							getCCName(cc)
						}, endpoint ${endpoint.index}: ${getErrorMessage(e)}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Refreshes all non-static values of a single CC from this node (all endpoints).
	 * WARNING: It is not recommended to await this method!
	 */
	public async refreshCCValues(cc: CommandClasses): Promise<void> {
		for (const endpoint of this.getAllEndpoints()) {
			const instance = endpoint.createCCInstanceUnsafe(cc);
			if (instance) {
				try {
					await instance.refreshValues(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to refresh values for ${
							getCCName(
								cc,
							)
						}, endpoint ${endpoint.index}: ${getErrorMessage(e)}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Refreshes all non-static values from this node's actuator and sensor CCs.
	 * WARNING: It is not recommended to await this method!
	 */
	public async refreshValues(): Promise<void> {
		for (const endpoint of this.getAllEndpoints()) {
			for (const cc of endpoint.getSupportedCCInstances()) {
				// Only query actuator and sensor CCs
				if (
					!actuatorCCs.includes(cc.ccId)
					&& !sensorCCs.includes(cc.ccId)
				) {
					continue;
				}
				try {
					await cc.refreshValues(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(
						this.id,
						`failed to refresh values for ${
							getCCName(
								cc.ccId,
							)
						}, endpoint ${endpoint.index}: ${getErrorMessage(e)}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Refreshes the values of all CCs that should be reporting regularly, but haven't been updated recently
	 * @internal
	 */
	public async autoRefreshValues(): Promise<void> {
		// Do not attempt to communicate with dead nodes automatically
		if (this.status === NodeStatus.Dead) return;

		for (const endpoint of this.getAllEndpoints()) {
			for (
				const cc of endpoint
					.getSupportedCCInstances() as readonly SinglecastCC<
						CommandClass
					>[]
			) {
				if (!cc.shouldRefreshValues(this.driver)) continue;

				this.driver.controllerLog.logNode(this.id, {
					message: `${
						getCCName(
							cc.ccId,
						)
					} CC values may be stale, refreshing...`,
					endpoint: endpoint.index,
					direction: "outbound",
				});

				try {
					await cc.refreshValues(this.driver);
				} catch (e) {
					this.driver.controllerLog.logNode(this.id, {
						message: `failed to refresh values for ${
							getCCName(
								cc.ccId,
							)
						} CC: ${getErrorMessage(e)}`,
						endpoint: endpoint.index,
						level: "error",
					});
				}
			}
		}
	}

	/**
	 * Uses the `commandClasses` compat flag defined in the node's config file to
	 * override the reported command classes.
	 * @param endpointIndex If given, limits the application of the compat flag to the given endpoint.
	 */
	private applyCommandClassesCompatFlag(endpointIndex?: number): void {
		if (this.deviceConfig) {
			// Add CCs the device config file tells us to
			const addCCs = this.deviceConfig.compat?.addCCs;
			if (addCCs) {
				for (const [cc, { endpoints }] of addCCs) {
					if (endpointIndex === undefined) {
						for (const [ep, info] of endpoints) {
							this.getEndpoint(ep)?.addCC(cc, info);
						}
					} else if (endpoints.has(endpointIndex)) {
						this.getEndpoint(endpointIndex)?.addCC(
							cc,
							endpoints.get(endpointIndex)!,
						);
					}
				}
			}
			// And remove those that it marks as unsupported
			const removeCCs = this.deviceConfig.compat?.removeCCs;
			if (removeCCs) {
				for (const [cc, endpoints] of removeCCs) {
					if (endpoints === "*") {
						if (endpointIndex === undefined) {
							for (const ep of this.getAllEndpoints()) {
								ep.removeCC(cc);
							}
						} else {
							this.getEndpoint(endpointIndex)?.removeCC(cc);
						}
					} else {
						if (endpointIndex === undefined) {
							for (const ep of endpoints) {
								this.getEndpoint(ep)?.removeCC(cc);
							}
						} else if (endpoints.includes(endpointIndex)) {
							this.getEndpoint(endpointIndex)?.removeCC(cc);
						}
					}
				}
			}
		}
	}

	/**
	 * Updates the supported CCs of the given endpoint depending on compat flags
	 * and certification requirements
	 */
	private modifySupportedCCBeforeInterview(endpoint: Endpoint): void {
		// Window Covering CC:
		// CL:006A.01.51.01.2: A controlling node MUST NOT interview and provide controlling functionalities for the
		// Multilevel Switch Command Class for a node (or endpoint) supporting the Window Covering CC, as it is a fully
		// redundant and less precise application functionality.
		if (
			endpoint.supportsCC(CommandClasses["Multilevel Switch"])
			&& endpoint.supportsCC(CommandClasses["Window Covering"])
		) {
			endpoint.removeCC(CommandClasses["Multilevel Switch"]);
		}
	}

	/** Overwrites the reported configuration with information from a config file */
	protected async overwriteConfig(): Promise<void> {
		if (this.isControllerNode) {
			// The device config was not loaded prior to this step because the Version CC is not interviewed.
			// Therefore do it here.
			await this.loadDeviceConfig();
		}

		if (this.deviceConfig) {
			// Add CCs the device config file tells us to
			const addCCs = this.deviceConfig.compat?.addCCs;
			if (addCCs) {
				for (const [cc, { endpoints }] of addCCs) {
					for (const [ep, info] of endpoints) {
						this.getEndpoint(ep)?.addCC(cc, info);
					}
				}
			}
			// And remove those that it marks as unsupported
			const removeCCs = this.deviceConfig.compat?.removeCCs;
			if (removeCCs) {
				for (const [cc, endpoints] of removeCCs) {
					if (endpoints === "*") {
						for (const ep of this.getAllEndpoints()) {
							ep.removeCC(cc);
						}
					} else {
						for (const ep of endpoints) {
							this.getEndpoint(ep)?.removeCC(cc);
						}
					}
				}
			}
		}

		this.setInterviewStage(InterviewStage.OverwriteConfig);
	}

	/**
	 * @internal
	 * Handles a CommandClass that was received from this node
	 */
	public async handleCommand(command: CommandClass): Promise<void> {
		// If this is a report for the root endpoint and the node supports the CC on another endpoint,
		// we need to map it to endpoint 1. Either it does not support multi channel associations or
		// it is misbehaving. In any case, we would hide this report if we didn't map it
		if (
			command.endpointIndex === 0
			&& command.constructor.name.endsWith("Report")
			&& this.getEndpointCount() >= 1
			// Only map reports from the root device to an endpoint if we know which one
			&& this._deviceConfig?.compat?.mapRootReportsToEndpoint != undefined
		) {
			const endpoint = this.getEndpoint(
				this._deviceConfig?.compat?.mapRootReportsToEndpoint,
			);
			if (endpoint && endpoint.supportsCC(command.ccId)) {
				// Force the CC to store its values again under the supporting endpoint
				this.driver.controllerLog.logNode(
					this.id,
					`Mapping unsolicited report from root device to endpoint #${endpoint.index}`,
				);
				command.endpointIndex = endpoint.index;
				command.persistValues(this.driver);
			}
		}

		// If we're being queried by another node, treat this as a sign that the other node is awake
		if (
			command.constructor.name.endsWith("Get")
			// Nonces can be sent while asleep though
			&& !(command instanceof SecurityCCNonceGet)
			&& !(command instanceof Security2CCNonceGet)
		) {
			this.markAsAwake();
		}

		// If the received CC was force-removed via config file, ignore it completely
		const endpoint = this.getEndpoint(command.endpointIndex);
		if (endpoint?.wasCCRemovedViaConfig(command.ccId)) {
			this.driver.controllerLog.logNode(
				this.id,
				{
					endpoint: endpoint.index,
					direction: "inbound",
					message:
						`Ignoring ${command.constructor.name} because CC support was removed via config file`,
				},
			);
			return;
		}

		if (command instanceof BasicCC) {
			return this.handleBasicCommand(command);
		} else if (command instanceof MultilevelSwitchCC) {
			return this.handleMultilevelSwitchCommand(command);
		} else if (command instanceof BinarySwitchCCSet) {
			return this.handleBinarySwitchCommand(command);
		} else if (command instanceof ThermostatModeCCSet) {
			return this.handleThermostatModeCommand(command);
		} else if (command instanceof CentralSceneCCNotification) {
			return this.handleCentralSceneNotification(command);
		} else if (command instanceof WakeUpCCWakeUpNotification) {
			return this.handleWakeUpNotification();
		} else if (command instanceof NotificationCCReport) {
			return this.handleNotificationReport(command);
		} else if (command instanceof ClockCCReport) {
			return this.handleClockReport(command);
		} else if (command instanceof SecurityCCNonceGet) {
			return this.handleSecurityNonceGet();
		} else if (command instanceof SecurityCCNonceReport) {
			return this.handleSecurityNonceReport(command);
		} else if (command instanceof SecurityCCCommandsSupportedGet) {
			return this.handleSecurityCommandsSupportedGet(command);
		} else if (command instanceof Security2CCNonceGet) {
			return this.handleSecurity2NonceGet();
		} else if (command instanceof Security2CCNonceReport) {
			return this.handleSecurity2NonceReport(command);
		} else if (command instanceof Security2CCCommandsSupportedGet) {
			return this.handleSecurity2CommandsSupportedGet(command);
		} else if (command instanceof HailCC) {
			return this.handleHail(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCGet) {
			return this.handleUnexpectedFirmwareUpdateGet(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCMetaDataGet) {
			return this.handleFirmwareUpdateMetaDataGet(command);
		} else if (command instanceof EntryControlCCNotification) {
			return this.handleEntryControlNotification(command);
		} else if (command instanceof TimeCCTimeGet) {
			return this.handleTimeGet(command);
		} else if (command instanceof TimeCCDateGet) {
			return this.handleDateGet(command);
		} else if (command instanceof TimeCCTimeOffsetGet) {
			return this.handleTimeOffsetGet(command);
		} else if (command instanceof ZWavePlusCCGet) {
			return this.handleZWavePlusGet(command);
		} else if (command instanceof VersionCCGet) {
			return this.handleVersionGet(command);
		} else if (command instanceof VersionCCCommandClassGet) {
			return this.handleVersionCommandClassGet(command);
		} else if (command instanceof VersionCCCapabilitiesGet) {
			return this.handleVersionCapabilitiesGet(command);
		} else if (command instanceof ManufacturerSpecificCCGet) {
			return this.handleManufacturerSpecificGet(command);
		} else if (command instanceof AssociationGroupInfoCCNameGet) {
			return this.handleAGINameGet(command);
		} else if (command instanceof AssociationGroupInfoCCInfoGet) {
			return this.handleAGIInfoGet(command);
		} else if (command instanceof AssociationGroupInfoCCCommandListGet) {
			return this.handleAGICommandListGet(command);
		} else if (command instanceof AssociationCCSupportedGroupingsGet) {
			return this.handleAssociationSupportedGroupingsGet(command);
		} else if (command instanceof AssociationCCGet) {
			return this.handleAssociationGet(command);
		} else if (command instanceof AssociationCCSet) {
			return this.handleAssociationSet(command);
		} else if (command instanceof AssociationCCRemove) {
			return this.handleAssociationRemove(command);
		} else if (command instanceof AssociationCCSpecificGroupGet) {
			return this.handleAssociationSpecificGroupGet(command);
		} else if (
			command instanceof MultiChannelAssociationCCSupportedGroupingsGet
		) {
			return this.handleMultiChannelAssociationSupportedGroupingsGet(
				command,
			);
		} else if (command instanceof MultiChannelAssociationCCGet) {
			return this.handleMultiChannelAssociationGet(command);
		} else if (command instanceof MultiChannelAssociationCCSet) {
			return this.handleMultiChannelAssociationSet(command);
		} else if (command instanceof MultiChannelAssociationCCRemove) {
			return this.handleMultiChannelAssociationRemove(command);
		} else if (command instanceof IndicatorCCSupportedGet) {
			return this.handleIndicatorSupportedGet(command);
		} else if (command instanceof IndicatorCCSet) {
			return this.handleIndicatorSet(command);
		} else if (command instanceof IndicatorCCGet) {
			return this.handleIndicatorGet(command);
		} else if (command instanceof IndicatorCCDescriptionGet) {
			return this.handleIndicatorDescriptionGet(command);
		} else if (command instanceof PowerlevelCCSet) {
			return this.handlePowerlevelSet(command);
		} else if (command instanceof PowerlevelCCGet) {
			return this.handlePowerlevelGet(command);
		} else if (command instanceof PowerlevelCCTestNodeSet) {
			return this.handlePowerlevelTestNodeSet(command);
		} else if (command instanceof PowerlevelCCTestNodeGet) {
			return this.handlePowerlevelTestNodeGet(command);
		} else if (command instanceof PowerlevelCCTestNodeReport) {
			return this.handlePowerlevelTestNodeReport(command);
		} else if (command instanceof DeviceResetLocallyCCNotification) {
			return this.handleDeviceResetLocallyNotification(command);
		} else if (command instanceof InclusionControllerCCInitiate) {
			// Inclusion controller commands are handled by the controller class
			if (
				command.step === InclusionControllerStep.ProxyInclusionReplace
			) {
				return this.driver.controller
					.handleInclusionControllerCCInitiateReplace(
						command,
					);
			}
		} else if (command instanceof MultiCommandCCCommandEncapsulation) {
			// Handle each encapsulated command individually
			for (const cmd of command.encapsulated) {
				await this.handleCommand(cmd);
			}
			return;
		} else if (
			command instanceof Security2CCMessageEncapsulation
			&& command.encapsulated == undefined
		) {
			// Some S2 commands contain only extensions. Those are handled by the CC implementation.
			return;
		}

		// Ignore all commands that don't need to be handled
		switch (true) {
			// Reports are either a response to a Get command or
			// automatically store their values in the Value DB.
			// No need to manually handle them - other than what we've already done
			case command.constructor.name.endsWith("Report"):

			// When this command is received, its values get emitted as an event.
			// Nothing else to do here
			case command instanceof SceneActivationCCSet:
				return;
		}

		this.driver.controllerLog.logNode(this.id, {
			message: `TODO: no handler for application command`,
			direction: "inbound",
		});

		if (command.encapsulationFlags & EncapsulationFlags.Supervision) {
			// Report no support for supervised commands we cannot handle
			throw new ZWaveError(
				"No handler for application command",
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
	}

	private hasLoggedNoNetworkKey = false;

	/**
	 * @internal
	 * Handles a nonce request
	 */
	public async handleSecurityNonceGet(): Promise<void> {
		// Only reply if secure communication is set up
		if (!this.driver.securityManager) {
			if (!this.hasLoggedNoNetworkKey) {
				this.hasLoggedNoNetworkKey = true;
				this.driver.controllerLog.logNode(this.id, {
					message:
						`cannot reply to NonceGet because no network key was configured!`,
					direction: "inbound",
					level: "warn",
				});
			}
			return;
		}

		// When a node asks us for a nonce, it must support Security CC
		this.addCC(CommandClasses.Security, {
			isSupported: true,
			version: 1,
			// Security CC is always secure
			secure: true,
		});

		// Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
		const isNonceReport = (t: Transaction) =>
			t.message.getNodeId() === this.id
			&& isCommandClassContainer(t.message)
			&& t.message.command instanceof SecurityCCNonceReport;

		if (this.driver.hasPendingTransactions(isNonceReport)) {
			this.driver.controllerLog.logNode(this.id, {
				message:
					"in the process of replying to a NonceGet, won't send another NonceReport",
				level: "warn",
			});
			return;
		}

		// Delete all previous nonces we sent the node, since they should no longer be used
		this.driver.securityManager.deleteAllNoncesForReceiver(this.id);

		// Now send the current nonce
		try {
			await this.commandClasses.Security.sendNonce();
		} catch (e) {
			this.driver.controllerLog.logNode(this.id, {
				message: `failed to send nonce: ${getErrorMessage(e)}`,
				direction: "inbound",
			});
		}
	}

	/**
	 * Is called when a nonce report is received that does not belong to any transaction.
	 * The received nonce reports are stored as "free" nonces
	 */
	private handleSecurityNonceReport(command: SecurityCCNonceReport): void {
		const secMan = this.driver.securityManager;
		if (!secMan) return;

		secMan.setNonce(
			{
				issuer: this.id,
				nonceId: secMan.getNonceId(command.nonce),
			},
			{
				nonce: command.nonce,
				receiver: this.driver.controller.ownNodeId!,
			},
			{ free: true },
		);
	}

	/**
	 * @internal
	 * Handles a nonce request for S2
	 */
	public async handleSecurity2NonceGet(): Promise<void> {
		// Only reply if secure communication is set up
		if (!this.driver.getSecurityManager2(this.id)) {
			if (!this.hasLoggedNoNetworkKey) {
				this.hasLoggedNoNetworkKey = true;
				this.driver.controllerLog.logNode(this.id, {
					message:
						`cannot reply to NonceGet (S2) because no network key was configured!`,
					direction: "inbound",
					level: "warn",
				});
			}
			return;
		}

		// When a node asks us for a nonce, it must support Security 2 CC
		this.addCC(CommandClasses["Security 2"], {
			isSupported: true,
			version: 1,
			// Security 2 CC is always secure
			secure: true,
		});

		// Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
		const isNonceReport = (t: Transaction) =>
			t.message.getNodeId() === this.id
			&& isCommandClassContainer(t.message)
			&& t.message.command instanceof Security2CCNonceReport;

		if (this.driver.hasPendingTransactions(isNonceReport)) {
			this.driver.controllerLog.logNode(this.id, {
				message:
					"in the process of replying to a NonceGet, won't send another NonceReport",
				level: "warn",
			});
			return;
		}

		try {
			await this.commandClasses["Security 2"].sendNonce();
		} catch (e) {
			this.driver.controllerLog.logNode(this.id, {
				message: `failed to send nonce: ${getErrorMessage(e)}`,
				direction: "inbound",
			});
		}
	}

	/**
	 * Is called when a nonce report is received that does not belong to any transaction.
	 */
	private handleSecurity2NonceReport(_command: Security2CCNonceReport): void {
		// const secMan = this.driver.securityManager2;
		// if (!secMan) return;

		// This has the potential of resetting our SPAN state in the middle of a transaction which may expect it to be valid
		// So we probably shouldn't react here, and instead handle the NonceReport we'll get in response to the next command we send

		// if (command.SOS && command.receiverEI) {
		// 	// The node couldn't decrypt the last command we sent it. Invalidate
		// 	// the shared SPAN, since it did the same
		// 	secMan.storeRemoteEI(this.id, command.receiverEI);
		// }

		// Since we landed here, this is not in response to any command we sent
		this.driver.controllerLog.logNode(this.id, {
			message:
				`received S2 nonce without an active transaction, not sure what to do with it`,
			level: "warn",
			direction: "inbound",
		});
	}

	private busyPollingAfterHail: boolean = false;
	private async handleHail(_command: HailCC): Promise<void> {
		// treat this as a sign that the node is awake
		this.markAsAwake();

		if (this.busyPollingAfterHail) {
			this.driver.controllerLog.logNode(this.id, {
				message:
					`Hail received from node, but still busy with previous one...`,
			});
			return;
		}

		this.busyPollingAfterHail = true;
		this.driver.controllerLog.logNode(this.id, {
			message:
				`Hail received from node, refreshing actuator and sensor values...`,
		});
		try {
			await this.refreshValues();
		} catch {
			// ignore
		}
		this.busyPollingAfterHail = false;
	}

	/** Stores information about a currently held down key */
	private centralSceneKeyHeldDownContext:
		| {
			timeout: NodeJS.Timeout;
			sceneNumber: number;
		}
		| undefined;
	private lastCentralSceneNotificationSequenceNumber: number | undefined;
	private centralSceneForcedKeyUp = false;

	/** Handles the receipt of a Central Scene notifification */
	private handleCentralSceneNotification(
		command: CentralSceneCCNotification,
	): void {
		// Did we already receive this command?
		if (
			command.sequenceNumber
				=== this.lastCentralSceneNotificationSequenceNumber
		) {
			return;
		} else {
			this.lastCentralSceneNotificationSequenceNumber =
				command.sequenceNumber;
		}
		/*
		If the Slow Refresh field is false:
		- A new Key Held Down notification MUST be sent every 200ms until the key is released.
		- The Sequence Number field MUST be updated at each notification transmission.
		- If not receiving a new Key Held Down notification within 400ms, a controlling node SHOULD use an adaptive timeout approach as described in 4.17.1:
		A controller SHOULD apply an adaptive approach based on the reception of the Key Released Notification.
		Initially, the controller SHOULD time out if not receiving any Key Held Down Notification refresh after
		400ms and consider this to be a Key Up Notification. If, however, the controller subsequently receives a
		Key Released Notification, the controller SHOULD consider the sending node to be operating with the Slow
		Refresh capability enabled.

		If the Slow Refresh field is true:
		- A new Key Held Down notification MUST be sent every 55 seconds until the key is released.
		- The Sequence Number field MUST be updated at each notification refresh.
		- If not receiving a new Key Held Down notification within 60 seconds after the most recent Key Held Down
		notification, a receiving node MUST respond as if it received a Key Release notification.
		*/

		const setSceneValue = (
			sceneNumber: number,
			key: CentralSceneKeys,
		): void => {
			const valueId = CentralSceneCCValues.scene(sceneNumber).id;
			this.valueDB.setValue(valueId, key, { stateful: false });
		};

		const forceKeyUp = (): void => {
			this.centralSceneForcedKeyUp = true;
			// force key up event
			setSceneValue(
				this.centralSceneKeyHeldDownContext!.sceneNumber,
				CentralSceneKeys.KeyReleased,
			);
			// clear old timer
			clearTimeout(this.centralSceneKeyHeldDownContext!.timeout);
			// clear the key down context
			this.centralSceneKeyHeldDownContext = undefined;
		};

		if (
			this.centralSceneKeyHeldDownContext
			&& this.centralSceneKeyHeldDownContext.sceneNumber
				!== command.sceneNumber
		) {
			// The user pressed another button, force release
			forceKeyUp();
		}

		const slowRefreshValueId = CentralSceneCCValues.slowRefresh.endpoint(
			this.index,
		);
		if (command.keyAttribute === CentralSceneKeys.KeyHeldDown) {
			// Set or refresh timer to force a release of the key
			this.centralSceneForcedKeyUp = false;
			if (this.centralSceneKeyHeldDownContext) {
				clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
			}
			// If the node does not advertise support for the slow refresh capability, we might still be dealing with a
			// slow refresh node. We use the stored value for fallback behavior
			const slowRefresh = command.slowRefresh
				?? this.valueDB.getValue<boolean>(slowRefreshValueId);
			this.centralSceneKeyHeldDownContext = {
				sceneNumber: command.sceneNumber,
				// Unref'ing long running timers allows the process to exit mid-timeout
				timeout: setTimeout(
					forceKeyUp,
					slowRefresh ? 60000 : 400,
				).unref(),
			};
		} else if (command.keyAttribute === CentralSceneKeys.KeyReleased) {
			// Stop the release timer
			if (this.centralSceneKeyHeldDownContext) {
				clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
				this.centralSceneKeyHeldDownContext = undefined;
			} else if (this.centralSceneForcedKeyUp) {
				// If we timed out and the controller subsequently receives a Key Released Notification,
				// we SHOULD consider the sending node to be operating with the Slow Refresh capability enabled.
				this.valueDB.setValue(slowRefreshValueId, true);
				// Do not raise the duplicate event
				return;
			}
		}

		setSceneValue(command.sceneNumber, command.keyAttribute);
		this.driver.controllerLog.logNode(this.id, {
			message: `received CentralScene notification ${stringify(command)}`,
			direction: "inbound",
		});
	}

	/** The timestamp of the last received wakeup notification */
	private lastWakeUp: number | undefined;

	/** Handles the receipt of a Wake Up notification */
	private handleWakeUpNotification(): void {
		this.driver.controllerLog.logNode(this.id, {
			message: `received wakeup notification`,
			direction: "inbound",
		});

		// It can happen that the node has not told us that it supports the Wake Up CC
		// https://sentry.io/share/issue/6a681729d7db46d591f1dcadabe8d02e/
		// To avoid a crash, mark it as supported
		if (this.getCCVersion(CommandClasses["Wake Up"]) === 0) {
			this.addCC(CommandClasses["Wake Up"], {
				isSupported: true,
				version: 1,
			});
		}

		this.markAsAwake();

		// From the specs:
		// A controlling node SHOULD read the Wake Up Interval of a supporting node when the delays between
		// Wake Up periods are larger than what was last set at the supporting node.
		const now = Date.now();
		if (this.lastWakeUp) {
			// we've already measured the wake up interval, so we can check whether a refresh is necessary
			const wakeUpInterval =
				this.getValue<number>(WakeUpCCValues.wakeUpInterval.id) ?? 1;
			// The wakeup interval is specified in seconds. Also add 5 minutes tolerance to avoid
			// unnecessary queries since there might be some delay. A wakeup interval of 0 means manual wakeup,
			// so the interval shouldn't be verified
			if (
				wakeUpInterval > 0
				&& (now - this.lastWakeUp) / 1000 > wakeUpInterval + 5 * 60
			) {
				this.commandClasses["Wake Up"].getInterval().catch(() => {
					// Don't throw if there's an error
				});
			}
		}
		this.lastWakeUp = now;

		// Some legacy devices expect us to query them on wake up in order to function correctly
		if (this._deviceConfig?.compat?.queryOnWakeup) {
			void this.compatDoWakeupQueries();
		} else if (!this._deviceConfig?.compat?.disableAutoRefresh) {
			// For other devices we may have to refresh their values from time to time
			void this.autoRefreshValues().catch(() => {
				// ignore
			});
		}

		// In case there are no messages in the queue, the node may go back to sleep very soon
		this.driver.debounceSendNodeToSleep(this);
	}

	private async compatDoWakeupQueries(): Promise<void> {
		if (!this._deviceConfig?.compat?.queryOnWakeup) return;
		this.driver.controllerLog.logNode(this.id, {
			message: `expects some queries after wake up, so it shall receive`,
			direction: "none",
		});

		for (
			const [ccName, apiMethod, ...args] of this._deviceConfig.compat
				.queryOnWakeup
		) {
			this.driver.controllerLog.logNode(this.id, {
				message: `compat query "${ccName}"::${apiMethod}(${
					args
						.map((arg) => JSON.stringify(arg))
						.join(", ")
				})`,
				direction: "none",
			});

			// Try to access the API - if it doesn't work, skip this option
			let API: CCAPI;
			try {
				API = (
					(this.commandClasses as any)[ccName] as CCAPI
				).withOptions({
					// Tag the resulting transactions as compat queries
					tag: "compat",
					// Do not retry them or they may cause congestion if the node is asleep again
					maxSendAttempts: 1,
					// This is for a sleeping node - there's no point in keeping the transactions when the node is asleep
					expire: 10000,
				});
			} catch {
				this.driver.controllerLog.logNode(this.id, {
					message: `could not access API, skipping query`,
					direction: "none",
					level: "warn",
				});
				continue;
			}
			if (!API.isSupported()) {
				this.driver.controllerLog.logNode(this.id, {
					message: `API not supported, skipping query`,
					direction: "none",
					level: "warn",
				});
				continue;
			} else if (!(API as any)[apiMethod]) {
				this.driver.controllerLog.logNode(this.id, {
					message:
						`method ${apiMethod} not found on API, skipping query`,
					direction: "none",
					level: "warn",
				});
				continue;
			}

			// Retrieve the method
			// eslint-disable-next-line
			const method = (API as any)[apiMethod].bind(API) as Function;
			// And replace "smart" arguments with their corresponding value
			const methodArgs = args.map<unknown>((arg) => {
				if (isObject(arg)) {
					const valueId = {
						commandClass: API.ccId,
						...arg,
					};
					return this.getValue(valueId);
				}
				return arg;
			});

			// Do the API call and ignore/log any errors
			try {
				await method(...methodArgs);
				this.driver.controllerLog.logNode(this.id, {
					message: `API call successful`,
					direction: "none",
				});
			} catch (e) {
				this.driver.controllerLog.logNode(this.id, {
					message: `error during API call: ${getErrorMessage(e)}`,
					direction: "none",
					level: "warn",
				});
				if (
					isZWaveError(e)
					&& e.code === ZWaveErrorCodes.Controller_MessageExpired
				) {
					// A compat query expired - no point in trying the others too
					return;
				}
			}
		}
	}

	/** Handles the receipt of a BasicCC Set or Report */
	private handleBasicCommand(command: BasicCC): void {
		// Retrieve the endpoint the command is coming from
		const sourceEndpoint = this.getEndpoint(command.endpointIndex ?? 0)
			?? this;

		// Depending on the generic device class, we may need to map the basic command to other CCs
		let mappedTargetCC: CommandClass | undefined;
		switch (sourceEndpoint.deviceClass?.generic.key) {
			case 0x20: // Binary Sensor
				mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
					CommandClasses["Binary Sensor"],
				);
				break;
			case 0x10: // Binary Switch
				mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
					CommandClasses["Binary Switch"],
				);
				break;
			case 0x11: // Multilevel Switch
				mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
					CommandClasses["Multilevel Switch"],
				);
				break;
			case 0x12: // Remote Switch
				switch (sourceEndpoint.deviceClass.specific.key) {
					case 0x01: // Binary Remote Switch
						mappedTargetCC = sourceEndpoint
							.createCCInstanceUnsafe(
								CommandClasses["Binary Switch"],
							);
						break;
					case 0x02: // Multilevel Remote Switch
						mappedTargetCC = sourceEndpoint
							.createCCInstanceUnsafe(
								CommandClasses["Multilevel Switch"],
							);
						break;
				}
		}

		if (command instanceof BasicCCReport) {
			// By default, map Basic CC Reports to a more appropriate CC, unless stated otherwise in a config file
			const basicReportMapping = this.deviceConfig?.compat?.mapBasicReport
				?? "auto";

			if (basicReportMapping === "Binary Sensor") {
				// Treat the command as a BinarySensorCC Report, regardless of the device class
				mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
					CommandClasses["Binary Sensor"],
				);
				if (typeof command.currentValue === "number") {
					if (mappedTargetCC) {
						this.driver.controllerLog.logNode(this.id, {
							endpoint: command.endpointIndex,
							message:
								"treating BasicCC::Report as a BinarySensorCC::Report",
						});
						mappedTargetCC.setMappedBasicValue(
							this.driver,
							command.currentValue,
						);
					} else {
						this.driver.controllerLog.logNode(this.id, {
							endpoint: command.endpointIndex,
							message:
								"cannot treat BasicCC::Report as a BinarySensorCC::Report, because the Binary Sensor CC is not supported",
							level: "warn",
						});
					}
				} else {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: command.endpointIndex,
						message:
							"cannot map BasicCC::Report to a different CC, because the current value is unknown",
						level: "warn",
					});
				}
			} else if (
				basicReportMapping === "auto" || basicReportMapping === false
			) {
				// Try to set the mapped value on the target CC
				const didSetMappedValue =
					typeof command.currentValue === "number"
					// ... unless forbidden
					&& basicReportMapping === "auto"
					&& mappedTargetCC?.setMappedBasicValue(
						this.driver,
						command.currentValue,
					);

				// Otherwise fall back to setting it ourselves
				if (!didSetMappedValue) {
					// Store the value in the value DB now
					command.persistValues(this.driver);
				}
			}
		} else if (command instanceof BasicCCSet) {
			// By default, map Basic CC Set to Basic CC Report, unless stated otherwise in a config file
			const basicSetMapping = this.deviceConfig?.compat?.mapBasicSet
				?? "report";

			if (basicSetMapping === "event") {
				// Treat BasicCCSet as value events if desired
				this.driver.controllerLog.logNode(this.id, {
					endpoint: command.endpointIndex,
					message: "treating BasicCC::Set as a value event",
				});
				this._valueDB.setValue(
					BasicCCValues.compatEvent.endpoint(
						command.endpointIndex,
					),
					command.targetValue,
					{
						stateful: false,
					},
				);
			} else if (basicSetMapping === "Binary Sensor") {
				// Treat the Set command as a BinarySensorCC Report, regardless of the device class
				mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(
					CommandClasses["Binary Sensor"],
				);
				if (mappedTargetCC) {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: command.endpointIndex,
						message:
							"treating BasicCC::Set as a BinarySensorCC::Report",
					});
					mappedTargetCC.setMappedBasicValue(
						this.driver,
						command.targetValue,
					);
				} else {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: command.endpointIndex,
						message:
							"cannot treat BasicCC::Set as a BinarySensorCC::Report, because the Binary Sensor CC is not supported",
						level: "warn",
					});
				}
			} else if (
				!this.deviceConfig?.compat?.mapBasicSet
				&& !!(command.encapsulationFlags
					& EncapsulationFlags.Supervision)
			) {
				// A controller MUST not support Basic CC per the specifications. While we can interpret its contents,
				// we MUST respond to supervised Basic CC Set with "no support".
				// All known devices that use BasicCCSet for reporting send it unsupervised, so this should be safe to do.
				if (
					command.encapsulationFlags & EncapsulationFlags.Supervision
				) {
					throw new ZWaveError(
						"Basic CC is not supported",
						ZWaveErrorCodes.CC_NotSupported,
					);
				}
			} else if (
				basicSetMapping === "auto" || basicSetMapping === "report"
			) {
				// Some devices send their current state using BasicCCSet to their associations
				// instead of using reports. We still interpret them like reports
				this.driver.controllerLog.logNode(this.id, {
					endpoint: command.endpointIndex,
					message: "treating BasicCC::Set as a report",
				});

				// In "auto" mode, try to set the mapped value on the target CC first
				const didSetMappedValue = basicSetMapping === "auto"
					&& !!mappedTargetCC?.setMappedBasicValue(
						this.driver,
						command.targetValue,
					);

				// Otherwise handle the command ourselves
				if (!didSetMappedValue) {
					// Basic Set commands cannot store their value automatically, so store the values manually
					this._valueDB.setValue(
						BasicCCValues.currentValue.endpoint(
							command.endpointIndex,
						),
						command.targetValue,
					);
					// Since the node sent us a Basic Set, we are sure that it is at least controlled
					// Add it to the support list, so the information lands in the network cache
					if (!sourceEndpoint.controlsCC(CommandClasses.Basic)) {
						sourceEndpoint.addCC(CommandClasses.Basic, {
							isControlled: true,
						});
					}
				}
			}
		}
	}

	/** Handles the receipt of a MultilevelCC Set or Report */
	private handleMultilevelSwitchCommand(command: MultilevelSwitchCC): void {
		const endpoint = this.getEndpoint(command.endpointIndex ?? 0) ?? this;

		if (command instanceof MultilevelSwitchCCSet) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message: "treating MultiLevelSwitchCCSet::Set as a value event",
			});
			this._valueDB.setValue(
				MultilevelSwitchCCValues.compatEvent.endpoint(
					command.endpointIndex,
				),
				command.targetValue,
				{
					stateful: false,
				},
			);
		} else if (command instanceof MultilevelSwitchCCStartLevelChange) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message:
					"treating MultilevelSwitchCC::StartLevelChange as a notification",
			});
			this.emit(
				"notification",
				endpoint,
				CommandClasses["Multilevel Switch"],
				{
					eventType: MultilevelSwitchCommand.StartLevelChange,
					eventTypeLabel: "Start level change",
					direction: command.direction,
				},
			);
		} else if (command instanceof MultilevelSwitchCCStopLevelChange) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message:
					"treating MultilevelSwitchCC::StopLevelChange as a notification",
			});
			this.emit(
				"notification",
				endpoint,
				CommandClasses["Multilevel Switch"],
				{
					eventType: MultilevelSwitchCommand.StopLevelChange,
					eventTypeLabel: "Stop level change",
				},
			);
		}
	}

	private handleBinarySwitchCommand(command: BinarySwitchCC): void {
		// Treat BinarySwitchCCSet as a report if desired
		if (
			command instanceof BinarySwitchCCSet
			&& this._deviceConfig?.compat?.treatSetAsReport?.has(
				command.constructor.name,
			)
		) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message: "treating BinarySwitchCC::Set as a report",
			});
			this._valueDB.setValue(
				BinarySwitchCCValues.currentValue.endpoint(
					command.endpointIndex,
				),
				command.targetValue,
			);
		}
	}

	private handleThermostatModeCommand(command: ThermostatModeCC): void {
		// Treat ThermostatModeCCSet as a report if desired
		if (
			command instanceof ThermostatModeCCSet
			&& this._deviceConfig?.compat?.treatSetAsReport?.has(
				command.constructor.name,
			)
		) {
			this.driver.controllerLog.logNode(this.id, {
				endpoint: command.endpointIndex,
				message: "treating ThermostatModeCC::Set as a report",
			});
			this._valueDB.setValue(
				ThermostatModeCCValues.thermostatMode.endpoint(
					command.endpointIndex,
				),
				command.mode,
			);
		}
	}

	private async handleZWavePlusGet(command: ZWavePlusCCGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		await endpoint
			.createAPI(CommandClasses["Z-Wave Plus Info"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			})
			.sendReport({
				zwavePlusVersion: 2,
				roleType: ZWavePlusRoleType.CentralStaticController,
				nodeType: ZWavePlusNodeType.Node,
				installerIcon: this.driver.options.vendor?.installerIcon
					?? 0x0500, // Generic Gateway
				userIcon: this.driver.options.vendor?.userIcon ?? 0x0500, // Generic Gateway
			});
	}

	private async handleVersionGet(command: VersionCCGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Version, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		const firmwareVersion1 = semver.parse(libVersion, { loose: true })!;

		await api.sendReport({
			libraryType: ZWaveLibraryTypes["Static Controller"],
			protocolVersion: this.driver.controller.protocolVersion!,
			firmwareVersions: [
				// Firmware 0 is the Z-Wave chip firmware
				this.driver.controller.firmwareVersion!,
				// Firmware 1 is Z-Wave JS itself
				`${firmwareVersion1.major}.${firmwareVersion1.minor}.${firmwareVersion1.patch}`,
			],
			hardwareVersion: this.driver.options.vendor?.hardwareVersion,
		});
	}

	private async handleVersionCommandClassGet(
		command: VersionCCCommandClassGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Version, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		await api.reportCCVersion(command.requestedCC);
	}

	private async handleVersionCapabilitiesGet(
		command: VersionCCCapabilitiesGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Version, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		await api.reportCapabilities();
	}

	private async handleManufacturerSpecificGet(
		command: ManufacturerSpecificCCGet,
	): Promise<void> {
		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = this
			.createAPI(CommandClasses["Manufacturer Specific"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		await api.sendReport({
			manufacturerId: this.driver.options.vendor?.manufacturerId
				?? 0xffff, // Reserved manufacturer ID, definitely invalid!
			productType: this.driver.options.vendor?.productType ?? 0xffff,
			productId: this.driver.options.vendor?.productId ?? 0xffff,
		});
	}

	private async handleAGINameGet(
		command: AssociationGroupInfoCCNameGet,
	): Promise<void> {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Association Group Information"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		await api.reportGroupName(1, "Lifeline");
	}

	private async handleAGIInfoGet(
		command: AssociationGroupInfoCCInfoGet,
	): Promise<void> {
		if (!command.listMode && command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Association Group Information"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		await api.reportGroupInfo({
			isListMode: command.listMode ?? false,
			hasDynamicInfo: false,
			groups: [
				{
					groupId: 1,
					eventCode: 0, // ignored anyways
					profile: AssociationGroupInfoProfile["General: Lifeline"],
					mode: 0, // ignored anyways
				},
			],
		});
	}

	private async handleAGICommandListGet(
		command: AssociationGroupInfoCCCommandListGet,
	): Promise<void> {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Association Group Information"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		await api.reportCommands(
			command.groupId,
			new Map([
				[
					CommandClasses["Device Reset Locally"],
					[DeviceResetLocallyCommand.Notification],
				],
			]),
		);
	}

	private async handleAssociationSupportedGroupingsGet(
		command: AssociationCCSupportedGroupingsGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Association, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		// We only "support" the lifeline group
		await api.reportGroupCount(1);
	}

	private async handleAssociationGet(
		command: AssociationCCGet,
	): Promise<void> {
		// We only "support" the lifeline group
		const groupId = 1;

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Association, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		const nodeIds =
			this.driver.controller.associations.filter((a) =>
				a.endpoint == undefined
			)
				.map((a) => a.nodeId) ?? [];

		await api.sendReport({
			groupId,
			maxNodes: MAX_ASSOCIATIONS,
			nodeIds,
			reportsToFollow: 0,
		});
	}

	private handleAssociationSet(command: AssociationCCSet): void {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group.
			throw new ZWaveError(
				`Association group ${command.groupId} is not supported.`,
				ZWaveErrorCodes.CC_OperationFailed,
			);
		}

		// Ignore associations that already exist
		const newAssociations = command.nodeIds.filter((newNodeId) =>
			!this.driver.controller.associations.some(
				({ nodeId, endpoint }) =>
					endpoint === undefined && nodeId === newNodeId,
			)
		).map((nodeId) => ({ nodeId }));

		const associations = [...this.driver.controller.associations];
		associations.push(...newAssociations);

		// Report error if the association group is already full
		if (associations.length > MAX_ASSOCIATIONS) {
			throw new ZWaveError(
				`Association group ${command.groupId} is full`,
				ZWaveErrorCodes.CC_OperationFailed,
			);
		}
		this.driver.controller.associations = associations;
	}

	private handleAssociationRemove(command: AssociationCCRemove): void {
		// Allow accessing the lifeline group or all groups (which is the same)
		if (!!command.groupId && command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		if (!command.nodeIds?.length) {
			// clear
			this.driver.controller.associations = [];
		} else {
			this.driver.controller.associations = this.driver.controller
				.associations.filter(
					({ nodeId, endpoint }) =>
						endpoint === undefined
						&& !command.nodeIds!.includes(nodeId),
				);
		}
	}

	private async handleAssociationSpecificGroupGet(
		command: AssociationCCSpecificGroupGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Association, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		// We don't support this feature.
		// It is RECOMMENDED that the value 0 is returned by non-supporting devices.
		await api.reportSpecificGroup(0);
	}

	private async handleMultiChannelAssociationSupportedGroupingsGet(
		command: MultiChannelAssociationCCSupportedGroupingsGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Multi Channel Association"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		// We only "support" the lifeline group
		await api.reportGroupCount(1);
	}

	private async handleMultiChannelAssociationGet(
		command: MultiChannelAssociationCCGet,
	): Promise<void> {
		// We only "support" the lifeline group
		const groupId = 1;

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses["Multi Channel Association"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		const nodeIds =
			this.driver.controller.associations.filter((a) =>
				a.endpoint == undefined
			)
				.map((a) => a.nodeId) ?? [];
		const endpoints =
			this.driver.controller.associations.filter((a) =>
				a.endpoint != undefined
			)
				.map(({ nodeId, endpoint }) => ({
					nodeId,
					endpoint: endpoint!,
				}))
				?? [];

		await api.sendReport({
			groupId,
			maxNodes: MAX_ASSOCIATIONS,
			nodeIds,
			endpoints,
			reportsToFollow: 0,
		});
	}

	private handleMultiChannelAssociationSet(
		command: MultiChannelAssociationCCSet,
	): void {
		if (command.groupId !== 1) {
			// We only "support" the lifeline group.
			throw new ZWaveError(
				`Multi Channel Association group ${command.groupId} is not supported.`,
				ZWaveErrorCodes.CC_OperationFailed,
			);
		}

		// Ignore associations that already exists
		const newNodeIdAssociations = command.nodeIds.filter((newNodeId) =>
			!this.driver.controller.associations.some(
				({ nodeId, endpoint }) =>
					endpoint === undefined && nodeId === newNodeId,
			)
		).map((nodeId) => ({ nodeId }));
		const newEndpointAssociations = command.endpoints.flatMap(
			({ nodeId, endpoint }) => {
				if (typeof endpoint === "number") {
					return { nodeId, endpoint };
				} else {
					return endpoint.map((e) => ({ nodeId, endpoint: e }));
				}
			},
		).filter(({ nodeId: newNodeId, endpoint: newEndpoint }) =>
			!this.driver.controller.associations.some(({ nodeId, endpoint }) =>
				nodeId === newNodeId && endpoint === newEndpoint
			)
		);

		const associations = [...this.driver.controller.associations];
		associations.push(...newNodeIdAssociations, ...newEndpointAssociations);

		// Report error if the association group is already full
		if (associations.length > MAX_ASSOCIATIONS) {
			throw new ZWaveError(
				`Multi Channel Association group ${command.groupId} is full`,
				ZWaveErrorCodes.CC_OperationFailed,
			);
		}

		this.driver.controller.associations = associations.slice(
			0,
			MAX_ASSOCIATIONS,
		);
	}

	private handleMultiChannelAssociationRemove(
		command: MultiChannelAssociationCCRemove,
	): void {
		// Allow accessing the lifeline group or all groups (which is the same)
		if (!!command.groupId && command.groupId !== 1) {
			// We only "support" the lifeline group
			return;
		}

		if (!command.nodeIds?.length && !command.endpoints?.length) {
			// Clear all associations
			this.driver.controller.associations = [];
		} else {
			let associations = [...this.driver.controller.associations];
			if (command.nodeIds?.length) {
				associations = associations.filter(
					({ nodeId, endpoint }) =>
						endpoint === undefined
						&& !command.nodeIds!.includes(nodeId),
				);
			}
			if (command.endpoints?.length) {
				associations = associations.filter(
					({ nodeId, endpoint }) =>
						!command.endpoints!.some((dest) =>
							dest.nodeId === nodeId && dest.endpoint === endpoint
						),
				);
			}
			this.driver.controller.associations = associations;
		}
	}

	private handleIndicatorSupportedGet(
		command: IndicatorCCSupportedGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Indicator, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		switch (command.indicatorId) {
			case 0:
			// 0 must be answered with the first supported indicator ID.
			// We only support identify (0x50)
			case 0x50:
				// Identify
				return api.reportSupported(0x50, [0x03, 0x04, 0x05], 0);
			default:
				// A supporting node receiving a non-zero Indicator ID that is
				// not supported MUST set all fields to 0x00 in the returned response.
				return api.reportSupported(0, [], 0);
		}
	}

	private handleIndicatorSet(command: IndicatorCCSet): void {
		// We only support "identify"
		if (command.values?.length !== 3) return;
		const [v1, v2, v3] = command.values;
		if (v1.indicatorId !== 0x50 || v1.propertyId !== 0x03) return;
		if (v2.indicatorId !== 0x50 || v2.propertyId !== 0x04) return;
		if (v3.indicatorId !== 0x50 || v3.propertyId !== 0x05) return;

		// This isn't really sane, but since we only support a single indicator, it's fine
		const store = this.driver.controller.indicatorValues;
		store.set(0x50, [v1, v2, v3]);

		this.driver.controllerLog.logNode(this.id, {
			message: "Received identify command",
			direction: "inbound",
		});

		this.driver.controller.emit("identify", this);
	}

	private async handleIndicatorGet(command: IndicatorCCGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Indicator, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		// We only support "identify"
		if (command.indicatorId === 0x50) {
			const values = this.driver.controller.indicatorValues.get(0x50) ?? [
				{ indicatorId: 0x50, propertyId: 0x03, value: 0 },
				{ indicatorId: 0x50, propertyId: 0x04, value: 0 },
				{ indicatorId: 0x50, propertyId: 0x05, value: 0 },
			];
			await api.sendReport({ values });
		} else if (typeof command.indicatorId === "number") {
			// V2+ report
			await api.sendReport({
				values: [
					{
						indicatorId: command.indicatorId,
						propertyId: 0,
						value: 0,
					},
				],
			});
		} else {
			// V1+ report
			await api.sendReport({ value: 0 });
		}
	}

	private async handleIndicatorDescriptionGet(
		command: IndicatorCCDescriptionGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Indicator, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		// We only support "identify" (0x50) and requests for indicators outside the 0x80...0x9f range
		// MUST return an Indicator Description Report with the Description Length set to 0.
		// So we can just always do that.
		await api.reportDescription(command.indicatorId, "");
	}

	private handlePowerlevelSet(command: PowerlevelCCSet): void {
		// Check if the powerlevel is valid
		if (!(command.powerlevel in Powerlevel)) {
			throw new ZWaveError(
				`Invalid powerlevel ${command.powerlevel}.`,
				ZWaveErrorCodes.CC_OperationFailed,
			);
		}

		// CC:0073.01.01.11.001: A supporting node MAY decide not to change its actual Tx configuration.
		// In any case, the value received in this Command MUST be returned in a Powerlevel Report Command
		// in response to a Powerlevel Get Command as if the power setting was accepted for the indicated duration.
		this.driver.controller.powerlevel = {
			powerlevel: command.powerlevel,
			until: command.timeout
				? new Date(Date.now() + command.timeout * 1000)
				: new Date(),
		};
	}

	private async handlePowerlevelGet(command: PowerlevelCCGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Powerlevel, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		const { powerlevel, until } = this.driver.controller.powerlevel;

		if (
			// Setting elapsed
			until.getTime() < Date.now()
			// or it is already set to normal power
			|| powerlevel === Powerlevel["Normal Power"]
		) {
			await api.reportPowerlevel({
				powerlevel: Powerlevel["Normal Power"],
			});
		} else {
			const timeoutSeconds = Math.max(
				0,
				Math.min(
					Math.round((until.getTime() - Date.now()) / 1000),
					255,
				),
			);

			await api.reportPowerlevel({
				powerlevel,
				timeout: timeoutSeconds,
			});
		}
	}

	private async handlePowerlevelTestNodeSet(
		command: PowerlevelCCTestNodeSet,
	): Promise<void> {
		// Check if the powerlevel is valid
		if (!(command.powerlevel in Powerlevel)) {
			throw new ZWaveError(
				`Invalid powerlevel ${command.powerlevel}.`,
				ZWaveErrorCodes.CC_OperationFailed,
			);
		} else if (command.testFrameCount < 1) {
			throw new ZWaveError(
				"testFrameCount must be at least 1",
				ZWaveErrorCodes.CC_OperationFailed,
			);
		}

		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Powerlevel, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		try {
			const acknowledgedFrames = await this.driver.sendNOPPowerFrames(
				command.testNodeId,
				command.powerlevel,
				command.testFrameCount,
			);
			// Test results are in, send report
			void api.sendNodeTestReport({
				status: acknowledgedFrames > 0
					? PowerlevelTestStatus.Success
					: PowerlevelTestStatus.Failed,
				testNodeId: command.testNodeId,
				acknowledgedFrames,
			}).catch(noop);
		} catch {
			// Test failed for some reason (e.g. invalid node)
			void api.sendNodeTestReport({
				status: PowerlevelTestStatus.Failed,
				testNodeId: command.testNodeId,
				acknowledgedFrames: 0,
			}).catch(noop);
		}
	}

	private async handlePowerlevelTestNodeGet(
		command: PowerlevelCCTestNodeGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		const api = endpoint
			.createAPI(CommandClasses.Powerlevel, false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags: command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			});

		const status = this.driver.getNOPPowerTestStatus();

		if (status) {
			await api.sendNodeTestReport({
				status: status.inProgress
					? PowerlevelTestStatus["In Progress"]
					: status.acknowledgedFrames > 0
					? PowerlevelTestStatus.Success
					: PowerlevelTestStatus.Failed,
				...status,
			});
		} else {
			// No test was done
			await api.sendNodeTestReport({
				status: PowerlevelTestStatus.Success,
				testNodeId: 0,
				acknowledgedFrames: 0,
			});
		}
	}

	private handlePowerlevelTestNodeReport(
		command: PowerlevelCCTestNodeReport,
	): void {
		// Notify listeners
		this.emit(
			"notification",
			this,
			CommandClasses.Powerlevel,
			pick(command, ["testNodeId", "status", "acknowledgedFrames"]),
		);
	}

	private async handleSecurityCommandsSupportedGet(
		command: SecurityCCCommandsSupportedGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		if (this.getHighestSecurityClass() === SecurityClass.S0_Legacy) {
			const { supportedCCs } = determineNIF();
			await endpoint.commandClasses.Security.reportSupportedCommands(
				supportedCCs,
				// We don't report controlled CCs
				[],
			);
		} else {
			// S0 is not the highest class. Return an empty list
			await endpoint.commandClasses.Security.reportSupportedCommands(
				[],
				[],
			);
		}
	}

	private async handleSecurity2CommandsSupportedGet(
		command: Security2CCCommandsSupportedGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const highestSecurityClass = this.getHighestSecurityClass();
		const actualSecurityClass = (
			command.getEncapsulatingCC(
				CommandClasses["Security 2"],
				Security2Command.MessageEncapsulation,
			) as Security2CCMessageEncapsulation | undefined
		)?.securityClass;

		if (
			highestSecurityClass !== undefined
			&& highestSecurityClass === actualSecurityClass
		) {
			// The command was received using the highest security class. Return the list of supported CCs

			const implementedCCs = allCCs.filter((cc) =>
				getImplementedVersion(cc) > 0
			);

			// Encapsulation CCs are always supported
			const implementedEncapsulationCCs = encapsulationCCs.filter(
				(cc) =>
					implementedCCs.includes(cc)
					// A node MUST advertise support for Multi Channel Command Class only if it implements End Points.
					// A node able to communicate using the Multi Channel encapsulation but implementing no End Point
					// MUST NOT advertise support for the Multi Channel Command Class.
					// --> We do not implement end points
					&& cc !== CommandClasses["Multi Channel"],
			);

			const supportedCCs = new Set([
				// DT:00.11.0004.1
				// All Root Devices or nodes MUST support:
				// - Association, version 2
				// - Association Group Information
				// - Device Reset Locally
				// - Firmware Update Meta Data, version 5
				// - Indicator, version 3
				// - Manufacturer Specific
				// - Multi Channel Association, version 3
				// - Powerlevel
				// - Security 2
				// - Supervision
				// - Transport Service, version 2
				// - Version, version 2
				// - Z-Wave Plus Info, version 2
				CommandClasses.Association,
				CommandClasses["Association Group Information"],
				CommandClasses["Device Reset Locally"],
				CommandClasses["Firmware Update Meta Data"],
				CommandClasses.Indicator,
				CommandClasses["Manufacturer Specific"],
				CommandClasses["Multi Channel Association"],
				CommandClasses.Powerlevel,
				CommandClasses.Version,
				CommandClasses["Z-Wave Plus Info"],

				// Generic Controller device type has no additional support requirements,
				// but we also support the following command classes:
				CommandClasses["Inclusion Controller"],

				// plus encapsulation CCs, which are part of the above requirement
				...implementedEncapsulationCCs.filter(
					(cc) =>
						// CC:009F.01.0E.11.00F
						// The Security 0 and Security 2 Command Class MUST NOT be advertised in this command
						// The Transport Service Command Class MUST NOT be advertised in this command.
						cc !== CommandClasses.Security
						&& cc !== CommandClasses["Security 2"]
						&& cc !== CommandClasses["Transport Service"],
				),
			]);

			// Commands that are always in the NIF should not appear in the
			// S2 commands supported report
			const commandsInNIF = new Set(determineNIF().supportedCCs);
			const supportedCommandsNotInNIF = [...supportedCCs].filter((cc) =>
				!commandsInNIF.has(cc)
			);

			await endpoint.commandClasses["Security 2"].reportSupportedCommands(
				supportedCommandsNotInNIF,
			);
		} else if (securityClassIsS2(actualSecurityClass)) {
			// The command was received using a lower security class. Return an empty list
			await endpoint.commandClasses["Security 2"]
				.withOptions({
					s2OverrideSecurityClass: actualSecurityClass,
				})
				.reportSupportedCommands([]);
		} else {
			// Do not respond
		}
	}

	private handleDeviceResetLocallyNotification(
		_cmd: DeviceResetLocallyCCNotification,
	): void {
		// Handling this command can take a few seconds and require communication with the node.
		// If it was received with Supervision, we need to acknowledge it immediately. Therefore
		// defer the handling half a second.

		setTimeout(async () => {
			this.driver.controllerLog.logNode(this.id, {
				message: `The node was reset locally, removing it`,
				direction: "inbound",
			});

			try {
				await this.driver.controller.removeFailedNodeInternal(
					this.id,
					RemoveNodeReason.Reset,
				);
			} catch (e) {
				this.driver.controllerLog.logNode(this.id, {
					message: `removing the node failed: ${
						getErrorMessage(
							e,
						)
					}`,
					level: "error",
				});
			}
		}, 500);
	}

	/**
	 * Allows automatically resetting notification values to idle if the node does not do it itself
	 */
	private notificationIdleTimeouts = new Map<string, NodeJS.Timeout>();
	/** Schedules a notification value to be reset */
	private scheduleNotificationIdleReset(
		valueId: ValueID,
		handler: () => void,
	): void {
		this.clearNotificationIdleReset(valueId);
		const key = valueIdToString(valueId);
		this.notificationIdleTimeouts.set(
			key,
			// Unref'ing long running timeouts allows to quit the application before the timeout elapses
			setTimeout(handler, 5 * 60 * 1000 /* 5 minutes */).unref(),
		);
	}

	/** Removes a scheduled notification reset */
	private clearNotificationIdleReset(valueId: ValueID): void {
		const key = valueIdToString(valueId);
		if (this.notificationIdleTimeouts.has(key)) {
			clearTimeout(this.notificationIdleTimeouts.get(key));
			this.notificationIdleTimeouts.delete(key);
		}
	}

	// Fallback for V2 notifications that don't allow us to predefine the metadata during the interview.
	// Instead of defining useless values for each possible notification event, we build the metadata on demand
	private extendNotificationValueMetadata(
		valueId: ValueID,
		notification: Notification,
		valueConfig: NotificationState,
	) {
		const ccVersion = this.driver.getSupportedCCVersion(
			CommandClasses.Notification,
			this.id,
			this.index,
		);
		if (ccVersion === 2 || !this.valueDB.hasMetadata(valueId)) {
			const metadata = getNotificationValueMetadata(
				this.valueDB.getMetadata(valueId) as
					| ValueMetadataNumeric
					| undefined,
				notification,
				valueConfig,
			);
			this.valueDB.setMetadata(valueId, metadata);
		}
	}

	/**
	 * Manually resets a single notification value to idle.
	 */
	public manuallyIdleNotificationValue(valueId: ValueID): void;

	public manuallyIdleNotificationValue(
		notificationType: number,
		prevValue: number,
		endpointIndex?: number,
	): void;

	public manuallyIdleNotificationValue(
		notificationTypeOrValueID: number | ValueID,
		prevValue?: number,
		endpointIndex: number = 0,
	): void {
		let notificationType: number | undefined;
		if (typeof notificationTypeOrValueID === "number") {
			notificationType = notificationTypeOrValueID;
		} else {
			notificationType = this.valueDB.getMetadata(
				notificationTypeOrValueID,
			)?.ccSpecific?.notificationType as number | undefined;
			if (notificationType === undefined) {
				return;
			}
			prevValue = this.valueDB.getValue(notificationTypeOrValueID);
			endpointIndex = notificationTypeOrValueID.endpoint ?? 0;
		}

		if (
			!this.getEndpoint(endpointIndex)?.supportsCC(
				CommandClasses.Notification,
			)
		) {
			return;
		}

		const notification = getNotification(notificationType);
		if (!notification) return;

		return this.manuallyIdleNotificationValueInternal(
			notification,
			prevValue!,
			endpointIndex,
		);
	}

	/** Manually resets a single notification value to idle */
	private manuallyIdleNotificationValueInternal(
		notification: Notification,
		prevValue: number,
		endpointIndex: number,
	): void {
		const valueConfig = getNotificationValue(notification, prevValue);
		// Only known variables may be reset to idle
		if (!valueConfig || valueConfig.type !== "state") return;
		// Some properties may not be reset to idle
		if (!valueConfig.idle) return;

		const notificationName = notification.name;
		const variableName = valueConfig.variableName;
		const valueId = NotificationCCValues.notificationVariable(
			notificationName,
			variableName,
		).endpoint(endpointIndex);

		// Make sure the value is actually set to the previous value
		if (this.valueDB.getValue(valueId) !== prevValue) return;

		// Since the node has reset the notification itself, we don't need the idle reset
		this.clearNotificationIdleReset(valueId);
		this.extendNotificationValueMetadata(
			valueId,
			notification,
			valueConfig,
		);
		this.valueDB.setValue(valueId, 0 /* idle */);
	}

	/**
	 * Handles the receipt of a Notification Report
	 */
	private handleNotificationReport(command: NotificationCCReport): void {
		if (command.notificationType == undefined) {
			if (command.alarmType == undefined) {
				this.driver.controllerLog.logNode(this.id, {
					message: `received unsupported notification ${
						stringify(
							command,
						)
					}`,
					direction: "inbound",
				});
			}
			return;
		}

		const ccVersion = getEffectiveCCVersion(this.driver, command);

		// Look up the received notification in the config
		const notification = getNotification(command.notificationType);

		if (notification) {
			// This is a notification (status or event) with a known type
			const notificationName = notification.name;

			this.driver.controllerLog.logNode(this.id, {
				message:
					`[handleNotificationReport] notificationName: ${notificationName}`,
				level: "silly",
			});

			/** Returns a single notification state to idle */
			const setStateIdle = (prevValue: number): void => {
				this.manuallyIdleNotificationValueInternal(
					notification,
					prevValue,
					command.endpointIndex,
				);
			};

			const setUnknownStateIdle = (prevValue?: number) => {
				// Find the value for the unknown notification variable bucket
				const unknownNotificationVariableValueId = NotificationCCValues
					.unknownNotificationVariable(
						command.notificationType!,
						notificationName,
					).endpoint(command.endpointIndex);
				const currentValue = this.valueDB.getValue(
					unknownNotificationVariableValueId,
				);
				// ... and if it exists
				if (currentValue == undefined) return;
				// ... reset it to idle
				if (prevValue == undefined || currentValue === prevValue) {
					this.valueDB.setValue(
						unknownNotificationVariableValueId,
						0, /* idle */
					);
				}
			};

			const value = command.notificationEvent!;
			if (value === 0) {
				// Generic idle notification, this contains a value to be reset
				if (
					Buffer.isBuffer(command.eventParameters)
					&& command.eventParameters.length
				) {
					// The target value is the first byte of the event parameters
					setStateIdle(command.eventParameters[0]);
					setUnknownStateIdle(command.eventParameters[0]);
				} else {
					// Reset all values to idle
					const nonIdleValues = this.valueDB
						.getValues(CommandClasses.Notification)
						.filter(
							(v) =>
								(v.endpoint || 0) === command.endpointIndex
								&& v.property === notificationName
								&& typeof v.value === "number"
								&& v.value !== 0,
						);
					for (const v of nonIdleValues) {
						setStateIdle(v.value as number);
					}
					setUnknownStateIdle();
				}
				return;
			}

			// Find out which property we need to update
			const valueConfig = getNotificationValue(notification, value);

			if (valueConfig) {
				this.driver.controllerLog.logNode(this.id, {
					message: `[handleNotificationReport] valueConfig:
  label: ${valueConfig.label}
  ${
						valueConfig.type === "event"
							? "type: event"
							: `type: state
  variableName: ${valueConfig.variableName}`
					}`,
					level: "silly",
				});
			} else {
				this.driver.controllerLog.logNode(this.id, {
					message:
						`[handleNotificationReport] valueConfig: undefined`,
					level: "silly",
				});
			}

			// Perform some heuristics on the known notification
			this.handleKnownNotification(command);

			let allowIdleReset: boolean;
			if (!valueConfig) {
				// We don't know what this notification refers to, so we don't force a reset
				allowIdleReset = false;
			} else if (valueConfig.type === "state") {
				allowIdleReset = valueConfig.idle;
			} else {
				// This is an event
				const endpoint = this.getEndpoint(command.endpointIndex)
					?? this;
				this.emit(
					"notification",
					endpoint,
					CommandClasses.Notification,
					{
						type: command.notificationType,
						event: value,
						label: notification.name,
						eventLabel: valueConfig.label,
						parameters: command.eventParameters,
					},
				);

				// We may need to reset some linked states to idle
				if (valueConfig.idleVariables?.length) {
					for (const variable of valueConfig.idleVariables) {
						setStateIdle(variable);
					}
				}
				return;
			}

			// Now that we've gathered all we need to know, update the value in our DB
			let valueId: ValueID;
			if (valueConfig) {
				valueId = NotificationCCValues.notificationVariable(
					notificationName,
					valueConfig.variableName,
				).endpoint(command.endpointIndex);

				this.extendNotificationValueMetadata(
					valueId,
					notification,
					valueConfig,
				);
			} else {
				// Collect unknown values in an "unknown" bucket
				const unknownValue = NotificationCCValues
					.unknownNotificationVariable(
						command.notificationType,
						notificationName,
					);
				valueId = unknownValue.endpoint(command.endpointIndex);

				if (ccVersion >= 2) {
					if (!this.valueDB.hasMetadata(valueId)) {
						this.valueDB.setMetadata(valueId, unknownValue.meta);
					}
				}
			}
			if (typeof command.eventParameters === "number") {
				// This notification contains an enum value. Depending on how the enum behaves,
				// we may need to set "fake" values for these to distinguish them
				// from states without enum values
				const enumBehavior = valueConfig
					? getNotificationEnumBehavior(
						notification,
						valueConfig,
					)
					: "extend";

				const valueWithEnum = enumBehavior === "replace"
					? command.eventParameters
					: getNotificationStateValueWithEnum(
						value,
						command.eventParameters,
					);
				this.valueDB.setValue(valueId, valueWithEnum);
			} else {
				this.valueDB.setValue(valueId, value);
			}

			// Nodes before V8 (and some misbehaving V8 ones) don't necessarily reset the notification to idle.
			// The specifications advise to auto-reset the variables, but it has been found that this interferes
			// with some motion sensors that don't refresh their active notification. Therefore, we set a fallback
			// timer if the `forceNotificationIdleReset` compat flag is set.
			if (
				allowIdleReset
				&& !!this._deviceConfig?.compat?.forceNotificationIdleReset
			) {
				this.driver.controllerLog.logNode(this.id, {
					message: `[handleNotificationReport] scheduling idle reset`,
					level: "silly",
				});
				this.scheduleNotificationIdleReset(
					valueId,
					() => setStateIdle(value),
				);
			}
		} else {
			// This is an unknown notification
			const unknownValue = NotificationCCValues.unknownNotificationType(
				command.notificationType,
			);
			const valueId = unknownValue.endpoint(command.endpointIndex);

			// Make sure the metdata exists
			if (ccVersion >= 2) {
				if (!this.valueDB.hasMetadata(valueId)) {
					this.valueDB.setMetadata(valueId, unknownValue.meta);
				}
			}

			// And set its value
			this.valueDB.setValue(valueId, command.notificationEvent);
			// We don't know what this notification refers to, so we don't force a reset
		}
	}

	private handleKnownNotification(command: NotificationCCReport): void {
		const lockEvents = [0x01, 0x03, 0x05, 0x09];
		const unlockEvents = [0x02, 0x04, 0x06];
		const doorStatusEvents = [
			// Actual status
			0x16,
			0x17,
			// Synthetic status with enum
			0x1600,
			0x1601,
		];
		if (
			// Access Control, manual/keypad/rf/auto (un)lock operation
			command.notificationType === 0x06
			&& (lockEvents.includes(command.notificationEvent as number)
				|| unlockEvents.includes(command.notificationEvent as number))
			&& (this.supportsCC(CommandClasses["Door Lock"])
				|| this.supportsCC(CommandClasses.Lock))
		) {
			// The Door Lock Command Class is constrained to the S2 Access Control key,
			// while the Notification Command Class, in the same device, could use a
			// different key. This way the device can notify devices which don't belong
			// to the S2 Access Control key group of changes in its state.

			const isLocked = lockEvents.includes(
				command.notificationEvent as number,
			);

			// Update the current lock status
			if (this.supportsCC(CommandClasses["Door Lock"])) {
				this.valueDB.setValue(
					DoorLockCCValues.currentMode.endpoint(
						command.endpointIndex,
					),
					isLocked ? DoorLockMode.Secured : DoorLockMode.Unsecured,
				);
			}
			if (this.supportsCC(CommandClasses.Lock)) {
				this.valueDB.setValue(
					LockCCValues.locked.endpoint(command.endpointIndex),
					isLocked,
				);
			}
		} else if (
			command.notificationType === 0x06
			&& doorStatusEvents.includes(command.notificationEvent as number)
		) {
			// https://github.com/zwave-js/node-zwave-js/pull/5394 added support for
			// notification enums. Unfortunately, there's no way to discover which nodes
			// actually support them, which makes working with the Door state variable
			// very cumbersome. Also, this is currently the only notification where the enum values
			// extend the state value.

			// To work around this, we hard-code a notification value for the door status
			// which only includes the "legacy" states for open/closed.
			this.valueDB.setValue(
				NotificationCCValues.doorStateSimple.endpoint(
					command.endpointIndex,
				),
				command.notificationEvent === 0x17 ? 0x17 : 0x16,
			);

			// In addition to that, we also hard-code a notification value for only the tilt status.
			// This will only be created after receiving a notification for the tilted state.
			// Only after it exists, it will be updated. Otherwise, we'd get phantom
			// values, since some devices send the enum value, even when they don't support tilt.
			const tiltValue = NotificationCCValues.doorTiltState;
			const tiltValueId = tiltValue.endpoint(command.endpointIndex);
			let tiltValueWasCreated = this.valueDB.hasMetadata(tiltValueId);
			if (command.eventParameters === 0x01 && !tiltValueWasCreated) {
				this.valueDB.setMetadata(tiltValueId, tiltValue.meta);
				tiltValueWasCreated = true;
			}
			if (tiltValueWasCreated) {
				this.valueDB.setValue(
					tiltValueId,
					command.eventParameters === 0x01 ? 0x01 : 0x00,
				);
			}
		}
	}

	private busySettingClock: boolean = false;
	private async handleClockReport(command: ClockCCReport): Promise<void> {
		if (this.busySettingClock) return;

		// A Z-Wave Plus node SHOULD issue a Clock Report Command via the Lifeline Association Group if they
		// suspect to have inaccurate time and/or weekdays (e.g. after battery removal).
		// A controlling node SHOULD compare the received time and weekday with its current time and set the
		// time again at the supporting node if a deviation is observed (e.g. different weekday or more than a
		// minute difference)

		// A sending node knowing the current time with seconds precision SHOULD round its
		// current time to the nearest minute when sending this command.
		let now = new Date();
		const seconds = now.getSeconds();
		if (seconds >= 30) {
			now = new Date(now.getTime() + (60 - seconds) * 1000);
		}

		// Get desired time in local time
		const hours = now.getHours();
		const minutes = now.getMinutes();
		// Sunday is 0 in JS, but 7 in Z-Wave
		let weekday = now.getDay();
		if (weekday === 0) weekday = 7;

		if (
			command.weekday !== weekday
			|| command.hour !== hours
			|| command.minute !== minutes
		) {
			const endpoint = this.driver.tryGetEndpoint(command);
			if (!endpoint /*|| !endpoint.commandClasses.Clock.isSupported()*/) {
				// Make sure the endpoint supports the CC (GH#1704)
				return;
			}

			this.driver.controllerLog.logNode(
				this.id,
				`detected a deviation of the node's clock, updating it...`,
			);
			this.busySettingClock = true;
			try {
				await endpoint.commandClasses.Clock.set(
					hours,
					minutes,
					weekday,
				);
			} catch {
				// ignore
			}
			this.busySettingClock = false;
		}
	}

	private async handleTimeGet(command: TimeCCTimeGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const seconds = now.getSeconds();

		try {
			// We are being queried, so the device may actually not support the CC, just control it.
			// Using the commandClasses property would throw in that case
			const api = endpoint
				.createAPI(CommandClasses.Time, false)
				.withOptions({
					// Answer with the same encapsulation as asked, but omit
					// Supervision as it shouldn't be used for Get-Report flows
					encapsulationFlags: command.encapsulationFlags
						& ~EncapsulationFlags.Supervision,
				});
			await api.reportTime(hours, minutes, seconds);
		} catch (e: any) {
			this.driver.controllerLog.logNode(this.id, {
				message: e.message,
				level: "error",
			});
			// ignore
		}
	}

	private async handleDateGet(command: TimeCCDateGet): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const day = now.getDate();

		try {
			// We are being queried, so the device may actually not support the CC, just control it.
			// Using the commandClasses property would throw in that case
			const api = endpoint
				.createAPI(CommandClasses.Time, false)
				.withOptions({
					// Answer with the same encapsulation as asked, but omit
					// Supervision as it shouldn't be used for Get-Report flows
					encapsulationFlags: command.encapsulationFlags
						& ~EncapsulationFlags.Supervision,
				});
			await api.reportDate(year, month, day);
		} catch (e: any) {
			this.driver.controllerLog.logNode(this.id, {
				message: e.message,
				level: "error",
			});
			// ignore
		}
	}

	private async handleTimeOffsetGet(
		command: TimeCCTimeOffsetGet,
	): Promise<void> {
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;

		const timezone = getDSTInfo(new Date());

		try {
			// We are being queried, so the device may actually not support the CC, just control it.
			// Using the commandClasses property would throw in that case
			const api = endpoint
				.createAPI(CommandClasses.Time, false)
				.withOptions({
					// Answer with the same encapsulation as asked, but omit
					// Supervision as it shouldn't be used for Get-Report flows
					encapsulationFlags: command.encapsulationFlags
						& ~EncapsulationFlags.Supervision,
				});
			await api.reportTimezone(timezone);
		} catch {
			// ignore
		}
	}

	/**
	 * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
	 * This method uses cached information from the most recent interview.
	 */
	public getFirmwareUpdateCapabilitiesCached(): FirmwareUpdateCapabilities {
		const firmwareUpgradable = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.firmwareUpgradable.id,
		);
		const supportsActivation = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.supportsActivation.id,
		);
		const continuesToFunction = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.continuesToFunction.id,
		);
		const additionalFirmwareIDs = this.getValue<number[]>(
			FirmwareUpdateMetaDataCCValues.additionalFirmwareIDs.id,
		);
		const supportsResuming = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.supportsResuming.id,
		);
		const supportsNonSecureTransfer = this.getValue<boolean>(
			FirmwareUpdateMetaDataCCValues.supportsNonSecureTransfer.id,
		);

		// Ensure all information was queried
		if (
			!firmwareUpgradable
			|| !isArray(additionalFirmwareIDs)
		) {
			return { firmwareUpgradable: false };
		}

		return {
			firmwareUpgradable: true,
			// TODO: Targets are not the list of IDs - maybe expose the IDs as well?
			firmwareTargets: new Array(1 + additionalFirmwareIDs.length).fill(0)
				.map((_, i) => i),
			continuesToFunction,
			supportsActivation,
			supportsResuming,
			supportsNonSecureTransfer,
		};
	}

	/**
	 * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
	 * This communicates with the node to retrieve fresh information.
	 */
	public async getFirmwareUpdateCapabilities(): Promise<
		FirmwareUpdateCapabilities
	> {
		const api = this.commandClasses["Firmware Update Meta Data"];
		const meta = await api.getMetaData();
		if (!meta) {
			throw new ZWaveError(
				`Failed to request firmware update capabilities: The node did not respond in time!`,
				ZWaveErrorCodes.Controller_NodeTimeout,
			);
		} else if (!meta.firmwareUpgradable) {
			return {
				firmwareUpgradable: false,
			};
		}

		return {
			firmwareUpgradable: true,
			// TODO: Targets are not the list of IDs - maybe expose the IDs as well?
			firmwareTargets: new Array(1 + meta.additionalFirmwareIDs.length)
				.fill(0).map((_, i) => i),
			continuesToFunction: meta.continuesToFunction,
			supportsActivation: meta.supportsActivation,
			supportsResuming: meta.supportsResuming,
			supportsNonSecureTransfer: meta.supportsNonSecureTransfer,
		};
	}

	private recentEntryControlNotificationSequenceNumbers: number[] = [];
	private handleEntryControlNotification(
		command: EntryControlCCNotification,
	): void {
		if (
			!this._deviceConfig?.compat?.disableStrictEntryControlDataValidation
		) {
			if (
				this.recentEntryControlNotificationSequenceNumbers.includes(
					command.sequenceNumber,
				)
			) {
				this.driver.controllerLog.logNode(
					this.id,
					`Received duplicate Entry Control Notification (sequence number ${command.sequenceNumber}), ignoring...`,
					"warn",
				);
				return;
			}

			// Keep track of the last 5 sequence numbers
			this.recentEntryControlNotificationSequenceNumbers.unshift(
				command.sequenceNumber,
			);
			if (this.recentEntryControlNotificationSequenceNumbers.length > 5) {
				this.recentEntryControlNotificationSequenceNumbers.pop();
			}
		}

		// Notify listeners
		const endpoint = this.getEndpoint(command.endpointIndex) ?? this;
		this.emit("notification", endpoint, CommandClasses["Entry Control"], {
			...pick(command, ["eventType", "dataType", "eventData"]),
			eventTypeLabel: entryControlEventTypeLabels[command.eventType],
			dataTypeLabel: getEnumMemberName(
				EntryControlDataTypes,
				command.dataType,
			),
		});
	}

	/**
	 * @internal
	 * Deserializes the information of this node from a cache.
	 */
	public async deserialize(): Promise<void> {
		if (!this.driver.networkCache) return;

		// Restore the device config
		await this.loadDeviceConfig();

		// Mark already-interviewed nodes as potentially ready
		if (this.interviewStage === InterviewStage.Complete) {
			this.readyMachine.send("RESTART_FROM_CACHE");
		}
	}

	/**
	 * Instructs the node to send powerlevel test frames to the other node using the given powerlevel. Returns how many frames were acknowledged during the test.
	 *
	 * **Note:** Depending on the number of test frames, this may take a while
	 */
	public async testPowerlevel(
		testNodeId: number,
		powerlevel: Powerlevel,
		healthCheckTestFrameCount: number,
		onProgress?: (acknowledged: number, total: number) => void,
	): Promise<number> {
		const api = this.commandClasses.Powerlevel;

		// Keep sleeping nodes awake
		const wasKeptAwake = this.keepAwake;
		if (this.canSleep) this.keepAwake = true;
		const result = <T>(value: T) => {
			// And undo the change when we're done
			this.keepAwake = wasKeptAwake;
			return value;
		};

		// Start the process
		await api.startNodeTest(
			testNodeId,
			powerlevel,
			healthCheckTestFrameCount,
		);

		// Each frame will take a few ms to be sent, let's assume 5 per second
		// to estimate how long the test will take
		const expectedDurationMs = Math.round(
			(healthCheckTestFrameCount / 5) * 1000,
		);

		// Poll the status of the test regularly, but not too frequently. Especially for quick tests, polling too often
		// increases the likelyhood of us querying the node at the same time it sends an unsolicited update.
		// If using Security S2, this can cause a desync.
		const pollFrequencyMs = expectedDurationMs >= 60000 ? 20000 : 5000;

		// Track how often we failed to get a response from the node, so we can abort if the connection is too bad
		let continuousErrors = 0;
		// Also track how many times in a row there was no progress, which also indicates a bad connection
		let previousProgress = 0;
		while (true) {
			// The node might send an unsolicited update when it finishes the test
			const report = await this.driver
				.waitForCommand<PowerlevelCCTestNodeReport>(
					(cc) =>
						cc.nodeId === this.id
						&& cc instanceof PowerlevelCCTestNodeReport,
					pollFrequencyMs,
				)
				.catch(() => undefined);

			const status = report
				? pick(report, ["status", "acknowledgedFrames"])
				// If it didn't come in the wait time, poll for an update
				: await api.getNodeTestStatus().catch(() => undefined);

			// Safeguard against infinite loop:
			// If we didn't get a result, or there was no progress, try again next iteration
			if (
				!status
				|| (status.status === PowerlevelTestStatus["In Progress"]
					&& status.acknowledgedFrames === previousProgress)
			) {
				if (continuousErrors > 5) return result(0);
				continuousErrors++;
				continue;
			} else {
				previousProgress = status.acknowledgedFrames;
				continuousErrors = 0;
			}

			if (status.status === PowerlevelTestStatus.Failed) {
				return result(0);
			} else if (status.status === PowerlevelTestStatus.Success) {
				return result(status.acknowledgedFrames);
			} else if (onProgress) {
				// Notify the caller of the test progress
				onProgress(
					status.acknowledgedFrames,
					healthCheckTestFrameCount,
				);
			}
		}
	}

	private _healthCheckInProgress: boolean = false;
	/**
	 * Returns whether a health check is currently in progress for this node
	 */
	public isHealthCheckInProgress(): boolean {
		return this._healthCheckInProgress;
	}

	private _healthCheckAborted: boolean = false;
	private _abortHealthCheckPromise: DeferredPromise<void> | undefined;

	/**
	 * Aborts an ongoing health check if one is currently in progress.
	 *
	 * **Note:** The health check may take a few seconds to actually be aborted.
	 * When it is, the promise returned by {@link checkLifelineHealth} or
	 * {@link checkRouteHealth} will be resolved with the results obtained so far.
	 */
	public abortHealthCheck(): void {
		if (!this._healthCheckInProgress) return;
		this._healthCheckAborted = true;
		this._abortHealthCheckPromise?.resolve();
	}

	/**
	 * Checks the health of connection between the controller and this node and returns the results.
	 */
	public async checkLifelineHealth(
		rounds: number = 5,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: LifelineHealthCheckResult,
		) => void,
	): Promise<LifelineHealthCheckSummary> {
		if (this._healthCheckInProgress) {
			throw new ZWaveError(
				"A health check is already in progress for this node!",
				ZWaveErrorCodes.HealthCheck_Busy,
			);
		}

		if (rounds > 10 || rounds < 1) {
			throw new ZWaveError(
				"The number of health check rounds must be between 1 and 10!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		try {
			this._healthCheckInProgress = true;
			this._healthCheckAborted = false;
			this._abortHealthCheckPromise = createDeferredPromise();

			return await this.checkLifelineHealthInternal(rounds, onProgress);
		} finally {
			this._healthCheckInProgress = false;
			this._healthCheckAborted = false;
			this._abortHealthCheckPromise = undefined;
		}
	}

	private async checkLifelineHealthInternal(
		rounds: number,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: LifelineHealthCheckResult,
		) => void,
	): Promise<LifelineHealthCheckSummary> {
		// No. of pings per round
		const start = Date.now();

		/** Computes a health rating from a health check result */
		const computeRating = (result: LifelineHealthCheckResult) => {
			const failedPings = Math.max(
				result.failedPingsController ?? 0,
				result.failedPingsNode,
			);
			const numNeighbors = result.numNeighbors;
			const minPowerlevel = result.minPowerlevel ?? Powerlevel["-6 dBm"];
			const snrMargin = result.snrMargin ?? 17;
			const latency = result.latency;

			if (failedPings === 10) return 0;
			if (failedPings > 2) return 1;
			if (failedPings === 2 || latency > 1000) return 2;
			if (failedPings === 1 || latency > 500) return 3;
			if (latency > 250) return 4;
			if (latency > 100) return 5;
			if (minPowerlevel < Powerlevel["-6 dBm"] || snrMargin < 17) {
				// Lower powerlevel reductions (= higher power) have lower numeric values
				if (numNeighbors == undefined) return 7; // ZWLR has no neighbors
				return numNeighbors > 2 ? 7 : 6;
			}
			if (numNeighbors != undefined && numNeighbors <= 2) return 8; // ZWLR has no neighbors
			if (latency > 50) return 9;
			return 10;
		};

		this.driver.controllerLog.logNode(
			this.id,
			`Starting lifeline health check (${rounds} round${
				rounds !== 1 ? "s" : ""
			})...`,
		);

		const results: LifelineHealthCheckResult[] = [];
		const aborted = () => {
			this.driver.controllerLog.logNode(
				this.id,
				`Lifeline health check aborted`,
			);
			if (results.length === 0) {
				return {
					rating: 0,
					results: [],
				};
			} else {
				return {
					rating: Math.min(...results.map((r) => r.rating)),
					results,
				};
			}
		};

		if (this.canSleep && this.status !== NodeStatus.Awake) {
			// Wait for node to wake up to avoid incorrectly long delays in the first health check round
			this.driver.controllerLog.logNode(
				this.id,
				`waiting for node to wake up...`,
			);
			await Promise.race([
				this.waitForWakeup(),
				this._abortHealthCheckPromise,
			]);
			if (this._healthCheckAborted) return aborted();
		}

		for (let round = 1; round <= rounds; round++) {
			if (this._healthCheckAborted) return aborted();

			// Determine the number of repeating neighbors for Z-Wave Classic
			let numNeighbors: number | undefined;
			if (this.protocol === Protocols.ZWave) {
				numNeighbors = (await this.driver.controller.getNodeNeighbors(
					this.id,
					true,
				)).length;
			}

			// Ping the node 10x, measuring the RSSI
			let txReport: TXReport | undefined;
			let routeChanges: number | undefined;
			let rssi: RSSI | undefined;
			let channel: number | undefined;
			let snrMargin: number | undefined;
			let failedPingsNode = 0;
			let latency = 0;
			const pingAPI = this.commandClasses["No Operation"].withOptions({
				// Don't change the node status when the ACK is missing. We're likely testing the limits here.
				changeNodeStatusOnMissingACK: false,
				// Avoid using explorer frames, because they can create a ton of delay
				transmitOptions: TransmitOptions.ACK
					| TransmitOptions.AutoRoute,
				// And remember the transmit report, so we can evaluate it
				onTXReport: (report) => {
					txReport = report;
				},
			});

			for (let i = 1; i <= healthCheckTestFrameCount; i++) {
				if (this._healthCheckAborted) return aborted();

				const start = Date.now();
				// Reset TX report before each ping
				txReport = undefined as any;
				const pingResult = await pingAPI.send().then(
					() => true,
					() => false,
				);
				const rtt = Date.now() - start;
				latency = Math.max(
					latency,
					txReport ? txReport.txTicks * 10 : rtt,
				);
				if (!pingResult) {
					failedPingsNode++;
				} else if (txReport) {
					routeChanges ??= 0;
					if (txReport.routingAttempts > 1) {
						routeChanges++;
					}

					if (
						txReport.ackRSSI != undefined
						&& !isRssiError(txReport.ackRSSI)
					) {
						// If possible, determine the SNR margin from the report
						if (
							txReport.measuredNoiseFloor != undefined
							&& !isRssiError(txReport.measuredNoiseFloor)
						) {
							const currentSNRMargin = txReport.ackRSSI
								- txReport.measuredNoiseFloor;
							// And remember it if it's the lowest we've seen so far
							if (
								snrMargin == undefined
								|| currentSNRMargin < snrMargin
							) {
								snrMargin = currentSNRMargin;
							}
						}
						// Also remember the worst RSSI and the channel it was received on
						if (rssi == undefined || txReport.ackRSSI < rssi) {
							rssi = txReport.ackRSSI;
							channel = txReport.ackChannelNo;
						}
					}
				}
			}

			// If possible, compute the SNR margin from the test results,
			// unless it could already be determined from the transmit reports
			if (
				snrMargin == undefined
				&& rssi != undefined
				&& rssi < RssiError.NoSignalDetected
				&& channel != undefined
			) {
				const backgroundRSSI = await this.driver.controller
					.getBackgroundRSSI();
				if (`rssiChannel${channel}` in backgroundRSSI) {
					const bgRSSI = (backgroundRSSI as any)[
						`rssiChannel${channel}`
					];
					if (isRssiError(bgRSSI)) {
						if (bgRSSI === RssiError.ReceiverSaturated) {
							// RSSI is too high to measure, so there can't be any margin left
							snrMargin = 0;
						} else if (bgRSSI === RssiError.NoSignalDetected) {
							// It is very quiet, assume -128 dBm
							snrMargin = rssi + 128;
						} else {
							snrMargin = undefined;
						}
					} else {
						snrMargin = rssi - bgRSSI;
					}
				}
			}

			const ret: LifelineHealthCheckResult = {
				latency,
				failedPingsNode,
				numNeighbors,
				routeChanges,
				snrMargin,
				rating: 0,
			};

			// Now instruct the node to ping the controller, figuring out the minimum powerlevel
			if (this.supportsCC(CommandClasses.Powerlevel)) {
				// Do a binary search and find the highest reduction in powerlevel for which there are no errors
				let failedPingsController = 0;

				const executor = async (powerlevel: Powerlevel) => {
					// Abort the search if the health check was aborted
					if (this._healthCheckAborted) return undefined;

					this.driver.controllerLog.logNode(
						this.id,
						`Sending ${healthCheckTestFrameCount} pings to controller at ${
							getEnumMemberName(
								Powerlevel,
								powerlevel,
							)
						}...`,
					);
					const result = await this.testPowerlevel(
						this.driver.controller.ownNodeId!,
						powerlevel,
						healthCheckTestFrameCount,
					);
					failedPingsController = healthCheckTestFrameCount - result;
					this.driver.controllerLog.logNode(
						this.id,
						`At ${
							getEnumMemberName(
								Powerlevel,
								powerlevel,
							)
						}, ${result}/${healthCheckTestFrameCount} pings were acknowledged...`,
					);

					// Wait a second for things to settle down
					await wait(1000);

					return failedPingsController === 0;
				};
				try {
					const powerlevel = await discreteLinearSearch(
						Powerlevel["Normal Power"], // minimum reduction
						Powerlevel["-9 dBm"], // maximum reduction
						executor,
					);
					if (this._healthCheckAborted) return aborted();

					if (powerlevel == undefined) {
						// There were still failures at normal power, report it
						ret.minPowerlevel = Powerlevel["Normal Power"];
						ret.failedPingsController = failedPingsController;
					} else {
						ret.minPowerlevel = powerlevel;
					}
				} catch (e) {
					if (
						isZWaveError(e)
						&& e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						// The node is dead, treat this as a failure
						ret.minPowerlevel = Powerlevel["Normal Power"];
						ret.failedPingsController = healthCheckTestFrameCount;
					} else {
						throw e;
					}
				}
			}

			ret.rating = computeRating(ret);
			results.push(ret);
			onProgress?.(round, rounds, ret.rating, { ...ret });
		}

		const duration = Date.now() - start;

		const rating = Math.min(...results.map((r) => r.rating));
		const summary = { results, rating };
		this.driver.controllerLog.logNode(
			this.id,
			`Lifeline health check complete in ${duration} ms
${formatLifelineHealthCheckSummary(summary)}`,
		);

		return summary;
	}

	/**
	 * Checks the health of connection between this node and the target node and returns the results.
	 */
	public async checkRouteHealth(
		targetNodeId: number,
		rounds: number = 5,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: RouteHealthCheckResult,
		) => void,
	): Promise<RouteHealthCheckSummary> {
		if (this._healthCheckInProgress) {
			throw new ZWaveError(
				"A health check is already in progress for this node!",
				ZWaveErrorCodes.HealthCheck_Busy,
			);
		}

		if (rounds > 10 || rounds < 1) {
			throw new ZWaveError(
				"The number of health check rounds must be between 1 and 10!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		try {
			this._healthCheckInProgress = true;
			this._healthCheckAborted = false;
			this._abortHealthCheckPromise = createDeferredPromise();

			return await this.checkRouteHealthInternal(
				targetNodeId,
				rounds,
				onProgress,
			);
		} finally {
			this._healthCheckInProgress = false;
			this._healthCheckAborted = false;
			this._abortHealthCheckPromise = undefined;
		}
	}

	private async checkRouteHealthInternal(
		targetNodeId: number,
		rounds: number,
		onProgress?: (
			round: number,
			totalRounds: number,
			lastRating: number,
			lastResult: RouteHealthCheckResult,
		) => void,
	): Promise<RouteHealthCheckSummary> {
		const otherNode = this.driver.controller.nodes.getOrThrow(targetNodeId);

		if (this.protocol === Protocols.ZWaveLongRange) {
			throw new ZWaveError(
				`Cannot perform route health check for Long Range node ${this.id}.`,
				ZWaveErrorCodes.Controller_NotSupportedForLongRange,
			);
		} else if (otherNode.protocol === Protocols.ZWaveLongRange) {
			throw new ZWaveError(
				`Cannot perform route health check for Long Range node ${otherNode.id}.`,
				ZWaveErrorCodes.Controller_NotSupportedForLongRange,
			);
		}

		if (otherNode.canSleep) {
			throw new ZWaveError(
				"Nodes which can sleep are not a valid target for a route health check!",
				ZWaveErrorCodes.CC_NotSupported,
			);
		} else if (
			this.canSleep
			&& !this.supportsCC(CommandClasses.Powerlevel)
		) {
			throw new ZWaveError(
				"For a route health check, nodes which can sleep must support Powerlevel CC!",
				ZWaveErrorCodes.CC_NotSupported,
			);
		} else if (
			!this.supportsCC(CommandClasses.Powerlevel)
			&& !otherNode.supportsCC(CommandClasses.Powerlevel)
		) {
			throw new ZWaveError(
				"For a route health check, at least one of the nodes must support Powerlevel CC!",
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		// No. of pings per round
		const healthCheckTestFrameCount = 10;
		const start = Date.now();

		/** Computes a health rating from a health check result */
		const computeRating = (result: RouteHealthCheckResult) => {
			const failedPings = Math.max(
				result.failedPingsToSource ?? 0,
				result.failedPingsToTarget ?? 0,
			);
			const numNeighbors = result.numNeighbors;
			const minPowerlevel = Math.max(
				result.minPowerlevelSource ?? Powerlevel["-6 dBm"],
				result.minPowerlevelTarget ?? Powerlevel["-6 dBm"],
			);

			if (failedPings === 10) return 0;
			if (failedPings > 2) return 1;
			if (failedPings === 2) return 2;
			if (failedPings === 1) return 3;
			if (minPowerlevel < Powerlevel["-6 dBm"]) {
				// Lower powerlevel reductions (= higher power) have lower numeric values
				return numNeighbors > 2 ? 7 : 6;
			}
			if (numNeighbors <= 2) return 8;
			return 10;
		};

		this.driver.controllerLog.logNode(
			this.id,
			`Starting route health check to node ${targetNodeId} (${rounds} round${
				rounds !== 1 ? "s" : ""
			})...`,
		);

		const results: RouteHealthCheckResult[] = [];
		const aborted = () => {
			this.driver.controllerLog.logNode(
				this.id,
				`Route health check to node ${targetNodeId} aborted`,
			);
			if (results.length === 0) {
				return {
					rating: 0,
					results: [],
				};
			} else {
				return {
					rating: Math.min(...results.map((r) => r.rating)),
					results,
				};
			}
		};

		if (this.canSleep && this.status !== NodeStatus.Awake) {
			// Wait for node to wake up to avoid incorrectly long delays in the first health check round
			this.driver.controllerLog.logNode(
				this.id,
				`waiting for node to wake up...`,
			);
			await Promise.race([
				this.waitForWakeup(),
				this._abortHealthCheckPromise,
			]);
			if (this._healthCheckAborted) return aborted();
		}

		for (let round = 1; round <= rounds; round++) {
			if (this._healthCheckAborted) return aborted();

			// Determine the minimum number of repeating neighbors between the
			// source and target node
			const numNeighbors = Math.min(
				(
					await this.driver.controller.getNodeNeighbors(
						this.id,
						true,
					)
				).length,
				(
					await this.driver.controller.getNodeNeighbors(
						targetNodeId,
						true,
					)
				).length,
			);

			let failedPings = 0;
			let failedPingsToSource: number | undefined;
			let minPowerlevelSource: Powerlevel | undefined;
			let failedPingsToTarget: number | undefined;
			let minPowerlevelTarget: Powerlevel | undefined;
			const executor =
				(node: ZWaveNode, otherNode: ZWaveNode) =>
				async (powerlevel: Powerlevel) => {
					// Abort the search if the health check was aborted
					if (this._healthCheckAborted) return undefined;

					this.driver.controllerLog.logNode(
						node.id,
						`Sending ${healthCheckTestFrameCount} pings to node ${otherNode.id} at ${
							getEnumMemberName(Powerlevel, powerlevel)
						}...`,
					);
					const result = await node.testPowerlevel(
						otherNode.id,
						powerlevel,
						healthCheckTestFrameCount,
					);
					failedPings = healthCheckTestFrameCount - result;
					this.driver.controllerLog.logNode(
						node.id,
						`At ${
							getEnumMemberName(
								Powerlevel,
								powerlevel,
							)
						}, ${result}/${healthCheckTestFrameCount} pings were acknowledged by node ${otherNode.id}...`,
					);

					// Wait a second for things to settle down
					await wait(1000);

					return failedPings === 0;
				};

			// Now instruct this node to ping the other one, figuring out the minimum powerlevel
			if (this.supportsCC(CommandClasses.Powerlevel)) {
				try {
					// We have to start with the maximum powerlevel and work our way down
					// Otherwise some nodes get stuck trying to complete the check at a bad powerlevel
					// causing the following measurements to fail.
					const powerlevel = await discreteLinearSearch(
						Powerlevel["Normal Power"], // minimum reduction
						Powerlevel["-9 dBm"], // maximum reduction
						executor(this, otherNode),
					);
					if (this._healthCheckAborted) return aborted();

					if (powerlevel == undefined) {
						// There were still failures at normal power, report it
						minPowerlevelSource = Powerlevel["Normal Power"];
						failedPingsToTarget = failedPings;
					} else {
						minPowerlevelSource = powerlevel;
						failedPingsToTarget = 0;
					}
				} catch (e) {
					if (
						isZWaveError(e)
						&& e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						// The node is dead, treat this as a failure
						minPowerlevelSource = Powerlevel["Normal Power"];
						failedPingsToTarget = healthCheckTestFrameCount;
					} else {
						throw e;
					}
				}
			}

			if (this._healthCheckAborted) return aborted();

			// And do the same with the other node - unless the current node is a sleeping node, then this doesn't make sense
			if (
				!this.canSleep
				&& otherNode.supportsCC(CommandClasses.Powerlevel)
			) {
				try {
					const powerlevel = await discreteLinearSearch(
						Powerlevel["Normal Power"], // minimum reduction
						Powerlevel["-9 dBm"], // maximum reduction
						executor(otherNode, this),
					);
					if (powerlevel == undefined) {
						// There were still failures at normal power, report it
						minPowerlevelTarget = Powerlevel["Normal Power"];
						failedPingsToSource = failedPings;
					} else {
						minPowerlevelTarget = powerlevel;
						failedPingsToSource = 0;
					}
				} catch (e) {
					if (
						isZWaveError(e)
						&& e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						// The node is dead, treat this as a failure
						minPowerlevelTarget = Powerlevel["Normal Power"];
						failedPingsToSource = healthCheckTestFrameCount;
					} else {
						throw e;
					}
				}
			}

			const ret: RouteHealthCheckResult = {
				numNeighbors,
				failedPingsToSource,
				failedPingsToTarget,
				minPowerlevelSource,
				minPowerlevelTarget,
				rating: 0,
			};
			ret.rating = computeRating(ret);
			results.push(ret);
			onProgress?.(round, rounds, ret.rating, { ...ret });
		}

		const duration = Date.now() - start;

		const rating = Math.min(...results.map((r) => r.rating));
		const summary = { results, rating };
		this.driver.controllerLog.logNode(
			this.id,
			`Route health check to node ${otherNode.id} complete in ${duration} ms
${formatRouteHealthCheckSummary(this.id, otherNode.id, summary)}`,
		);

		return summary;
	}

	private _linkReliabilityCheckInProgress: boolean = false;
	/**
	 * Returns whether a link reliability check is currently in progress for this node
	 */
	public isLinkReliabilityCheckInProgress(): boolean {
		return this._linkReliabilityCheckInProgress;
	}

	private _linkReliabilityCheckAborted: boolean = false;
	private _abortLinkReliabilityCheckPromise:
		| DeferredPromise<void>
		| undefined;

	/**
	 * Aborts an ongoing link reliability check if one is currently in progress.
	 *
	 * **Note:** The link reliability check may take a few seconds to actually be aborted.
	 * When it is, the promise returned by {@link checkLinkReliability} will be resolved with the results obtained so far.
	 */
	public abortLinkReliabilityCheck(): void {
		if (!this._linkReliabilityCheckInProgress) return;
		this._linkReliabilityCheckAborted = true;
		this._abortLinkReliabilityCheckPromise?.resolve();
	}

	/**
	 * Tests the reliability of the link between the controller and this node and returns the results.
	 */
	public async checkLinkReliability(
		options: LinkReliabilityCheckOptions,
	): Promise<LinkReliabilityCheckResult> {
		if (this._linkReliabilityCheckInProgress) {
			throw new ZWaveError(
				"A link reliability check is already in progress for this node!",
				ZWaveErrorCodes.LinkReliabilityCheck_Busy,
			);
		}

		if (typeof options.rounds === "number" && options.rounds < 1) {
			throw new ZWaveError(
				"The number of rounds must be at least 1!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		try {
			this._linkReliabilityCheckInProgress = true;
			this._linkReliabilityCheckAborted = false;
			this._abortLinkReliabilityCheckPromise = createDeferredPromise();

			switch (options.mode) {
				case LinkReliabilityCheckMode.BasicSetOnOff:
					return await this.checkLinkReliabilityBasicSetOnOff(
						options,
					);
			}
		} finally {
			this._linkReliabilityCheckInProgress = false;
			this._linkReliabilityCheckAborted = false;
			this._abortLinkReliabilityCheckPromise = undefined;
		}
	}

	private async checkLinkReliabilityBasicSetOnOff(
		options: LinkReliabilityCheckOptions,
	): Promise<LinkReliabilityCheckResult> {
		this.driver.controllerLog.logNode(
			this.id,
			`Starting link reliability check (Basic Set On/Off) with ${options.rounds} round${
				options.rounds !== 1 ? "s" : ""
			}...`,
		);

		const useSupervision = this.supportsCC(CommandClasses.Supervision);
		const result: LinkReliabilityCheckResult = {
			rounds: 0,
			commandsSent: 0,
			commandErrors: 0,
			missingResponses: useSupervision ? 0 : undefined,
			latency: {
				min: Number.POSITIVE_INFINITY,
				max: 0,
				average: 0,
			},
			rtt: {
				min: Number.POSITIVE_INFINITY,
				max: 0,
				average: 0,
			},
			ackRSSI: {
				min: 0,
				max: Number.NEGATIVE_INFINITY,
				average: Number.NEGATIVE_INFINITY,
			},
			responseRSSI: useSupervision
				? {
					min: 0,
					max: Number.NEGATIVE_INFINITY,
					average: Number.NEGATIVE_INFINITY,
				}
				: undefined,
		};

		const aborted = () => {
			this.driver.controllerLog.logNode(
				this.id,
				`Link reliability check aborted`,
			);
			return result;
		};

		let lastProgressReport = 0;
		const reportProgress = () => {
			if (Date.now() - lastProgressReport >= 250) {
				options.onProgress?.(cloneDeep(result));
				lastProgressReport = Date.now();
			}
		};

		if (this.canSleep && this.status !== NodeStatus.Awake) {
			// Wait for node to wake up to avoid incorrectly long delays in the first health check round
			this.driver.controllerLog.logNode(
				this.id,
				`waiting for node to wake up...`,
			);
			await Promise.race([
				this.waitForWakeup(),
				this._abortLinkReliabilityCheckPromise,
			]);
			if (this._linkReliabilityCheckAborted) return aborted();
		}

		// TODO: report progress with throttle

		let txReport: TXReport | undefined;

		const basicSetAPI = this.commandClasses.Basic.withOptions({
			// Don't change the node status when the ACK is missing. We're likely testing the limits here.
			changeNodeStatusOnMissingACK: false,
			// Avoid using explorer frames, because they can create a ton of delay
			transmitOptions: TransmitOptions.ACK
				| TransmitOptions.AutoRoute,
			// Do not wait for SOS NonceReports, as it slows down the test
			s2VerifyDelivery: false,
			// And remember the transmit report, so we can evaluate it
			onTXReport: (report) => {
				txReport = report;
			},
		});

		let lastStart: number;
		for (
			let round = 1;
			round <= (options.rounds ?? Number.POSITIVE_INFINITY);
			round++
		) {
			if (this._linkReliabilityCheckAborted) return aborted();

			result.rounds = round;

			lastStart = Date.now();
			// Reset TX report before each command
			txReport = undefined as any;

			try {
				await basicSetAPI.set(
					round % 2 === 1 ? 0xff : 0x00,
				);
				// The command was sent successfully (and possibly got a response)
				result.commandsSent++;

				// Measure the RTT or latency, whatever is available
				const rtt = Date.now() - lastStart;
				result.rtt.min = Math.min(result.rtt.min, rtt);
				result.rtt.max = Math.max(result.rtt.max, rtt);
				// incrementally update the average rtt
				result.rtt.average += (rtt - result.rtt.average) / round;

				if (txReport) {
					const latency = txReport.txTicks * 10;
					if (result.latency) {
						result.latency.min = Math.min(
							result.latency.min,
							latency,
						);
						result.latency.max = Math.max(
							result.latency.max,
							latency,
						);
						// incrementally update the average RTT
						result.latency.average +=
							(latency - result.latency.average)
							/ round;
					} else {
						result.latency = {
							min: latency,
							max: latency,
							average: latency,
						};
					}
				}
			} catch (e) {
				if (isZWaveError(e)) {
					if (
						e.code === ZWaveErrorCodes.Controller_ResponseNOK
						|| e.code === ZWaveErrorCodes.Controller_CallbackNOK
					) {
						// The command could not be sent or was not acknowledged
						result.commandErrors++;
					} else if (
						e.code === ZWaveErrorCodes.Controller_NodeTimeout
					) {
						// The command was sent using Supervision and a response was
						// expected but none came
						result.missingResponses ??= 0;
						result.missingResponses++;
					}
				}
			}

			if (
				txReport?.ackRSSI != undefined
				&& !isRssiError(txReport.ackRSSI)
			) {
				result.ackRSSI.min = Math.min(
					result.ackRSSI.min,
					txReport.ackRSSI,
				);
				result.ackRSSI.max = Math.max(
					result.ackRSSI.max,
					txReport.ackRSSI,
				);
				// incrementally update the average RSSI
				if (Number.isFinite(result.ackRSSI.average)) {
					result.ackRSSI.average +=
						(txReport.ackRSSI - result.ackRSSI.average)
						/ round;
				} else {
					result.ackRSSI.average = txReport.ackRSSI;
				}
			}

			// TODO: Capture incoming RSSI and average it

			reportProgress();

			// Throttle the next command
			const waitDurationMs = Math.max(
				0,
				options.interval - (Date.now() - lastStart),
			);
			await Promise.race([
				wait(waitDurationMs, true),
				this._abortLinkReliabilityCheckPromise,
			]);
		}

		return result;
	}

	/**
	 * Updates the average RTT of this node
	 * @internal
	 */
	public updateRTT(sentMessage: Message): void {
		if (sentMessage.rtt) {
			const rttMs = sentMessage.rtt / 1e6;
			this.updateStatistics((current) => ({
				...current,
				rtt: current.rtt != undefined
					? roundTo(current.rtt * 0.75 + rttMs * 0.25, 1)
					: roundTo(rttMs, 1),
			}));
		}
	}

	/**
	 * Updates route/transmission statistics for this node
	 * @internal
	 */
	public updateRouteStatistics(txReport: TXReport): void {
		this.updateStatistics((current) => {
			const ret = { ...current };
			// Update ACK RSSI
			if (txReport.ackRSSI != undefined) {
				ret.rssi =
					ret.rssi == undefined || isRssiError(txReport.ackRSSI)
						? txReport.ackRSSI
						: Math.round(ret.rssi * 0.75 + txReport.ackRSSI * 0.25);
			}

			// Update the LWR's statistics
			const newStats: RouteStatistics = {
				protocolDataRate: txReport.routeSpeed,
				repeaters: (txReport.repeaterNodeIds ?? []) as number[],
				rssi: txReport.ackRSSI
					?? ret.lwr?.rssi
					?? RssiError.NotAvailable,
			};
			if (txReport.ackRepeaterRSSI != undefined) {
				newStats.repeaterRSSI = txReport.ackRepeaterRSSI as number[];
			}
			if (
				txReport.failedRouteLastFunctionalNodeId
				&& txReport.failedRouteFirstNonFunctionalNodeId
			) {
				newStats.routeFailedBetween = [
					txReport.failedRouteLastFunctionalNodeId,
					txReport.failedRouteFirstNonFunctionalNodeId,
				];
			}

			if (ret.lwr && !routeStatisticsEquals(ret.lwr, newStats)) {
				// The old LWR becomes the NLWR
				ret.nlwr = ret.lwr;
			}
			ret.lwr = newStats;
			return ret;
		});
	}

	/**
	 * Sets the current date, time and timezone (or a subset of those) on the node using one or more of the respective CCs.
	 * Returns whether the operation was successful.
	 */
	public async setDateAndTime(now: Date = new Date()): Promise<boolean> {
		// There are multiple ways to communicate the current time to a node:
		// 1. Time Parameters CC
		// 2. Clock CC
		// 3. Time CC, but only in response to requests from the node
		const timeParametersAPI = this.commandClasses["Time Parameters"];
		const timeAPI = this.commandClasses.Time;
		const clockAPI = this.commandClasses.Clock;
		const scheduleEntryLockAPI = this.commandClasses["Schedule Entry Lock"];

		if (
			timeParametersAPI.isSupported()
			&& timeParametersAPI.supportsCommand(TimeParametersCommand.Set)
		) {
			try {
				const result = await timeParametersAPI.set(now);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		} else if (
			clockAPI.isSupported()
			&& clockAPI.supportsCommand(ClockCommand.Set)
		) {
			try {
				// Get desired time in local time
				const hours = now.getHours();
				const minutes = now.getMinutes();
				// Sunday is 0 in JS, but 7 in Z-Wave
				let weekday = now.getDay();
				if (weekday === 0) weekday = 7;

				const result = await clockAPI.set(hours, minutes, weekday);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		} else if (
			timeAPI.isSupported()
			&& timeAPI.supportsCommand(TimeCommand.DateReport)
			&& timeAPI.supportsCommand(TimeCommand.TimeReport)
		) {
			// According to https://github.com/zwave-js/node-zwave-js/issues/6032#issuecomment-1641945555
			// some devices update their date and time when they receive an unsolicited Time CC report.
			// Even if this isn't intended, we should at least try.

			const api = timeAPI.withOptions({
				useSupervision: false,
			});
			try {
				// First date
				const year = now.getFullYear();
				const month = now.getMonth() + 1;
				const day = now.getDate();
				await api.reportDate(year, month, day);

				const verification = await api.getDate();
				if (
					!verification
					|| verification.year !== year
					|| verification.month !== month
					|| verification.day !== day
				) {
					// Didn't work
					return false;
				}
			} catch {
				return false;
			}

			try {
				// Then time
				const hour = now.getHours();
				const minute = now.getMinutes();
				const second = now.getSeconds();
				await api.reportTime(hour, minute, second);

				const verification = await api.getTime();
				if (!verification) return false;
				// To leave a bit of tolerance for communication delays, we compare the seconds since midnight
				const secondsPerDay = 24 * 60 * 60;
				const expected = hour * 60 * 60 + minute * 60 + second;
				const expectedMin = expected - 30;
				const expectedMax = expected + 30;
				const actual = verification.hour * 60 * 60
					+ verification.minute * 60
					+ verification.second;
				// The time may have wrapped around midnight since we set the date
				if (actual >= expectedMin && actual <= expectedMax) {
					// ok
				} else if (
					actual + secondsPerDay >= expectedMin
					&& actual + secondsPerDay <= expectedMax
				) {
					// ok
				} else {
					// Didn't work
					return false;
				}
			} catch {
				return false;
			}
		}

		// We might also have to change the timezone. That is done with the Time CC.
		// Or in really strange cases using the Schedule Entry Lock CC
		const timezone = getDSTInfo(now);
		if (
			timeAPI.isSupported()
			&& timeAPI.supportsCommand(TimeCommand.TimeOffsetSet)
		) {
			try {
				const result = await timeAPI.setTimezone(timezone);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		} else if (
			scheduleEntryLockAPI.isSupported()
			&& scheduleEntryLockAPI.supportsCommand(
				ScheduleEntryLockCommand.TimeOffsetSet,
			)
		) {
			try {
				const result = await scheduleEntryLockAPI.setTimezone(timezone);
				if (supervisedCommandFailed(result)) return false;
			} catch {
				return false;
			}
		}

		return true;
	}

	/**
	 * Returns the current date, time and timezone (or a subset of those) on the node using one or more of the respective CCs.
	 */
	public async getDateAndTime(): Promise<DateAndTime> {
		const timeParametersAPI = this.commandClasses["Time Parameters"];
		const timeAPI = this.commandClasses.Time;
		const clockAPI = this.commandClasses.Clock;
		const scheduleEntryLockAPI = this.commandClasses["Schedule Entry Lock"];

		const response: DateAndTime = {};

		if (
			timeParametersAPI.isSupported()
			&& timeParametersAPI.supportsCommand(TimeParametersCommand.Get)
		) {
			try {
				const result = await timeParametersAPI.get();
				if (result) {
					// Time Parameters is all UTC per the spec
					Object.assign(response, {
						hour: result.getUTCHours(),
						minute: result.getUTCMinutes(),
						second: result.getUTCSeconds(),
						standardOffset: 0,
						dstOffset: 0,
						weekday: result.getUTCDay(),
						day: result.getUTCDate(),
						month: result.getUTCMonth() + 1,
						year: result.getUTCFullYear(),
					});
				}
				// That's everything
				return response;
			} catch {}
		}

		if (
			clockAPI.isSupported()
			&& clockAPI.supportsCommand(ClockCommand.Get)
		) {
			try {
				const result = await clockAPI.get();
				if (result) {
					Object.assign(
						response,
						{
							hour: result.hour,
							minute: result.minute,
							weekday: result.weekday,
						} satisfies DateAndTime,
					);
				}
			} catch {}
		}

		if (
			timeAPI.isSupported()
			&& timeAPI.supportsCommand(TimeCommand.TimeGet)
		) {
			try {
				const result = await timeAPI.getTime();
				if (result) {
					Object.assign(
						response,
						{
							hour: result.hour,
							minute: result.minute,
							second: result.second,
						} satisfies DateAndTime,
					);
				}
			} catch {}
		}

		if (
			timeAPI.isSupported()
			&& timeAPI.supportsCommand(TimeCommand.DateGet)
		) {
			try {
				const result = await timeAPI.getDate();
				if (result) {
					Object.assign(
						response,
						{
							day: result.day,
							month: result.month,
							year: result.year,
						} satisfies DateAndTime,
					);
				}
			} catch {}
		}

		if (
			timeAPI.isSupported()
			&& timeAPI.supportsCommand(TimeCommand.TimeOffsetGet)
		) {
			try {
				const result = await timeAPI.getTimezone();
				if (result) {
					Object.assign(
						response,
						{
							standardOffset: result.standardOffset,
							dstOffset: result.dstOffset,
						} satisfies DateAndTime,
					);
				}
			} catch {}
		}

		if (
			scheduleEntryLockAPI.isSupported()
			&& scheduleEntryLockAPI.supportsCommand(
				ScheduleEntryLockCommand.TimeOffsetGet,
			)
		) {
			try {
				const result = await scheduleEntryLockAPI.getTimezone();
				if (result) {
					Object.assign(
						response,
						{
							standardOffset: result.standardOffset,
							dstOffset: result.dstOffset,
						} satisfies DateAndTime,
					);
				}
			} catch {}
		}

		return response;
	}

	public async sendResetLocallyNotification(): Promise<void> {
		// We don't care if the CC is supported by the receiving node
		const api = this.createAPI(
			CommandClasses["Device Reset Locally"],
			false,
		);

		await api.sendNotification();
	}

	/**
	 * Returns whether the device config for this node has changed since the last interview.
	 * If it has, the node likely needs to be re-interviewed for the changes to be picked up.
	 */
	public hasDeviceConfigChanged(): MaybeNotKnown<boolean> {
		// We can't know if the node is not fully interviewed
		if (this.interviewStage !== InterviewStage.Complete) return NOT_KNOWN;

		// The controller cannot be re-interviewed
		if (this.isControllerNode) return false;

		// If the hash was never stored, we can only (very likely) know if the config has not changed
		const actualHash = this.deviceConfig?.getHash();
		if (this.deviceConfigHash == undefined) {
			return actualHash == undefined ? false : NOT_KNOWN;
		}

		// If it was, a change in hash means the config has changed
		if (actualHash && this.deviceConfigHash) {
			return !actualHash.equals(this.deviceConfigHash);
		}
		return true;
	}

	/** Returns a dump of this node's information for debugging purposes */
	public createDump(): NodeDump {
		const { index, ...endpointDump } = this.createEndpointDump();
		const ret: NodeDump = {
			id: this.id,
			manufacturer: this.deviceConfig?.manufacturer,
			label: this.label,
			description: this.deviceConfig?.description,
			fingerprint: {
				manufacturerId: this.manufacturerId != undefined
					? formatId(this.manufacturerId)
					: "unknown",
				productType: this.productType != undefined
					? formatId(this.productType)
					: "unknown",
				productId: this.productId != undefined
					? formatId(this.productId)
					: "unknown",
				firmwareVersion: this.firmwareVersion ?? "unknown",
			},
			interviewStage: getEnumMemberName(
				InterviewStage,
				this.interviewStage,
			),
			ready: this.ready,

			dsk: this.dsk ? dskToString(this.dsk) : undefined,
			securityClasses: {},

			isListening: this.isListening ?? "unknown",
			isFrequentListening: this.isFrequentListening ?? "unknown",
			isRouting: this.isRouting ?? "unknown",
			supportsBeaming: this.supportsBeaming ?? "unknown",
			supportsSecurity: this.supportsSecurity ?? "unknown",
			protocol: getEnumMemberName(Protocols, this.protocol),
			supportedProtocols: this.driver.controller.getProvisioningEntry(
				this.id,
			)?.supportedProtocols?.map((p) => getEnumMemberName(Protocols, p)),
			protocolVersion: this.protocolVersion != undefined
				? getEnumMemberName(ProtocolVersion, this.protocolVersion)
				: "unknown",
			sdkVersion: this.sdkVersion ?? "unknown",
			supportedDataRates: this.supportedDataRates
				? [...this.supportedDataRates]
				: "unknown",

			...endpointDump,
		};

		if (this.hardwareVersion != undefined) {
			ret.fingerprint.hardwareVersion = this.hardwareVersion;
		}

		for (const secClass of securityClassOrder) {
			if (
				this.protocol === Protocols.ZWaveLongRange
				&& !securityClassIsLongRange(secClass)
			) {
				continue;
			}
			ret.securityClasses[getEnumMemberName(SecurityClass, secClass)] =
				this.hasSecurityClass(secClass) ?? "unknown";
		}

		const allValueIds = nodeUtils.getDefinedValueIDsInternal(
			this.driver,
			this,
			true,
		);

		const collectValues = (
			endpointIndex: number,
			getCollection: (ccId: CommandClasses) => ValueDump[] | undefined,
		) => {
			for (const valueId of allValueIds) {
				if ((valueId.endpoint ?? 0) !== endpointIndex) continue;

				const value = this._valueDB.getValue(valueId);
				const metadata = this._valueDB.getMetadata(valueId);
				const timestamp = this._valueDB.getTimestamp(valueId);
				const timestampAsDate = timestamp
					? new Date(timestamp).toISOString()
					: undefined;

				const ccInstance = CommandClass.createInstanceUnchecked(
					this,
					valueId.commandClass,
				);
				const isInternalValue = ccInstance?.isInternalValue(valueId);

				const valueDump: ValueDump = {
					...pick(valueId, [
						"property",
						"propertyKey",
					]),
					metadata,
					value: metadata?.secret
						? "(redacted)"
						: serializeCacheValue(value),
					timestamp: timestampAsDate,
				};
				if (isInternalValue) valueDump.internal = true;

				for (const [prop, value] of Object.entries(valueDump)) {
					// @ts-expect-error
					if (value === undefined) delete valueDump[prop];
				}

				getCollection(valueId.commandClass)?.push(valueDump);
			}
		};
		collectValues(0, (ccId) => ret.commandClasses[getCCName(ccId)]?.values);

		for (const endpoint of this.getAllEndpoints()) {
			if (endpoint.index === 0) continue;
			ret.endpoints ??= {};
			const endpointDump = endpoint.createEndpointDump();
			collectValues(
				endpoint.index,
				(ccId) => endpointDump.commandClasses[getCCName(ccId)]?.values,
			);
			ret.endpoints[endpoint.index] = endpointDump;
		}

		if (this.deviceConfig) {
			const relativePath = path.relative(
				embeddedDevicesDir,
				this.deviceConfig.filename,
			);
			if (relativePath.startsWith("..")) {
				// The path is outside our embedded config dir, take the full path
				ret.configFileName = this.deviceConfig.filename;
			} else {
				ret.configFileName = relativePath;
			}

			if (this.deviceConfig.compat) {
				// TODO: Check if everything comes through this way.
				ret.compatFlags = this.deviceConfig.compat;
			}
		}
		for (const [prop, value] of Object.entries(ret)) {
			// @ts-expect-error
			if (value === undefined) delete ret[prop];
		}

		return ret;
	}

	protected _emit<TEvent extends keyof AllNodeEvents>(
		event: TEvent,
		...args: Parameters<AllNodeEvents[TEvent]>
	): boolean {
		return this.emit(event, ...args);
	}

	protected _on<TEvent extends keyof AllNodeEvents>(
		event: TEvent,
		callback: AllNodeEvents[TEvent],
	): this {
		return this.on(event, callback);
	}

	protected _once<TEvent extends keyof AllNodeEvents>(
		event: TEvent,
		callback: AllNodeEvents[TEvent],
	): this {
		return this.once(event, callback);
	}
}
