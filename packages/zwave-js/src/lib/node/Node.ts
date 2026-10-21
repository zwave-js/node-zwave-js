import {
	BatteryCCReport,
	type CCAPI,
	ClockCommand,
	CommandClass,
	DeviceResetLocallyCCNotification,
	IndicatorCCDescriptionGet,
	IndicatorCCGet,
	IndicatorCCSet,
	IndicatorCCSupportedGet,
	MultiChannelAssociationCCGet,
	MultiChannelAssociationCCRemove,
	MultiChannelAssociationCCSet,
	MultiChannelAssociationCCSupportedGroupingsGet,
	MultiCommandCCCommandEncapsulation,
	type PollValueImplementation,
	Powerlevel,
	PowerlevelTestStatus,
	ScheduleEntryLockCommand,
	type SetValueAPIOptions,
	type SetValueResult,
	SetValueStatus,
	SoundSwitchCCValues,
	TimeCCDateGet,
	TimeCCTimeGet,
	TimeCCTimeOffsetGet,
	TimeCommand,
	TimeParametersCommand,
	UserCodeCCValues,
	type ValueIDProperties,
	getImplementedVersion,
	supervisionResultToSetValueResult,
	utils as ccUtils,
} from "@zwave-js/cc";
import { ApplicationStatusCCBusy } from "@zwave-js/cc/ApplicationStatusCC";
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
import { BasicCC } from "@zwave-js/cc/BasicCC";
import { BinarySwitchCCSet } from "@zwave-js/cc/BinarySwitchCC";
import { CentralSceneCCNotification } from "@zwave-js/cc/CentralSceneCC";
import { ClockCCReport } from "@zwave-js/cc/ClockCC";
import { EntryControlCCNotification } from "@zwave-js/cc/EntryControlCC";
import {
	FirmwareUpdateMetaDataCCGet,
	FirmwareUpdateMetaDataCCMetaDataGet,
	FirmwareUpdateMetaDataCCPrepareGet,
	FirmwareUpdateMetaDataCCRequestGet,
} from "@zwave-js/cc/FirmwareUpdateMetaDataCC";
import { HailCC } from "@zwave-js/cc/HailCC";
import {
	ManufacturerSpecificCCDeviceSpecificGet,
	ManufacturerSpecificCCGet,
} from "@zwave-js/cc/ManufacturerSpecificCC";
import { MultilevelSwitchCC } from "@zwave-js/cc/MultilevelSwitchCC";
import { NodeNamingAndLocationCCValues } from "@zwave-js/cc/NodeNamingCC";
import { NotificationCCReport } from "@zwave-js/cc/NotificationCC";
import {
	PowerlevelCCGet,
	PowerlevelCCSet,
	PowerlevelCCTestNodeGet,
	PowerlevelCCTestNodeReport,
	PowerlevelCCTestNodeSet,
} from "@zwave-js/cc/PowerlevelCC";
import { SceneActivationCCSet } from "@zwave-js/cc/SceneActivationCC";
import { Security2CCNonceGet } from "@zwave-js/cc/Security2CC";
import { SecurityCCNonceGet } from "@zwave-js/cc/SecurityCC";
import { ThermostatModeCCSet } from "@zwave-js/cc/ThermostatModeCC";
import {
	UserCredentialCCAssociationReport,
	UserCredentialCCCredentialLearnReport,
	UserCredentialCCCredentialReport,
	UserCredentialCCUserReport,
} from "@zwave-js/cc/UserCredentialCC";
import {
	VersionCCCapabilitiesGet,
	VersionCCCommandClassGet,
	VersionCCGet,
} from "@zwave-js/cc/VersionCC";
import { WakeUpCCWakeUpNotification } from "@zwave-js/cc/WakeUpCC";
import { ZWavePlusCCGet } from "@zwave-js/cc/ZWavePlusCC";
import { embeddedDevicesDir } from "@zwave-js/config";
import {
	BasicDeviceClass,
	CommandClasses,
	Duration,
	type DurationLike,
	EncapsulationFlags,
	type LogNodeOptions,
	type MaybeNotKnown,
	MessagePriority,
	NOT_KNOWN,
	NodeType,
	type NodeUpdatePayload,
	ProtocolVersion,
	Protocols,
	type QuerySecurityClasses,
	type RSSI,
	RssiError,
	SecurityClass,
	type SendCommandOptions,
	type SendMessageOptions,
	type SetValueOptions,
	type SinglecastCC,
	SupervisionStatus,
	type TXReport,
	type TranslatedValueID,
	TransmitOptions,
	type ValueDB,
	type ValueID,
	type ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	actuatorCCs,
	applicationCCs,
	dskToString,
	getCCName,
	getDSTInfo,
	getNotification,
	isActuatorCC,
	isRssiError,
	isSupervisionResult,
	isTransmissionError,
	isUnsupervisedOrSucceeded,
	isZWaveError,
	logDict,
	logList,
	logText,
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
} from "@zwave-js/core";
import { FunctionType, type Message } from "@zwave-js/serial";
import {
	type ApplicationUpdateRequest,
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
	GetNodeProtocolInfoRequest,
	type GetNodeProtocolInfoResponse,
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "@zwave-js/serial/serialapi";
import {
	type BytesView,
	Mixin,
	TypedEventTarget,
	cloneDeep,
	discreteLinearSearch,
	formatId,
	getEnumMemberName,
	getErrorMessage,
	getenv,
	noop,
	pick,
} from "@zwave-js/shared";
import { waitFor } from "@zwave-js/waddle";
import { wait } from "alcalzone-shared/async";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { roundTo } from "alcalzone-shared/math";
import path from "pathe";

import type { Driver } from "../driver/Driver.js";
import { cacheKeys } from "../driver/NetworkCache.js";
import type { StatisticsEventCallbacksWithSelf } from "../driver/Statistics.js";
import { type TaskBuilder, TaskPriority } from "../driver/Task.js";
import { reportMissingDeviceConfig } from "../telemetry/deviceConfig.js";

import { handleApplicationBusy } from "./CCHandlers/ApplicationStatusCC.js";
import {
	handleAssociationGet,
	handleAssociationRemove,
	handleAssociationSet,
	handleAssociationSpecificGroupGet,
} from "./CCHandlers/AssociationCC.js";
import {
	handleAGICommandListGet,
	handleAGIInfoGet,
	handleAGINameGet,
	handleAssociationSupportedGroupingsGet,
} from "./CCHandlers/AssociationGroupInformationCC.js";
import {
	getBasicMappingTarget,
	handleBasicCommand,
} from "./CCHandlers/BasicCC.js";
import { handleBatteryReport } from "./CCHandlers/BatteryCC.js";
import { handleBinarySwitchCommand } from "./CCHandlers/BinarySwitchCC.js";
import {
	getDefaultCentralSceneHandlerStore,
	handleCentralSceneNotification,
} from "./CCHandlers/CentralSceneCC.js";
import {
	getDefaultClockHandlerStore,
	handleClockReport,
} from "./CCHandlers/ClockCC.js";
import { handleDeviceResetLocallyNotification } from "./CCHandlers/DeviceResetLocallyCC.js";
import {
	getDefaultEntryControlHandlerStore,
	handleEntryControlNotification,
} from "./CCHandlers/EntryControlCC.js";
import { getDefaultHailHandlerStore, handleHail } from "./CCHandlers/HailCC.js";
import {
	handleIndicatorDescriptionGet,
	handleIndicatorGet,
	handleIndicatorSet,
	handleIndicatorSupportedGet,
} from "./CCHandlers/IndicatorCC.js";
import {
	handleManufacturerSpecificDeviceSpecificGet,
	handleManufacturerSpecificGet,
} from "./CCHandlers/ManufacturerSpecificCC.js";
import {
	handleMultiChannelAssociationGet,
	handleMultiChannelAssociationRemove,
	handleMultiChannelAssociationSet,
	handleMultiChannelAssociationSupportedGroupingsGet,
} from "./CCHandlers/MultiChannelAssociationCC.js";
import { handleMultilevelSwitchCommand } from "./CCHandlers/MultilevelSwitchCC.js";
import {
	getDefaultNotificationHandlerStore,
	handleNotificationReport,
	manuallyIdleNotificationValueInternal,
} from "./CCHandlers/NotificationCC.js";
import {
	handlePowerlevelGet,
	handlePowerlevelSet,
	handlePowerlevelTestNodeGet,
	handlePowerlevelTestNodeReport,
	handlePowerlevelTestNodeSet,
} from "./CCHandlers/PowerlevelCC.js";
import {
	getDefaultSoundSwitchHandlerStore,
	handleSoundSwitchSetValue,
} from "./CCHandlers/SoundSwitchCC.js";
import { handleThermostatModeCommand } from "./CCHandlers/ThermostatModeCC.js";
import {
	handleDateGet,
	handleTimeGet,
	handleTimeOffsetGet,
} from "./CCHandlers/TimeCC.js";
import {
	handleUserCredentialAssociationReport,
	handleUserCredentialCredentialLearnReport,
	handleUserCredentialCredentialReport,
	handleUserCredentialUserReport,
} from "./CCHandlers/UserCredentialCC.js";
import {
	handleVersionCapabilitiesGet,
	handleVersionCommandClassGet,
	handleVersionGet,
} from "./CCHandlers/VersionCC.js";
import { handleWakeUpNotification } from "./CCHandlers/WakeUpCC.js";
import { handleZWavePlusGet } from "./CCHandlers/ZWavePlusCC.js";
import { DeviceClass } from "./DeviceClass.js";
import type { NodeDump, ValueDump } from "./Dump.js";
import type { Endpoint } from "./Endpoint.js";
import {
	formatLifelineHealthCheckSummary,
	formatRouteHealthCheckSummary,
	healthCheckTestFrameCount,
} from "./HealthCheck.js";
import {
	type NodeStatistics,
	NodeStatisticsHost,
	type RouteStatistics,
	routeStatisticsEquals,
} from "./NodeStatistics.js";
import {
	type DateAndTime,
	InterviewStage,
	type LifelineHealthCheckResult,
	type LifelineHealthCheckSummary,
	LinkReliabilityCheckMode,
	type LinkReliabilityCheckOptions,
	type LinkReliabilityCheckResult,
	NodeStatus,
	type RefreshInfoOptions,
	type RouteHealthCheckResult,
	type RouteHealthCheckSummary,
	type ZWaveNodeEventCallbacks,
	type ZWaveNotificationCapability,
} from "./_Types.js";
import { ZWaveNodeMixins } from "./mixins/index.js";
import * as nodeUtils from "./utils.js";

type AllNodeEvents = ZWaveNodeEventCallbacks
	& StatisticsEventCallbacksWithSelf<ZWaveNode, NodeStatistics>;

export interface ZWaveNode
	extends TypedEventTarget<AllNodeEvents>, NodeStatisticsHost {}

/**
 * A ZWaveNode represents a node in a Z-Wave network. It is also an instance
 * of its root endpoint (index 0)
 */
@Mixin([TypedEventTarget, NodeStatisticsHost])
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
		// Remove all timeouts
		for (const timeout of [
			this.centralSceneHandlerStore.keyHeldDownContext?.timeout,
			...this.notificationHandlerStore.idleTimeouts.values(),
			...this.soundSwitchHandlerStore.autoResetTimers.values(),
		]) {
			timeout?.clear();
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
	public get dsk(): BytesView | undefined {
		return this.driver.cacheGet(cacheKeys.node(this.id).dsk);
	}
	/** @internal */
	public set dsk(value: BytesView | undefined) {
		const cacheKey = cacheKeys.node(this.id).dsk;
		this.driver.cacheSet(cacheKey, value);
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

	/** The last time this node sent a Wake Up notification */
	public get lastAwake(): MaybeNotKnown<Date> {
		return this.driver.cacheGet(cacheKeys.node(this.id).lastAwake);
	}
	/** @internal */
	public set lastAwake(value: MaybeNotKnown<Date>) {
		this.driver.cacheSet(cacheKeys.node(this.id).lastAwake, value);
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

	public set defaultTransitionDuration(
		value: string | Duration | DurationLike | undefined,
	) {
		// Normalize to strings
		value = Duration.from(value)?.toString();

		this.driver.cacheSet(
			cacheKeys.node(this.id).defaultTransitionDuration,
			value,
		);
	}

	/** Returns a list of all value names that are defined on all endpoints of this node */
	public getDefinedValueIDs(): TranslatedValueID[] {
		if (this.isControllerNode) {
			// For the controller, look at proprietary implementations to get the value IDs
			const proprietary = this.driver.controller.proprietary;
			for (const impl of Object.values(proprietary)) {
				if (typeof impl.getDefinedValueIDs === "function") {
					return impl.getDefinedValueIDs();
				}
			}
			return [];
		} else {
			return nodeUtils.getDefinedValueIDs(this.driver, this);
		}
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

		// For the controller, look at proprietary implementations to set the value
		if (this.isControllerNode) {
			const proprietary = this.driver.controller.proprietary;
			for (const impl of Object.values(proprietary)) {
				if (typeof impl.setValue === "function") {
					return impl.setValue(valueId, value);
				}
			}
		}

		const loglevel = this.driver.getLogConfig().level;

		// Try to retrieve the corresponding CC API
		try {
			// Access the CC API by name
			const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
			if (!endpointInstance) {
				return {
					status: SetValueStatus.EndpointNotFound,
					message: `Endpoint ${valueId.endpoint} does not exist on Node ${this.id}`,
				};
			}
			let api = (endpointInstance.commandClasses as any)[
				valueId.commandClass
			] as CCAPI;
			// Check if the setValue method is implemented
			if (!api.setValue) {
				return {
					status: SetValueStatus.NotImplemented,
					message: `The ${getCCName(
						valueId.commandClass,
					)} CC does not support setting values`,
				};
			}

			if (loglevel === "silly") {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: valueId.endpoint,
					message: logText(
						`[setValue] calling SET_VALUE API ${api.constructor.name}:`,
						{
							nested: logDict({
								property: valueId.property,
								"property key": `${valueId.propertyKey}`,
								optimistic: api.isSetValueOptimistic(valueId),
							}),
						},
					),
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
			if (hooks?.normalizeValue) value = hooks.normalizeValue(value);

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
				const header = `[setValue] result of SET_VALUE API call for ${api.constructor.name}:`;
				let message: LogNodeOptions["message"];
				if (result) {
					if (isSupervisionResult(result)) {
						message = logText(`${header} (SupervisionResult)`, {
							nested: logDict({
								status: getEnumMemberName(
									SupervisionStatus,
									result.status,
								),
								duration: result.remainingDuration?.toString(),
							}),
						});
					} else {
						message =
							header
							+ " (other) "
							+ JSON.stringify(result, null, 2);
					}
				} else {
					message = header + " undefined";
				}
				this.driver.controllerLog.logNode(this.id, {
					endpoint: valueId.endpoint,
					message,
					level: "silly",
				});
			}

			// Figure out if optimistic value updates, both for the actual value
			// and related values, should be performed:
			const isAPIOptimistic = api.isSetValueOptimistic(valueId);

			// Whether the device class has slow actuators (e.g. motors, window coverings)
			const isSlowActuator =
				isActuatorCC(valueId.commandClass)
				&& !!endpointInstance.deviceClass?.specific.isSlowActuator;
			// Whether the device has at least started executing the command
			const supervisedAndAccepted = supervisedCommandSucceeded(result);
			// Whether the device has completed the command successfully
			const supervisedAndCompletedSuccessfully =
				isSupervisionResult(result)
				&& result.status === SupervisionStatus.Success;
			// For unsupervised commands that did not fail, we let the application decide whether
			// to update the (related) value optimistically
			const unsupervisedAndOptimisticValueUpdateEnabled =
				!this.driver.options.disableOptimisticValueUpdate
				&& result == undefined;

			// The actual value may be updated optimistically once the command has started.
			const shouldUpdateActualValueOptimistically =
				isAPIOptimistic
				// For slow actuators, this is only allowed when the value is a
				// target value that is distinct from the current physical state.
				&& (!isSlowActuator || hooks?.isSplitStateTargetValue)
				&& (supervisedAndAccepted
					|| unsupervisedAndOptimisticValueUpdateEnabled);
			// Related values may only be updated optimistically once the command has completed successfully
			const shouldUpdateRelatedValuesOptimistically =
				isAPIOptimistic
				// And only for fast actuators or non-actuators
				&& !isSlowActuator
				&& (supervisedAndCompletedSuccessfully
					|| unsupervisedAndOptimisticValueUpdateEnabled);

			// If optimistic value updats are desired, update the value in the value DB now
			if (shouldUpdateActualValueOptimistically) {
				const emitEvent =
					!!result
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
				// The actual API implementation handles additional optimistic updates
				if (shouldUpdateRelatedValuesOptimistically) {
					hooks.optimisticallyUpdateRelatedValues?.(
						supervisedAndCompletedSuccessfully,
					);
				}

				// Verify the current value after a delay when the command
				// hasn't already completed successfully, the device is a slow
				// actuator, or the CC API forces verification.
				if (
					!supervisedCommandSucceeded(result)
					|| isSlowActuator
					|| hooks.forceVerifyChanges?.()
				) {
					// Let the CC API implementation handle the verification.
					// It may still decide not to do it.
					await hooks.verifyChanges?.(result);
				}
			}

			// Handle CC-specific side effects after setValue completes
			if (isUnsupervisedOrSucceeded(result)) {
				this.handleSetValueSideEffects(valueId, value);
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
						}, code ${getEnumMemberName(
							ZWaveErrorCodes,
							e.code,
						)}): ${e.message}`,
						level: "silly",
					});
				}

				if (result) return result;
			}
			throw e;
		}
	}

	/**
	 * Handles CC-specific side effects after a value has been set successfully.
	 */
	private handleSetValueSideEffects(valueId: ValueID, value: unknown): void {
		if (
			SoundSwitchCCValues.toneId.is(valueId)
			&& typeof value === "number"
		) {
			handleSoundSwitchSetValue(
				this.driver,
				this,
				this.soundSwitchHandlerStore,
				valueId.endpoint ?? 0,
				value,
			);
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

		// For the controller, look at proprietary implementations to poll the value
		if (this.isControllerNode) {
			const proprietary = this.driver.controller.proprietary;
			for (const impl of Object.values(proprietary)) {
				if (typeof impl.pollValue === "function") {
					return impl.pollValue(valueId);
				}
			}
		}

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
			// We do not want to delay more important communication by polling, so...
			// ...don't retry
			maxSendAttempts: 1,
			// ...and give it the lowest priority for user interactions
			priority: MessagePriority.NodeQuery,
			// ...unless overwritten by the options
			...sendCommandOptions,
		});

		// Check if the pollValue method is implemented
		if (!api.pollValue) {
			throw new ZWaveError(
				`The pollValue API is not implemented for CC ${getCCName(
					valueId.commandClass,
				)}!`,
				ZWaveErrorCodes.CC_NoAPI,
			);
		}

		// And call it
		return (api.pollValue as PollValueImplementation<T>).call(api, {
			property: valueId.property,
			propertyKey: valueId.propertyKey,
		});
	}

	/** Returns a list of all `"notification"` event arguments that are known to be supported by this node */
	public getSupportedNotificationEvents(): ZWaveNotificationCapability[] {
		return nodeUtils.getSupportedNotificationEvents(this.driver, this);
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
	public interview(): Promise<void> {
		// The initial interview of the controller node is always done
		// and cannot be deferred.
		if (this.isControllerNode) return Promise.resolve();

		if (!this.driver.options.interview?.disableOnNodeAdded) {
			throw new ZWaveError(
				`Calling ZWaveNode.interview() is not allowed because automatic node interviews are enabled. Wait for the driver to interview the node or use ZWaveNode.refreshInfo() to re-interview a node.`,
				ZWaveErrorCodes.Driver_FeatureDisabled,
			);
		}

		return this.driver.interviewNodeInternal(this);
	}

	/** @internal */
	public getInterviewTask(): Promise<void> | TaskBuilder<void> {
		const self = this;

		if (self.interviewStage === InterviewStage.Complete) {
			return Promise.resolve();
		}

		if (self.failedS2Bootstrapping) {
			self.driver.controllerLog.logNode(
				self.id,
				"has failed S2 bootstrapping and cannot be interviewed",
				"warn",
			);
			return Promise.resolve();
		}

		// Return the existing task's promise if already running
		const existingTask = self.driver.scheduler.findTask<void>(
			(t) => t.tag?.id === "interview" && t.tag.nodeId === self.id,
		);
		if (existingTask) return existingTask;

		// Prioritize sleepy nodes over always-listening ones, since their
		// availability window is limited to the time they are awake
		const priority = self.canSleep ? TaskPriority.Low : TaskPriority.Lower;

		let keepAwake: boolean;

		return {
			priority,
			tag: { id: "interview", nodeId: self.id },
			group: { id: "interview" },
			task: async function* interviewTask() {
				keepAwake = self.keepAwake;
				self.keepAwake = true;

				const maxAttempts = self.driver.options.attempts.nodeInterview;

				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					yield;

					// Exit while the node is asleep. The interview is
					// re-queued when it wakes up.
					const statusBeforeAttempt: NodeStatus = self.status;
					if (statusBeforeAttempt === NodeStatus.Asleep) return;

					const success: boolean = yield* self.interviewInternal();

					if (success) {
						// Report missing device config on success
						if (
							self.manufacturerId != undefined
							&& self.productType != undefined
							&& self.productId != undefined
							&& self.firmwareVersion != undefined
							&& !self.deviceConfig
							&& getenv("NODE_ENV") !== "test"
						) {
							void reportMissingDeviceConfig(
								self.driver,
								self as any,
							).catch(noop);
						}
						return;
					}

					// Node is asleep - exit and wait for wake-up to re-queue
					if (self.status === NodeStatus.Asleep) {
						return;
					}

					if (self.status === NodeStatus.Dead) {
						self.driver.controllerLog.logNode(
							self.id,
							`Interview attempt (${self.interviewAttempts}/${maxAttempts}) failed, node is dead.`,
							"warn",
						);
						self.emit("interview failed", self, {
							errorMessage: "The node is dead",
							isFinal: true,
						});
						return;
					}

					if (attempt >= maxAttempts) {
						self.driver.controllerLog.logNode(
							self.id,
							`Failed all interview attempts, giving up.`,
							"warn",
						);
						self.emit("interview failed", self, {
							errorMessage: `Maximum interview attempts reached`,
							isFinal: true,
							attempt: maxAttempts,
							maxAttempts,
						});
						return;
					}

					const retryTimeout = Math.min(30000, attempt * 5000);
					self.driver.controllerLog.logNode(
						self.id,
						`Interview attempt ${self.interviewAttempts}/${maxAttempts} failed, retrying in ${retryTimeout} ms...`,
						"warn",
					);
					self.emit("interview failed", self, {
						errorMessage: `Attempt ${self.interviewAttempts}/${maxAttempts} failed`,
						isFinal: false,
						attempt: self.interviewAttempts,
						maxAttempts,
					});

					yield* waitFor(wait(retryTimeout, true));
				}
			},
			cleanup: async () => {
				// Reject pending transactions from an unfinished interview
				if (self.interviewStage !== InterviewStage.Complete) {
					await self.driver.rejectTransactions(
						(t) =>
							t.message.getNodeId() === self.id
							&& t.tag === "interview",
						"The interview was restarted",
						ZWaveErrorCodes.Controller_InterviewRestarted,
					);
				}
				// Restore keepAwake state
				self.keepAwake = keepAwake;
				if (!keepAwake) {
					setImmediate(() => {
						self.driver.debounceSendNodeToSleep(self);
					});
				}
			},
		};
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

		// Interview tasks are deduplicated, resetting/transferring the node status is not.
		// Bail here if a refresh is already scheduled to avoid inconsistent node information.
		if (this._refreshInfoPending) return;
		this._refreshInfoPending = true;

		try {
			const { resetSecurityClasses = false, waitForWakeup = true } =
				options;

			// Unless desired, don't forget the information about sleeping nodes immediately, so they continue to function
			let didWakeUp = false;
			const wasAwake = this.status === NodeStatus.Awake;
			if (
				waitForWakeup
				&& this.canSleep
				&& !wasAwake
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

			// Cancel the existing interview task (runs its cleanup, rejects in-flight transactions)
			await this.driver.scheduler.removeTasks(
				(t) => t.tag?.id === "interview" && t.tag.nodeId === this.id,
				new ZWaveError(
					"The interview was restarted",
					ZWaveErrorCodes.Controller_InterviewRestarted,
				),
			);

			// preserve the node name and location, since they might not be stored on the node
			const name = this.name;
			const location = this.location;

			// Preserve user codes if they aren't queried during the interview
			const preservedValues: (ValueID & { value: unknown })[] = [];
			const preservedMetadata: (ValueID & {
				metadata: ValueMetadata;
			})[] = [];
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
			this.deviceConfig = undefined;
			this._endpointGroups = undefined;
			this.currentDeviceConfigHash = undefined;
			this.cachedDeviceConfigHash = undefined;
			this._hasEmittedNoS0NetworkKeyError = false;
			this._hasEmittedNoS2NetworkKeyError = false;
			for (const ep of this.getAllEndpoints()) {
				ep["reset"]();
			}
			this._valueDB.clear({ noEvent: true });
			this._endpointInstances.clear();
			super.reset();

			// Restart all state machines
			this.restartReadyMachine();
			this.restartStatusMachine();

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
				this.valueDB.setMetadata(valueId, metadata, {
					noEvent: true,
				});
			}

			// Don't keep the node awake after the interview
			this.keepAwake = false;

			// If we did wait for the wakeup, mark the node as awake again so it does not
			// get considered asleep after querying protocol info.
			if (didWakeUp || wasAwake) {
				// Re-interviewing forgets the node's capabilities. To be able to mark it
				// as awake, we need to set those again.
				this.isListening = false;
				this.isFrequentListening = false;

				this.markAsAwake();
			}

			// Queue a fresh interview
			void this.driver.interviewNodeInternal(this);
		} finally {
			this._refreshInfoPending = false;
		}
	}

	/**
	 * @internal
	 * Interviews this node. Returns true when it succeeded, false otherwise
	 *
	 * WARNING: Do not call this method from application code. To refresh the information
	 * for a specific node, use `node.refreshInfo()` instead
	 */
	public async *interviewInternal(): AsyncGenerator<
		(() => Promise<unknown>) | undefined,
		boolean
	> {
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
			// Reset the progress baseline and announce the 0% starting point for a fresh interview
			this.resetInterviewProgressBaseline();
			await this.queryProtocolInfo();
		}

		if (!this.isControllerNode) {
			// Sleeping nodes can't be reached until they wake up
			if (this.status === NodeStatus.Asleep) {
				return false;
			}

			if (
				(this.isListening || this.isFrequentListening)
				&& this.status !== NodeStatus.Alive
			) {
				// Ping non-sleeping nodes to determine their status
				if (!(await this.ping())) {
					// Not alive, abort the interview
					return false;
				}
			}

			if (this.interviewStage === InterviewStage.ProtocolInfo) {
				yield;
				this.reportInterviewStageStarted(InterviewStage.NodeInfo);
				try {
					yield* waitFor(this.interviewNodeInfo());
				} catch (e) {
					if (isTransmissionError(e)) return false;
					throw e;
				}
			}

			// At this point the basic interview of new nodes is done. Start here when re-interviewing known nodes
			// to get updated information about command classes
			if (this.interviewStage === InterviewStage.NodeInfo) {
				yield;
				this.reportInterviewStageStarted(InterviewStage.CommandClasses);
				// Only advance the interview if it was completed, otherwise abort
				if (yield* this.interviewCCs()) {
					this.setInterviewStage(InterviewStage.CommandClasses);
				} else {
					return false;
				}
			}
		}

		// After this point we should not yield - everything is basically instant anyways.

		if (
			(this.isControllerNode
				&& this.interviewStage === InterviewStage.ProtocolInfo)
			|| (!this.isControllerNode
				&& this.interviewStage === InterviewStage.CommandClasses)
		) {
			this.reportInterviewStageStarted(InterviewStage.OverwriteConfig);
			// Load a config file for this node if it exists and overwrite the previously reported information
			await this.overwriteConfig();
		}

		// Remember the state of the device config that is used for this node
		this.cachedDeviceConfigHash = await this.deviceConfig?.getHash();

		this.setInterviewStage(InterviewStage.Complete);
		this.reportInterviewStageStarted(InterviewStage.Complete);
		this.updateReadyMachine({ value: "INTERVIEW_DONE" });

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
		this.driver.requestStorage.set(FunctionType.GetNodeProtocolInfo, {
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
basic device class:    ${getEnumMemberName(
			BasicDeviceClass,
			this.deviceClass.basic,
		)}
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

	/**
	 * Pings the node to see if it responds
	 * @param tryReallyHard Whether the controller should resort to route resolution
	 * and explorer frames if the communication fails. Setting this option to `true`
	 * can result in multi-second delays.
	 */
	public async ping(tryReallyHard: boolean = false): Promise<boolean> {
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
			let api = this.commandClasses["No Operation"];
			// Enable route resolution and explorer frames if desired
			if (tryReallyHard) {
				api = api.withOptions({
					transmitOptions: TransmitOptions.DEFAULT,
				});
			}
			await api.send();
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
				// Tag as part of the interview, so the transaction gets
				// rejected when the interview is aborted
				const nodeInfo = await this.requestNodeInfo({
					tag: "interview",
				});
				this.driver.controllerLog.logNode(this.id, {
					message: logText(["node info received", "supported CCs:"], {
						nested: logList(nodeInfo.supportedCCs.map(getCCName)),
					}),
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

	public async requestNodeInfo(
		options?: SendMessageOptions,
	): Promise<NodeUpdatePayload> {
		const resp = await this.driver.sendMessage<
			RequestNodeInfoResponse | ApplicationUpdateRequest
		>(new RequestNodeInfoRequest({ nodeId: this.id }), options);
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
			this.driver.controllerLog.logNode(this.id, {
				message: logText(["node info received", "supported CCs:"], {
					nested: logList(
						resp.nodeInformation.supportedCCs.map(getCCName),
					),
				}),
				direction: "inbound",
			});
			return resp.nodeInformation;
		}
		throw new ZWaveError(
			`Received unexpected response to RequestNodeInfoRequest`,
			ZWaveErrorCodes.Controller_CommandError,
		);
	}

	protected async *interviewCCs(): AsyncGenerator<
		(() => Promise<unknown>) | undefined,
		boolean
	> {
		// Interviewing CCs happens in two phases, because the full amount of work is unknown up
		// front (endpoints are revealed by Multi Channel, secure CCs by Security):
		//
		// Discovery phase — establishes the complete CC inventory:
		//   - Root device: Security S2/S0 → Manufacturer Specific → Version (loads device config)
		//     → Wake Up → Multi Channel (discovers endpoints)
		//   - Endpoint prefix pass: Security S2/S0 → Version per endpoint; remembers each
		//     endpoint's interview order
		//
		// Bulk phase — inventory is final, interview the rest:
		//   - Root device non-application CCs
		//   - Each endpoint's remaining CCs
		//   - Root device application CCs
		//   - Basic CC for root device and endpoints
		//
		// Progress reporting (see the InterviewProgress mixin) mirrors this:
		//   - Discovery: each CC advances the CommandClasses band by a small, capped fixed amount
		//   - Bulk: the remaining band is split proportionally to the remaining interview weight.
		//     CCs can report sub-progress in their progress slice.
		if (this.isControllerNode) {
			this.driver.controllerLog.logNode(
				this.id,
				"is the controller node, cannot interview CCs",
				"warn",
			);
			return true;
		}

		// Reset the per-stage progress tracking for this run of the CC interview
		this.resetCCInterviewProgress();

		const securityManager2 = this.driver.getSecurityManager2(this.id);

		const runCCInterview = async (
			endpoint: Endpoint,
			cc: CommandClasses,
			force: boolean,
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
					`Skipping interview for secure CC ${getCCName(
						cc,
					)} because no network key is configured!`,
					"error",
				);
				return "continue";
			}

			// Skip this step if the CC was already interviewed
			if (instance.isInterviewComplete(this.driver)) {
				return "continue";
			}

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

		/**
		 * @param force When this is `true`, the interview will be attempted even when the CC is not supported by the endpoint.
		 */
		const interviewEndpoint = async (
			endpoint: Endpoint,
			cc: CommandClasses,
			force: boolean = false,
		): Promise<"continue" | false | void> => {
			// Reserve a progress slice for this CC so that fine-grained progress
			// reported during its interview maps into the correct range.
			this.reserveCCInterviewStepProgress(endpoint.index, cc);
			const result = await runCCInterview(endpoint, cc, force);
			// Count this CC as completed (interviewed or skipped) unless the interview was aborted
			if (result !== false) this.completeCCInterviewStepProgress();
			return result;
		};

		// =====================================================================
		// Discovery phase: root device
		// -> Security, device identification, discover endpoints

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
						const errorMessage = `supports Security S2, but no S2 network keys were configured. The interview might not include all functionality.`;
						this.driver.controllerLog.logNode(
							this.id,
							errorMessage,
							"error",
						);
						this.driver.emit(
							"error",
							new ZWaveError(
								`Node ${this.id
									.toString()
									.padStart(3, "0")} ${errorMessage}`,
								ZWaveErrorCodes.Controller_NodeInsecureCommunication,
							),
						);
						this._hasEmittedNoS2NetworkKeyError = true;
					}
				} else {
					const action = yield* waitFor(
						interviewEndpoint(this, CommandClasses["Security 2"]),
					);
					if (typeof action === "boolean") return action;
				}
			}
		} else {
			// If there is any doubt about granted S2 security classes, we now know they are not granted
			for (const secClass of [
				SecurityClass.S2_AccessControl,
				SecurityClass.S2_Authenticated,
				SecurityClass.S2_Unauthenticated,
			] as const) {
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
						const errorMessage = `supports Security S0, but the S0 network key was not configured. The interview might not include all functionality.`;
						this.driver.controllerLog.logNode(
							this.id,
							errorMessage,
							"error",
						);
						this.driver.emit(
							"error",
							new ZWaveError(
								`Node ${this.id
									.toString()
									.padStart(3, "0")} ${errorMessage}`,
								ZWaveErrorCodes.Controller_NodeInsecureCommunication,
							),
						);
						this._hasEmittedNoS0NetworkKeyError = true;
					}
				} else {
					const action = yield* waitFor(
						interviewEndpoint(this, CommandClasses.Security),
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

			const action = yield* waitFor(
				interviewEndpoint(
					this,
					CommandClasses["Manufacturer Specific"],
				),
			);
			if (typeof action === "boolean") return action;
		}

		if (this.supportsCC(CommandClasses.Version)) {
			this.driver.controllerLog.logNode(
				this.id,
				"Root device interview: Version",
				"silly",
			);

			const action = yield* waitFor(
				interviewEndpoint(this, CommandClasses.Version),
			);
			if (typeof action === "boolean") return action;

			// After the version CC interview of the root endpoint, we have enough info to load the correct device config file
			await this.loadDeviceConfig();

			// At this point we may need to make some changes to the CCs the device reports for the root endpoint
			this.applyCommandClassesCompatFlag(0);
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

			const action = yield* waitFor(
				interviewEndpoint(this, CommandClasses["Wake Up"]),
			);
			if (typeof action === "boolean") return action;
		}

		this.modifySupportedCCBeforeInterview(this);

		// In order to be able to approximate the interview progress, we need to know
		// early which endpoints exist and which CCs have to be interviewed on them.
		if (this.supportsCC(CommandClasses["Multi Channel"])) {
			this.driver.controllerLog.logNode(
				this.id,
				"Root device interview: Multi Channel",
				"silly",
			);

			const action = yield* waitFor(
				interviewEndpoint(this, CommandClasses["Multi Channel"]),
			);
			if (typeof action === "boolean") return action;

			// Now that the Multi Channel interview has discovered the endpoints, we may need to
			// make some more changes to the CCs the device reports. This time, the non-root
			// endpoints are relevant.
			this.applyCommandClassesCompatFlag();
		}

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
			// Multi Channel is interviewed early because it discovers the endpoints
			CommandClasses["Multi Channel"],
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

		this.driver.controllerLog.logNode(this.id, {
			message: logText("Root device interviews before endpoints:", {
				nested: logList(
					rootInterviewOrderBeforeEndpoints.map(getCCName),
				),
			}),
			level: "silly",
		});

		this.driver.controllerLog.logNode(this.id, {
			message: logText("Root device interviews after endpoints:", {
				nested: logList(
					rootInterviewOrderAfterEndpoints.map(getCCName),
				),
			}),
			level: "silly",
		});

		// =====================================================================
		// Discovery phase: endpoints
		// -> discover supported CCs on each endpoint that differ from the root device
		const endpointInterviewOrders = new Map<number, CommandClasses[]>();
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
			const endpointMissingS2 =
				securityClassIsS2(securityClass)
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
				if (securityClassIsS2(securityClass) && !!securityManager2) {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: endpoint.index,
						message: `Endpoint ${endpoint.index} interview: Security S2`,
						level: "silly",
					});

					const action = yield* waitFor(
						interviewEndpoint(
							endpoint,
							CommandClasses["Security 2"],
						),
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
						message: `Endpoint ${endpoint.index} interview: Security S0`,
						level: "silly",
					});

					const action = yield* waitFor(
						interviewEndpoint(endpoint, CommandClasses.Security),
					);
					if (typeof action === "boolean") return action;
				}
			}

			// It has been found that legacy nodes do not always advertise the S0 Command Class in their Multi
			// Channel Capability Report and still accept all their Command Class using S0 encapsulation.
			// A controlling node SHOULD try to control End Points with S0 encapsulation even if S0 is not
			// listed in the Multi Channel Capability Report.

			const endpointMissingS0 =
				securityClass === SecurityClass.S0_Legacy
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
					endpoint.supportsCC(t.ccId),
				);
				if (foundTest) {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: endpoint.index,
						message: `is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Testing if it accepts secure commands anyways.`,
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
							message: `Endpoint ${endpoint.index} accepts/expects secure commands`,
							level: "silly",
						});
						// Mark all endpoint CCs as secure
						for (const [ccId] of endpoint.getCCs()) {
							endpoint.addCC(ccId, { secure: true });
						}
					} else {
						this.driver.controllerLog.logNode(this.id, {
							endpoint: endpoint.index,
							message: `Endpoint ${endpoint.index} is actually not using S0`,
							level: "silly",
						});
						// Mark the CC as not secure again
						endpoint.addCC(ccId, { secure: false });
					}
				} else {
					this.driver.controllerLog.logNode(this.id, {
						endpoint: endpoint.index,
						message: `is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Found no way to test if accepts secure commands anyways.`,
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
					message: `Endpoint ${endpoint.index} interview: ${getCCName(
						CommandClasses.Version,
					)}`,
					level: "silly",
				});

				const action = yield* waitFor(
					interviewEndpoint(endpoint, CommandClasses.Version, true),
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
				message: logText(
					`Endpoint ${endpoint.index} interview order:`,
					{
						nested: logList(endpointInterviewOrder.map(getCCName)),
					},
				),
				level: "silly",
			});

			// Remember the order; the actual CC interview happens in the bulk phase below
			endpointInterviewOrders.set(endpointIndex, endpointInterviewOrder);
		}

		// =====================================================================
		// Discovery → bulk boundary
		// We now know exactly which CCs are supported, so we can switch to
		// proportional progress reporting.

		// Basic CC is interviewed conditionally at the very end (root device + each endpoint),
		// outside the interview orders above. Include an allowance for it so the bar keeps
		// moving during those interviews instead of sitting at the band end.
		const remainingBasicCCs = Array.from(
			{ length: 1 + endpointInterviewOrders.size },
			() => CommandClasses.Basic,
		);
		this.setupCCInterviewBulkProgress(
			rootInterviewOrderBeforeEndpoints,
			...endpointInterviewOrders.values(),
			rootInterviewOrderAfterEndpoints,
			remainingBasicCCs,
		);

		// =====================================================================
		// Bulk phase: root device
		// -> Remaining non-application CCs
		for (const cc of rootInterviewOrderBeforeEndpoints) {
			this.driver.controllerLog.logNode(
				this.id,
				`Root device interview: ${getCCName(cc)}`,
				"silly",
			);

			const action = yield* waitFor(interviewEndpoint(this, cc));
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		// =====================================================================
		// Bulk phase: endpoints
		// -> All remaining CCs
		for (const endpointIndex of this.getEndpointIndizes()) {
			const endpoint = this.getEndpoint(endpointIndex);
			if (!endpoint) continue;
			const endpointInterviewOrder =
				endpointInterviewOrders.get(endpointIndex);
			if (!endpointInterviewOrder) continue;

			// Now that we know the correct order, do the interview in sequence
			for (const cc of endpointInterviewOrder) {
				this.driver.controllerLog.logNode(this.id, {
					endpoint: endpoint.index,
					message: `Endpoint ${endpoint.index} interview: ${getCCName(
						cc,
					)}`,
					level: "silly",
				});

				const action = yield* waitFor(interviewEndpoint(endpoint, cc));
				if (action === "continue") continue;
				else if (typeof action === "boolean") return action;
			}
		}

		// =====================================================================
		// Bulk phase: root device
		// -> Application CCs
		for (const cc of rootInterviewOrderAfterEndpoints) {
			this.driver.controllerLog.logNode(
				this.id,
				`Root device interview: ${getCCName(cc)}`,
				"silly",
			);

			const action = yield* waitFor(interviewEndpoint(this, cc));
			if (action === "continue") continue;
			else if (typeof action === "boolean") return action;
		}

		// =====================================================================
		// Bulk phase: Basic CC -> Figure out if it is supposed to be supported
		// First on the root device
		const compat = this.deviceConfig?.compat;
		if (
			!this.wasCCRemovedViaConfig(CommandClasses.Basic)
			&& this.getCCVersion(CommandClasses.Basic) > 0
		) {
			// When Basic Sets are mapped to another supported CC, we don't need
			// to interview Basic CC at all, and we can hide the values.
			const basicSetMappingTarget =
				compat?.mapBasicSet === "Binary Sensor"
					? CommandClasses["Binary Sensor"]
					: compat?.mapBasicSet === "auto"
						? getBasicMappingTarget(this.deviceClass)
						: undefined;

			const basicSetMappingWillSucceed =
				basicSetMappingTarget != undefined
				&& this.supportsCC(basicSetMappingTarget);

			if (
				this.wasCCSupportAddedViaConfig(CommandClasses.Basic)
				|| (this.maySupportBasicCC() && !basicSetMappingWillSucceed)
			) {
				// Either the device probably supports Basic CC and is allowed to.
				// Or we force-added support through a config file.
				// Interview the Basic CC to figure out if it actually supports it
				this.driver.controllerLog.logNode(
					this.id,
					`Root device interview: ${getCCName(CommandClasses.Basic)}`,
					"silly",
				);

				const action = yield* waitFor(
					interviewEndpoint(this, CommandClasses.Basic, true),
				);
				if (typeof action === "boolean") return action;
			} else if (basicSetMappingWillSucceed) {
				// Hide the Basic CC because its functionality is exposed through another CC
				this.removeCC(CommandClasses.Basic);
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

			const basicSetMappingTarget =
				compat?.mapBasicSet === "Binary Sensor"
					? CommandClasses["Binary Sensor"]
					: compat?.mapBasicSet === "auto"
						? getBasicMappingTarget(endpoint.deviceClass)
						: undefined;

			const basicSetMappingWillSucceed =
				basicSetMappingTarget != undefined
				&& endpoint.supportsCC(basicSetMappingTarget);

			if (
				endpoint.wasCCSupportAddedViaConfig(CommandClasses.Basic)
				|| (endpoint.maySupportBasicCC() && !basicSetMappingWillSucceed)
			) {
				// The endpoint probably supports Basic CC and is allowed to.
				// Or we force-added support through a config file.
				// Interview the Basic CC to figure out if it actually supports it
				this.driver.controllerLog.logNode(this.id, {
					endpoint: endpoint.index,
					message: `Endpoint ${endpoint.index} interview: Basic CC`,
					level: "silly",
				});

				const action = yield* waitFor(
					interviewEndpoint(endpoint, CommandClasses.Basic, true),
				);
				if (typeof action === "boolean") return action;
			} else if (basicSetMappingWillSucceed) {
				// Hide the Basic CC because its functionality is exposed through another CC
				endpoint.removeCC(CommandClasses.Basic);
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
			// CC:0000.00.00.12.004: Nodes SHOULD NOT advertise controlled CCs, so we normally
			// ignore them. However, some devices advertise CCs like Scene Activation ONLY as
			// controlled, so we remember the controlled list as well. Whether values are exposed
			// for a controlled CC is decided separately in getDefinedValueIDs().
			for (const cc of nodeInfo.controlledCCs ?? []) {
				if (cc === CommandClasses.Basic) {
					// Basic CC MUST not be in the NIF and we have special rules to determine support
					continue;
				}
				this.addCC(cc, { isControlled: true });
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
			const delay =
				this.deviceConfig?.compat?.manualValueRefreshDelayMs || 0;
			this.driver.controllerLog.logNode(this.id, {
				message: `Node does not send unsolicited updates; refreshing actuator and sensor values${
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
						`failed to interview CC ${getCCName(
							cc,
						)}, endpoint ${endpoint.index}: ${getErrorMessage(e)}`,
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
						`failed to refresh values for ${getCCName(
							cc,
						)}, endpoint ${endpoint.index}: ${getErrorMessage(e)}`,
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
	public refreshValues(): Promise<void> {
		const task = this.getRefreshValuesTask("user");
		const promise =
			task instanceof Promise
				? task
				: this.driver.scheduler.queueTask(task);
		// A canceled refresh is not an error
		return promise.catch(noop);
	}

	/**
	 * Refreshes the values of all CCs that should be reporting regularly, but haven't been updated recently
	 * @internal
	 */
	public autoRefreshValues(): Promise<void> {
		// Do not attempt to communicate with dead nodes automatically
		if (this.status === NodeStatus.Dead) return Promise.resolve();

		const task = this.getRefreshValuesTask("auto");
		const promise =
			task instanceof Promise
				? task
				: this.driver.scheduler.queueTask(task);
		// A canceled refresh is not an error
		return promise.catch(noop);
	}

	private _refreshValuesKeepAwake: boolean | undefined;

	private getRefreshValuesTask(
		mode: "user" | "auto",
	): Promise<void> | TaskBuilder<void> {
		// User-requested and automatic refreshes query different CC sets,
		// so they are deduplicated separately
		const existingTask = this.driver.scheduler.findTask<void>(
			(t) =>
				t.tag?.id === "refresh-values"
				&& t.tag.nodeId === this.id
				&& t.tag.mode === mode,
		);
		if (existingTask) return existingTask;

		const self = this;
		let removeSleepListener: (() => void) | undefined;

		// Prioritize sleepy nodes over always-listening ones, since their
		// availability window is limited to the time they are awake
		const priority = self.canSleep ? TaskPriority.Low : TaskPriority.Lower;

		// Keep sleepy nodes awake while the refresh is queued, otherwise they
		// may be sent to sleep before the task gets a chance to run. The first
		// queued refresh task remembers the original keepAwake state.
		self._refreshValuesKeepAwake ??= self.keepAwake;
		self.keepAwake = true;

		return {
			// Value refreshes can cause a lot of traffic. Execute them in the background.
			priority,
			tag: { id: "refresh-values", nodeId: self.id, mode },
			group: { id: "value-refresh" },
			task: async function* refreshValuesTask() {
				// Detect the node falling asleep, so pending queries in the
				// wakeup queue don't stall the task until the next wakeup
				const nodeAsleep = new Promise<void>((resolve) => {
					const listener = () => resolve();
					self.once("sleep", listener);
					removeSleepListener = () => self.off("sleep", listener);
				});

				for (const endpoint of self.getAllEndpoints()) {
					for (const cc of endpoint.getSupportedCCInstances() as readonly SinglecastCC<CommandClass>[]) {
						if (mode === "user") {
							// Only query actuator and sensor CCs
							if (
								!actuatorCCs.includes(cc.ccId)
								&& !sensorCCs.includes(cc.ccId)
							) {
								continue;
							}
						} else {
							if (!cc.shouldRefreshValues(self.driver)) continue;
						}

						yield;

						// Sleeping and dead nodes cannot be queried
						if (
							self.status === NodeStatus.Asleep
							|| self.status === NodeStatus.Dead
						) {
							return;
						}

						if (mode === "auto") {
							self.driver.controllerLog.logNode(self.id, {
								message: `${getCCName(
									cc.ccId,
								)} CC values may be stale, refreshing...`,
								endpoint: endpoint.index,
								direction: "outbound",
							});
						}

						const refreshCCValues = async () => {
							try {
								if (mode === "user") {
									await cc.refreshValues(self.driver);
								} else {
									await cc.refreshValues(self.driver, {
										priority: MessagePriority.Poll,
									});
								}
							} catch (e) {
								self.driver.controllerLog.logNode(self.id, {
									message: `failed to refresh values for ${getCCName(
										cc.ccId,
									)} CC: ${getErrorMessage(e)}`,
									endpoint: endpoint.index,
									level: "error",
								});
							}
						};

						// Abandon the refresh when the node falls asleep mid-query.
						// The wake-up triggers a new refresh of stale values.
						const completed: boolean = yield* waitFor(
							Promise.race([
								refreshCCValues().then(() => true),
								nodeAsleep.then(() => false),
							]),
						);
						if (!completed) return;
					}
				}
			},
			cleanup: () => {
				removeSleepListener?.();
				// Restore the original keepAwake state when the last pending
				// refresh task for this node finishes
				const otherPending = self.driver.scheduler.findTask(
					(t) =>
						t.tag?.id === "refresh-values"
						&& t.tag.nodeId === self.id,
				);
				if (
					!otherPending
					&& self._refreshValuesKeepAwake != undefined
				) {
					const keepAwake = self._refreshValuesKeepAwake;
					self._refreshValuesKeepAwake = undefined;
					self.keepAwake = keepAwake;
					if (!keepAwake) {
						setImmediate(() => {
							self.driver.debounceSendNodeToSleep(self);
						});
					}
				}
				return Promise.resolve();
			},
		};
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

	private centralSceneHandlerStore = getDefaultCentralSceneHandlerStore();
	private clockHandlerStore = getDefaultClockHandlerStore();
	private hailHandlerStore = getDefaultHailHandlerStore();
	private notificationHandlerStore = getDefaultNotificationHandlerStore();
	private soundSwitchHandlerStore = getDefaultSoundSwitchHandlerStore();
	private entryControlHandlerStore = getDefaultEntryControlHandlerStore();

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
			&& this.deviceConfig?.compat?.mapRootReportsToEndpoint != undefined
		) {
			const endpoint = this.getEndpoint(
				this.deviceConfig?.compat?.mapRootReportsToEndpoint,
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
			this.driver.controllerLog.logNode(this.id, {
				endpoint: endpoint.index,
				direction: "inbound",
				message: `Ignoring ${command.constructor.name} because CC support was removed via config file`,
			});
			return;
		}

		if (command instanceof BasicCC) {
			return handleBasicCommand(this.driver, this, command);
		} else if (command instanceof MultilevelSwitchCC) {
			return handleMultilevelSwitchCommand(this.driver, this, command);
		} else if (command instanceof BinarySwitchCCSet) {
			return handleBinarySwitchCommand(this.driver, this, command);
		} else if (command instanceof ThermostatModeCCSet) {
			return handleThermostatModeCommand(this.driver, this, command);
		} else if (command instanceof CentralSceneCCNotification) {
			return handleCentralSceneNotification(
				this.driver,
				this,
				command,
				this.centralSceneHandlerStore,
			);
		} else if (command instanceof WakeUpCCWakeUpNotification) {
			return handleWakeUpNotification(this.driver, this, command);
		} else if (command instanceof NotificationCCReport) {
			return handleNotificationReport(
				this.driver,
				this,
				command,
				this.notificationHandlerStore,
			);
		} else if (command instanceof BatteryCCReport) {
			return handleBatteryReport(this.driver, this, command);
		} else if (command instanceof ClockCCReport) {
			return handleClockReport(
				this.driver,
				this,
				command,
				this.clockHandlerStore,
			);
		} else if (command instanceof HailCC) {
			return handleHail(
				this.driver,
				this,
				command,
				this.hailHandlerStore,
			);
		} else if (command instanceof FirmwareUpdateMetaDataCCGet) {
			return this.handleUnexpectedFirmwareUpdateGet(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCMetaDataGet) {
			return this.handleFirmwareUpdateMetaDataGet(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCRequestGet) {
			return this.handleFirmwareUpdateRequestGet(command);
		} else if (command instanceof FirmwareUpdateMetaDataCCPrepareGet) {
			return this.handleFirmwareUpdatePrepareGet(command);
		} else if (command instanceof EntryControlCCNotification) {
			return handleEntryControlNotification(
				this.driver,
				this,
				command,
				this.entryControlHandlerStore,
			);
		} else if (command instanceof UserCredentialCCUserReport) {
			return handleUserCredentialUserReport(this, command);
		} else if (command instanceof UserCredentialCCCredentialReport) {
			return handleUserCredentialCredentialReport(this, command);
		} else if (command instanceof UserCredentialCCCredentialLearnReport) {
			return handleUserCredentialCredentialLearnReport(this, command);
		} else if (command instanceof UserCredentialCCAssociationReport) {
			return handleUserCredentialAssociationReport(this, command);
		} else if (command instanceof TimeCCTimeGet) {
			return handleTimeGet(this.driver, this, command);
		} else if (command instanceof TimeCCDateGet) {
			return handleDateGet(this.driver, this, command);
		} else if (command instanceof TimeCCTimeOffsetGet) {
			return handleTimeOffsetGet(this.driver, this, command);
		} else if (command instanceof ZWavePlusCCGet) {
			return handleZWavePlusGet(
				this.driver,
				this,
				command,
				this.driver.options.vendor,
			);
		} else if (command instanceof VersionCCGet) {
			return handleVersionGet(
				this.driver,
				this.driver.controller,
				this,
				command,
				this.driver.options.vendor,
			);
		} else if (command instanceof VersionCCCommandClassGet) {
			// If the application has disabled this CC, set the version to 0
			// This should be all we need to do, as there are currently no CCs with
			// requirements for applications where we also respond to Get requests
			let reportVersion: number | undefined;
			if (
				this.driver.options.features.disableCommandClasses?.includes(
					command.requestedCC,
				)
			) {
				reportVersion = 0;
			}

			return handleVersionCommandClassGet(
				this.driver,
				this,
				command,
				reportVersion,
			);
		} else if (command instanceof VersionCCCapabilitiesGet) {
			return handleVersionCapabilitiesGet(this.driver, this, command);
		} else if (command instanceof ManufacturerSpecificCCDeviceSpecificGet) {
			return handleManufacturerSpecificDeviceSpecificGet(
				this.driver,
				this,
				command,
				this.driver.options.vendor,
			);
		} else if (command instanceof ManufacturerSpecificCCGet) {
			return handleManufacturerSpecificGet(
				this.driver,
				this,
				command,
				this.driver.options.vendor,
			);
		} else if (command instanceof AssociationGroupInfoCCNameGet) {
			return handleAGINameGet(this.driver, this, command);
		} else if (command instanceof AssociationGroupInfoCCInfoGet) {
			return handleAGIInfoGet(this.driver, this, command);
		} else if (command instanceof AssociationGroupInfoCCCommandListGet) {
			return handleAGICommandListGet(this.driver, this, command);
		} else if (command instanceof AssociationCCSupportedGroupingsGet) {
			return handleAssociationSupportedGroupingsGet(
				this.driver,
				this,
				command,
			);
		} else if (command instanceof AssociationCCGet) {
			return handleAssociationGet(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof AssociationCCSet) {
			return handleAssociationSet(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof AssociationCCRemove) {
			return handleAssociationRemove(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof AssociationCCSpecificGroupGet) {
			return handleAssociationSpecificGroupGet(
				this.driver,
				this,
				command,
			);
		} else if (
			command instanceof MultiChannelAssociationCCSupportedGroupingsGet
		) {
			return handleMultiChannelAssociationSupportedGroupingsGet(
				this.driver,
				this,
				command,
			);
		} else if (command instanceof MultiChannelAssociationCCGet) {
			return handleMultiChannelAssociationGet(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof MultiChannelAssociationCCSet) {
			return handleMultiChannelAssociationSet(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof MultiChannelAssociationCCRemove) {
			return handleMultiChannelAssociationRemove(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof IndicatorCCSupportedGet) {
			return handleIndicatorSupportedGet(this.driver, this, command);
		} else if (command instanceof IndicatorCCSet) {
			return handleIndicatorSet(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof IndicatorCCGet) {
			return handleIndicatorGet(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof IndicatorCCDescriptionGet) {
			return handleIndicatorDescriptionGet(this.driver, this, command);
		} else if (command instanceof PowerlevelCCSet) {
			return handlePowerlevelSet(this.driver, this, command);
		} else if (command instanceof PowerlevelCCGet) {
			return handlePowerlevelGet(this.driver, this, command);
		} else if (command instanceof PowerlevelCCTestNodeSet) {
			return handlePowerlevelTestNodeSet(this.driver, this, command);
		} else if (command instanceof PowerlevelCCTestNodeGet) {
			return handlePowerlevelTestNodeGet(this.driver, this, command);
		} else if (command instanceof PowerlevelCCTestNodeReport) {
			return handlePowerlevelTestNodeReport(this.driver, this, command);
		} else if (command instanceof DeviceResetLocallyCCNotification) {
			return handleDeviceResetLocallyNotification(
				this.driver,
				this.driver.controller,
				this,
				command,
			);
		} else if (command instanceof ApplicationStatusCCBusy) {
			return handleApplicationBusy(
				this.driver,
				this.driver,
				this,
				command,
			);
		} else if (command instanceof MultiCommandCCCommandEncapsulation) {
			// Handle each encapsulated command individually
			for (const cmd of command.encapsulated) {
				await this.handleCommand(cmd);
			}
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

		return manuallyIdleNotificationValueInternal(
			this.driver,
			this,
			this.notificationHandlerStore,
			notification,
			prevValue!,
			endpointIndex,
		);
	}

	/**
	 * @internal
	 * Deserializes the information of this node from a cache.
	 */
	public async deserialize(): Promise<void> {
		if (!this.driver.networkCache) return;

		// Restore the device config. For the controller, this needs to happen
		// after the interview, as we could have migrated to a different controller
		// but the cache still contains the old fingerprint
		if (!this.isControllerNode) {
			await this.loadDeviceConfig();
		}

		// Mark already-interviewed nodes as potentially ready
		if (this.interviewStage === InterviewStage.Complete) {
			this.updateReadyMachine({ value: "RESTART_FROM_CACHE" });
			// If the `bootstrapped` flag is missing, set it now
			this.bootstrapped = true;
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
				: // If it didn't come in the wait time, poll for an update
					await api.getNodeTestStatus().catch(() => undefined);

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
				numNeighbors = (
					await this.driver.controller.getNodeNeighbors(this.id, true)
				).length;
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
				transmitOptions:
					TransmitOptions.ACK | TransmitOptions.AutoRoute,
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
							const currentSNRMargin =
								txReport.ackRSSI - txReport.measuredNoiseFloor;
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
				const backgroundRSSI =
					await this.driver.controller.getBackgroundRSSI();
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
						`Sending ${healthCheckTestFrameCount} pings to controller at ${getEnumMemberName(
							Powerlevel,
							powerlevel,
						)}...`,
					);
					const result = await this.testPowerlevel(
						this.driver.controller.ownNodeId!,
						powerlevel,
						healthCheckTestFrameCount,
					);
					failedPingsController = healthCheckTestFrameCount - result;
					this.driver.controllerLog.logNode(
						this.id,
						`At ${getEnumMemberName(
							Powerlevel,
							powerlevel,
						)}, ${result}/${healthCheckTestFrameCount} pings were acknowledged...`,
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
				(await this.driver.controller.getNodeNeighbors(this.id, true))
					.length,
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
						`Sending ${healthCheckTestFrameCount} pings to node ${otherNode.id} at ${getEnumMemberName(
							Powerlevel,
							powerlevel,
						)}...`,
					);
					const result = await node.testPowerlevel(
						otherNode.id,
						powerlevel,
						healthCheckTestFrameCount,
					);
					failedPings = healthCheckTestFrameCount - result;
					this.driver.controllerLog.logNode(
						node.id,
						`At ${getEnumMemberName(
							Powerlevel,
							powerlevel,
						)}, ${result}/${healthCheckTestFrameCount} pings were acknowledged by node ${otherNode.id}...`,
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
			transmitOptions: TransmitOptions.ACK | TransmitOptions.AutoRoute,
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
				await basicSetAPI.set(round % 2 === 1 ? 0xff : 0x00);
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
							(latency - result.latency.average) / round;
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
						(txReport.ackRSSI - result.ackRSSI.average) / round;
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
				rtt:
					current.rtt != undefined
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
			if (
				txReport.ackRSSI != undefined
				&& txReport.ackRSSI !== RssiError.NotAvailable
			) {
				ret.rssi =
					ret.rssi == undefined || isRssiError(txReport.ackRSSI)
						? txReport.ackRSSI
						: Math.round(ret.rssi * 0.75 + txReport.ackRSSI * 0.25);
			}

			// Update the LWR's statistics
			const newStats: RouteStatistics = {
				protocolDataRate: txReport.routeSpeed,
				repeaters: (txReport.repeaterNodeIds ?? []) as number[],
				rssi: txReport.ackRSSI ?? ret.lwr?.rssi,
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
			// According to https://github.com/zwave-js/zwave-js/issues/6032#issuecomment-1641945555
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
				const actual =
					verification.hour * 60 * 60
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
					Object.assign(response, {
						hour: result.hour,
						minute: result.minute,
						weekday: result.weekday,
					} satisfies DateAndTime);
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
					Object.assign(response, {
						hour: result.hour,
						minute: result.minute,
						second: result.second,
					} satisfies DateAndTime);
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
					Object.assign(response, {
						day: result.day,
						month: result.month,
						year: result.year,
					} satisfies DateAndTime);
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
					Object.assign(response, {
						standardOffset: result.standardOffset,
						dstOffset: result.dstOffset,
					} satisfies DateAndTime);
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
					Object.assign(response, {
						standardOffset: result.standardOffset,
						dstOffset: result.dstOffset,
					} satisfies DateAndTime);
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

	/** Returns a dump of this node's information for debugging purposes */
	public createDump(): NodeDump {
		const { index, ...endpointDump } = this.createEndpointDump();
		const ret: NodeDump = {
			id: this.id,
			manufacturer: this.deviceConfig?.manufacturer,
			label: this.label,
			description: this.deviceConfig?.description,
			fingerprint: {
				manufacturerId:
					this.manufacturerId != undefined
						? formatId(this.manufacturerId)
						: "unknown",
				productType:
					this.productType != undefined
						? formatId(this.productType)
						: "unknown",
				productId:
					this.productId != undefined
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
			failedS2Bootstrapping: this.failedS2Bootstrapping,

			isListening: this.isListening ?? "unknown",
			isFrequentListening: this.isFrequentListening ?? "unknown",
			isRouting: this.isRouting ?? "unknown",
			supportsBeaming: this.supportsBeaming ?? "unknown",
			supportsSecurity: this.supportsSecurity ?? "unknown",
			protocol: getEnumMemberName(Protocols, this.protocol),
			supportedProtocols: this.driver.controller
				.getProvisioningEntry(this.id)
				?.supportedProtocols?.map((p) =>
					getEnumMemberName(Protocols, p),
				),
			protocolVersion:
				this.protocolVersion != undefined
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
					...pick(valueId, ["property", "propertyKey"]),
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

		if (this.endpointGroups) {
			ret.endpointGroups = [...this.endpointGroups.values()].map(
				(group) => ({
					id: group.id,
					label: group.label,
					isMainDevice: group.isMainDevice,
					endpointIndices: [...group.endpointIndices],
				}),
			);
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
