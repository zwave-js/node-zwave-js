import type { JsonlDBOptions } from "@alcalzone/jsonl-db";
import {
	type ApplicationStatusCCBusy,
	ApplicationStatusCCRejectedRequest,
	type CCAPIHost,
	type CCEncodingContext,
	type CCParsingContext,
	CRC16CC,
	CRC16CCCommandEncapsulation,
	CommandClass,
	CommandRelation,
	type FirmwareUpdateResult,
	InclusionControllerCCInitiate,
	InclusionControllerStep,
	type InterviewContext,
	type InterviewOptions,
	InvalidCC,
	KEXFailType,
	MultiChannelCC,
	NoOperationCC,
	type PersistValuesContext,
	type Powerlevel,
	type RefreshValueTimeouts,
	type RefreshValuesContext,
	type SchedulePollOptions,
	Security2CC,
	Security2CCCommandsSupportedGet,
	Security2CCCommandsSupportedReport,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	Security2Command,
	SecurityCC,
	SecurityCCCommandEncapsulation,
	SecurityCCCommandEncapsulationNonceGet,
	SecurityCCCommandsSupportedGet,
	SecurityCCCommandsSupportedReport,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
	SecurityCommand,
	SupervisionCC,
	type SupervisionCCGet,
	SupervisionCCReport,
	TransportServiceCCFirstSegment,
	TransportServiceCCSegmentComplete,
	TransportServiceCCSegmentRequest,
	TransportServiceCCSegmentWait,
	type TransportServiceCCSubsequentSegment,
	TransportServiceTimeouts,
	type UserPreferences,
	VersionCommand,
	WakeUpCCNoMoreInformation,
	WakeUpCCValues,
	type ZWaveProtocolCC,
	getCommandRelation,
	getImplementedVersion,
	getInnermostCommandClass,
	isEncapsulatingCommandClass,
	isMultiEncapsulatingCommandClass,
	isTransportServiceEncapsulation,
	registerCCs,
} from "@zwave-js/cc";
import { userCodeToLogString } from "@zwave-js/cc/UserCodeCC";
import { ConfigManager, type DeviceConfig } from "@zwave-js/config";
import {
	type CCId,
	CommandClasses,
	ControllerLogger,
	ControllerRole,
	ControllerStatus,
	Duration,
	EncapsulationFlags,
	type Firmware,
	type HostIDs,
	type LogConfig,
	type LogContainer,
	type LogNodeOptions,
	type LogPayloadDict,
	MAX_SUPERVISION_SESSION_ID,
	MAX_TRANSPORT_SERVICE_SESSION_ID,
	MPANState,
	type MaybeNotKnown,
	MessagePriority,
	type MessageRecord,
	type MulticastDestination,
	NUM_NODEMASK_BYTES,
	NodeIDType,
	RFRegion,
	SPANState,
	SecurityClass,
	SecurityManager,
	SecurityManager2,
	type SendCommandOptions,
	type SendCommandReturnType,
	type SendMessageOptions,
	type SinglecastCC,
	type SupervisionResult,
	SupervisionStatus,
	type SupervisionUpdateHandler,
	TransactionState,
	TransmitOptions,
	TransmitStatus,
	type ValueDB,
	type ValueID,
	type ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	allCCs,
	deserializeCacheValue,
	encapsulationCCs,
	generateECDHKeyPair,
	getCCName,
	isEncapsulationCC,
	isLongRangeNodeId,
	isMissingControllerACK,
	isMissingControllerCallback,
	isMissingControllerResponse,
	isZWaveError,
	keyPairFromRawECDHPrivateKey,
	logDict,
	logText,
	randomBytes,
	securityClassIsS2,
	securityClassOrder,
	serializeCacheValue,
	timespan,
	wasControllerReset,
} from "@zwave-js/core";
import {
	type BootloaderChunk,
	BootloaderChunkType,
	type CLIChunk,
	CLIChunkType,
	type EnumeratedPort,
	FunctionType,
	type HasNodeId,
	Message,
	type MessageEncodingContext,
	MessageHeaders,
	type MessageParsingContext,
	MessageType,
	type SuccessIndicator,
	XModemMessageHeaders,
	type ZWaveSerialBindingFactory,
	ZWaveSerialFrameType,
	ZWaveSerialMode,
	type ZWaveSerialPortImplementation,
	type ZWaveSerialStream,
	ZWaveSerialStreamFactory,
	getDefaultPriority,
	hasNodeId,
	isSuccessIndicator,
	isZWaveSerialBindingFactory,
	isZWaveSerialPortImplementation,
	wrapLegacySerialBinding,
} from "@zwave-js/serial";
import {
	ApplicationUpdateRequest,
	type CommandRequest,
	type ContainsCC,
	EnterBootloaderRequest,
	GetControllerVersionRequest,
	MAX_SEND_ATTEMPTS,
	SendDataAbort,
	SendDataBridgeRequest,
	type SendDataMessage,
	SendDataMulticastBridgeRequest,
	SendDataMulticastRequest,
	SendDataRequest,
	SendTestFrameRequest,
	SendTestFrameTransmitReport,
	SerialAPIStartedRequest,
	SerialAPIWakeUpReason,
	SoftResetRequest,
	containsCC,
	containsSerializedCC,
	hasTXReport,
	isAnySendDataResponse,
	isCommandRequest,
	isSendData,
	isSendDataSinglecast,
	isSendDataTransmitReport,
	isTransmitReport,
} from "@zwave-js/serial/serialapi";
import {
	AsyncQueue,
	type AwaitedThing,
	Bytes,
	type BytesView,
	type Interval,
	type Timer,
	TypedEventTarget,
	areUint8ArraysEqual,
	buffer2hex,
	cloneDeep,
	createWrappingCounter,
	getErrorMessage,
	getenv,
	isAbortError,
	isUint8Array,
	mergeDeep,
	noop,
	num2hex,
	pick,
	setInterval,
	setTimer,
} from "@zwave-js/shared";
import type {
	Database,
	KeyPair,
	ReadFile,
	ReadFileSystemInfo,
} from "@zwave-js/shared/bindings";
import { waitFor } from "@zwave-js/waddle";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { roundTo } from "alcalzone-shared/math";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import path from "pathe";

import { PACKAGE_NAME, PACKAGE_VERSION } from "../_version.js";
import { ZWaveController } from "../controller/Controller.js";
import { downloadFirmwareUpdate } from "../controller/FirmwareUpdateService.js";
import {
	type FoundNode,
	InclusionState,
	RemoveNodeReason,
} from "../controller/Inclusion.js";
import { determineNIF } from "../controller/NodeInformationFrame.js";
import {
	type FirmwareUpdateInfo,
	isFirmwareUpdateInfo,
} from "../controller/_Types.js";
import { DriverLogger } from "../log/Driver.js";
import { handleApplicationBusy } from "../node/CCHandlers/ApplicationStatusCC.js";
import type { Endpoint } from "../node/Endpoint.js";
import type { ZWaveNode } from "../node/Node.js";
import {
	InterviewStage,
	NodeStatus,
	type ZWaveNodeEventCallbacks,
	type ZWaveNotificationCallback,
	zWaveNodeEvents,
} from "../node/_Types.js";
import type { ZWaveNodeBase } from "../node/mixins/00_Base.js";
import type { NodeWakeup } from "../node/mixins/30_Wakeup.js";
import type { NodeValues } from "../node/mixins/40_Values.js";
import type { NodeSchedulePoll } from "../node/mixins/60_ScheduledPoll.js";
import {
	type AppInfo,
	compileStatistics,
	sendStatistics,
} from "../telemetry/statistics.js";

import { Bootloader } from "./Bootloader.js";
import { DriverMode } from "./DriverMode.js";
import { EndDeviceCLI } from "./EndDeviceCLI.js";
import {
	createMessageGenerator,
	isNodeBusyError,
} from "./MessageGenerators.js";
import {
	cacheKeys,
	deserializeNetworkCacheValue,
	migrateLegacyNetworkCache,
	serializeNetworkCacheValue,
} from "./NetworkCache.js";
import {
	type PartialCCSession,
	PartialCCSessionManager,
} from "./PartialCCSessionManager.js";
import { type SerialAPIQueueItem, TransactionQueue } from "./Queue.js";
import {
	type SerialAPICommandMachineInput,
	createSerialAPICommandMachine,
} from "./SerialAPICommandMachine.js";
import {
	type TransactionReducer,
	type TransactionReducerResult,
	createMessageDroppedUnexpectedError,
	serialAPICommandErrorToZWaveError,
} from "./StateMachineShared.js";
import {
	type Task,
	type TaskBuilder,
	type TaskHandle,
	TaskInterruptBehavior,
	TaskPriority,
	TaskScheduler,
} from "./Task.js";
import { throttlePresets } from "./ThrottlePresets.js";
import { Transaction } from "./Transaction.js";
import {
	type TransportServiceRXMachine,
	type TransportServiceRXMachineInput,
	createTransportServiceRXMachine,
} from "./TransportServiceMachine.js";
import { checkForConfigUpdates, installConfigUpdate } from "./UpdateConfig.js";
import { mergeUserAgent, userAgentComponentsToString } from "./UserAgent.js";
import type {
	EditableZWaveOptions,
	PartialZWaveOptions,
	ZWaveOptions,
} from "./ZWaveOptions.js";
import {
	type OTWFirmwareUpdateProgress,
	type OTWFirmwareUpdateResult,
	OTWFirmwareUpdateStatus,
} from "./_Types.js";
import { discoverRemoteSerialPorts } from "./mDNSDiscovery.js";

// Force-load all Command Classes:
registerCCs();

export const libVersion: string = PACKAGE_VERSION;
export const libName: string = PACKAGE_NAME;

// This is made with cfonts:
const libNameString = `
███████╗        ██╗    ██╗  █████╗  ██╗   ██╗ ███████╗          ██╗ ███████╗
╚══███╔╝        ██║    ██║ ██╔══██╗ ██║   ██║ ██╔════╝          ██║ ██╔════╝
  ███╔╝  █████╗ ██║ █╗ ██║ ███████║ ██║   ██║ █████╗            ██║ ███████╗
 ███╔╝   ╚════╝ ██║███╗██║ ██╔══██║ ╚██╗ ██╔╝ ██╔══╝       ██   ██║ ╚════██║
███████╗        ╚███╔███╔╝ ██║  ██║  ╚████╔╝  ███████╗     ╚█████╔╝ ███████║
╚══════╝         ╚══╝╚══╝  ╚═╝  ╚═╝   ╚═══╝   ╚══════╝      ╚════╝  ╚══════╝
`;

const defaultOptions: ZWaveOptions = {
	timeouts: {
		ack: 1600, // A sending interface MUST wait for 1600ms or more for an ACK Frame after transmitting a Data Frame.
		byte: 150,
		// Ideally we'd want to have this as low as possible, but some
		// 500 series controllers can take several seconds to respond sometimes.
		response: 10000,
		report: 1000, // ReportTime timeout SHOULD be set to CommandTime + 1 second
		nonce: 5000,
		sendDataAbort: 20000, // If a controller takes over 20 seconds to reach a node, it's probably not going to happen
		sendDataCallback: 30000, // INS13954 defines this to be 65000 ms, but waiting that long causes issues with reporting devices
		sendToSleep: 250, // The default should be enough time for applications to react to devices waking up
		retryJammed: 1000,
		refreshValue: 5000, // Default should handle most slow devices until we have a better solution
		refreshValueAfterTransition: 1000, // To account for delays in the device
		serialAPIStarted: 5000,
		pollTime: 10000, // PollTime SHOULD be 10 seconds + CommandTime as per the spec
	},
	attempts: {
		openSerialPort: 10,
		controller: 3,
		sendData: 3,
		sendDataJammed: 5,
		nodeInterview: 5,
		smartStartInclusion: 5,
		firmwareUpdateOTW: 3,
		partialReports: 2,
	},
	disableOptimisticValueUpdate: false,
	features: {
		// By default enable soft reset unless the env variable is set
		softReset: !getenv("ZWAVEJS_DISABLE_SOFT_RESET"),
		// By default enable the unresponsive controller recovery unless the env variable is set
		unresponsiveControllerRecovery: !getenv(
			"ZWAVEJS_DISABLE_UNRESPONSIVE_CONTROLLER_RECOVERY",
		),
		// By default disable the watchdog
		watchdog: false,
		// Support all CCs unless specified otherwise
		disableCommandClasses: [],
	},
	// By default, try to recover from bootloader mode
	bootloaderMode: "recover",
	interview: {
		queryAllUserCodes: false,
		applyRecommendedConfigParamValues: false,
	},
	storage: {
		cacheDir:
			typeof process !== "undefined"
				? path.join(process.cwd(), "cache")
				: "/cache",
		lockDir: getenv("ZWAVEJS_LOCK_DIRECTORY"),
		throttle: "normal",
	},
	preferences: {
		scales: {},
		lookupUserIdInNotificationEvents: false,
	},
};

/** Ensures that the options are valid */
function checkOptions(options: ZWaveOptions): void {
	if (options.timeouts.ack < 1) {
		throw new ZWaveError(
			`The ACK timeout must be positive!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.byte < 1) {
		throw new ZWaveError(
			`The BYTE timeout must be positive!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.response < 500 || options.timeouts.response > 60000) {
		throw new ZWaveError(
			`The Response timeout must be between 500 and 60000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.report < 500 || options.timeouts.report > 10000) {
		throw new ZWaveError(
			`The Report timeout must be between 500 and 10000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.nonce < 3000 || options.timeouts.nonce > 20000) {
		throw new ZWaveError(
			`The Nonce timeout must be between 3000 and 20000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.timeouts.retryJammed < 10
		|| options.timeouts.retryJammed > 5000
	) {
		throw new ZWaveError(
			`The timeout for retrying while jammed must be between 10 and 5000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.timeouts.sendToSleep < 10
		|| options.timeouts.sendToSleep > 5000
	) {
		throw new ZWaveError(
			`The Send To Sleep timeout must be between 10 and 5000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.sendDataCallback < 10000) {
		throw new ZWaveError(
			`The Send Data Callback timeout must be at least 10000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.pollTime < 1000 || options.timeouts.pollTime > 30000) {
		throw new ZWaveError(
			`The Poll Time must be between 1000 and 30000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.timeouts.sendDataAbort < 5000
		|| options.timeouts.sendDataAbort
			> options.timeouts.sendDataCallback - 5000
	) {
		throw new ZWaveError(
			`The Send Data Abort Callback timeout must be between 5000 and ${
				options.timeouts.sendDataCallback - 5000
			} milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.timeouts.serialAPIStarted < 1000
		|| options.timeouts.serialAPIStarted > 30000
	) {
		throw new ZWaveError(
			`The Serial API started timeout must be between 1000 and 30000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.securityKeys != undefined) {
		const keys = Object.entries(options.securityKeys);
		for (let i = 0; i < keys.length; i++) {
			const [secClass, key] = keys[i];
			if (key.length !== 16) {
				throw new ZWaveError(
					`The security key for class ${secClass} must be a buffer with length 16!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}
			if (keys.findIndex(([, k]) => areUint8ArraysEqual(k, key)) !== i) {
				throw new ZWaveError(
					`The security key for class ${secClass} was used multiple times!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}
		}
	}
	if (options.attempts.controller < 1 || options.attempts.controller > 3) {
		throw new ZWaveError(
			`The Controller attempts must be between 1 and 3!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.attempts.sendData < 1
		|| options.attempts.sendData > MAX_SEND_ATTEMPTS
	) {
		throw new ZWaveError(
			`The SendData attempts must be between 1 and ${MAX_SEND_ATTEMPTS}!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.attempts.sendDataJammed < 1
		|| options.attempts.sendDataJammed > 10
	) {
		throw new ZWaveError(
			`The SendData attempts while jammed must be between 1 and 10!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.attempts.nodeInterview < 1
		|| options.attempts.nodeInterview > 10
	) {
		throw new ZWaveError(
			`The Node interview attempts must be between 1 and 10!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.attempts.smartStartInclusion < 1
		|| options.attempts.smartStartInclusion > 25
	) {
		throw new ZWaveError(
			`The SmartStart inclusion attempts must be between 1 and 25!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.attempts.firmwareUpdateOTW < 1
		|| options.attempts.firmwareUpdateOTW > 5
	) {
		throw new ZWaveError(
			`The OTW firmware update attempts must be between 1 and 5!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (
		options.attempts.partialReports < 0
		|| options.attempts.partialReports > 3
	) {
		throw new ZWaveError(
			`The partial reports attempts must be between 0 and 3!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}

	if (options.inclusionUserCallbacks) {
		if (!isObject(options.inclusionUserCallbacks)) {
			throw new ZWaveError(
				`The inclusionUserCallbacks must be an object!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		} else if (
			typeof options.inclusionUserCallbacks.grantSecurityClasses
				!== "function"
			|| typeof options.inclusionUserCallbacks.validateDSKAndEnterPIN
				!== "function"
			|| typeof options.inclusionUserCallbacks.abort !== "function"
		) {
			throw new ZWaveError(
				`The inclusionUserCallbacks must contain the following functions: grantSecurityClasses, validateDSKAndEnterPIN, abort!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		}
	}

	if (options.joinNetworkUserCallbacks) {
		if (!isObject(options.joinNetworkUserCallbacks)) {
			throw new ZWaveError(
				`The joinNetworkUserCallbacks must be an object!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		} else if (
			typeof options.joinNetworkUserCallbacks.showDSK !== "function"
			|| typeof options.joinNetworkUserCallbacks.done !== "function"
		) {
			throw new ZWaveError(
				`The joinNetworkUserCallbacks must contain the following functions: showDSK, done!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		}
	}

	if (options.rf != undefined) {
		if (options.rf.region != undefined) {
			if (
				typeof options.rf.region !== "number"
				|| !(options.rf.region in RFRegion)
				|| options.rf.region === RFRegion.Unknown
			) {
				throw new ZWaveError(
					`${options.rf.region} is not a valid RF region!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}
		}

		if (options.rf.txPower != undefined) {
			if (!isObject(options.rf.txPower)) {
				throw new ZWaveError(
					`rf.txPower must be an object!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}

			if (
				typeof options.rf.txPower.powerlevel !== "number"
				&& options.rf.txPower.powerlevel !== "auto"
			) {
				throw new ZWaveError(
					`rf.txPower.powerlevel must be a number or "auto"!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}

			if (
				options.rf.txPower.measured0dBm != undefined
				&& typeof options.rf.txPower.measured0dBm !== "number"
			) {
				throw new ZWaveError(
					`rf.txPower.measured0dBm must be a number!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}
		}

		if (options.features.disableCommandClasses?.length) {
			// Ensure that all CCs may be disabled
			const mandatory = new Set([
				// Encapsulation CCs are always supported
				...encapsulationCCs,
				// All Root Devices or nodes MUST support
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
			]);

			const mandatoryDisabled =
				options.features.disableCommandClasses.filter((cc) =>
					mandatory.has(cc),
				);
			if (mandatoryDisabled.length > 0) {
				throw new ZWaveError(
					`The following CCs are mandatory and cannot be disabled using features.disableCommandClasses: ${mandatoryDisabled
						.map((cc) => getCCName(cc))
						.join(", ")}!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}
		}
	}
}

/**
 * Function signature for a message handler. The return type signals if the
 * message was handled (`true`) or further handlers should be called (`false`)
 */
export type RequestHandler<T extends Message = Message> = (
	msg: T,
) => boolean | Promise<boolean>;
interface RequestHandlerEntry<T extends Message = Message> {
	invoke: RequestHandler<T>;
	oneTime: boolean;
}

type AwaitedMessageHeader = AwaitedThing<MessageHeaders>;
type AwaitedMessageEntry = AwaitedThing<Message>;
type AwaitedCommandEntry = AwaitedThing<CCId>;
type AwaitedCLIChunkEntry = AwaitedThing<CLIChunk>;
export type AwaitedBootloaderChunkEntry = AwaitedThing<BootloaderChunk>;
type AwaitedIdleEntry = Omit<
	AwaitedThing<void>,
	"predicate" | "refreshPredicate"
>;

interface WaitForCommandOptions {
	/**
	 * Whether a matching command is consumed (default) or only observed.
	 * When `false`, the predicate is additionally tested against the command
	 * before encapsulation is unwrapped (so it can inspect e.g. the S2 sequence
	 * number), and the command is still handled normally afterwards.
	 */
	consume?: boolean;
}

interface TransportServiceSession {
	machine: TransportServiceRXMachine;
	/** The reassembled datagram. Segments are copied here as they are received. */
	datagram: Bytes;
	timeout?: NodeJS.Timeout;
}

interface Sessions {
	/** A map of all current Transport Service sessions that may still receive updates */
	transportService: Map<number, TransportServiceSession>;
	/** A map of all current supervision sessions that may still receive updates */
	supervision: Map<number, SupervisionUpdateHandler>;
}

// Used to add all node events to the driver event callbacks, but prefixed with "node "
type PrefixedNodeEvents = {
	[
		K in keyof ZWaveNodeEventCallbacks as K extends string
			? `node ${K}`
			: never
	]: ZWaveNodeEventCallbacks[K];
};

const enum ControllerRecoveryPhase {
	None,
	ACKTimeout,
	ACKTimeoutAfterReset,
	CallbackTimeout,
	CallbackTimeoutAfterReset,
	Jammed,
	JammedAfterReset,
}

function messageIsPing<T extends Message>(
	msg: T,
): msg is T & ContainsCC<NoOperationCC> {
	return containsCC(msg) && msg.command instanceof NoOperationCC;
}

/** Whether an error was caused by accessing one of the JSONL DBs before it was opened or after it was closed */
function isDatabaseNotOpenError(e: unknown): boolean {
	return e instanceof Error && /database is not open/.test(e.message);
}

function assertValidCCs(container: ContainsCC): void {
	if (container.command instanceof InvalidCC) {
		if (typeof container.command.reason === "number") {
			throw new ZWaveError(
				"The message payload failed validation!",
				container.command.reason,
			);
		} else {
			throw new ZWaveError(
				"The message payload is invalid!",
				ZWaveErrorCodes.PacketFormat_InvalidPayload,
				container.command.reason,
			);
		}
	} else if (containsCC(container.command)) {
		assertValidCCs(container.command);
	}
}

function wrapLegacyFSDriverForCacheMigrationOnly(
	legacy: import("@zwave-js/core/traits").FileSystem,
): ReadFileSystemInfo & ReadFile {
	// This usage only needs readFile and checking if a file exists
	// Every other usage will throw!
	return {
		async readFile(path) {
			const text = await legacy.readFile(path, "utf8");
			return Bytes.from(text, "utf8");
		},
		async stat(path) {
			if (await legacy.pathExists(path)) {
				return {
					isDirectory() {
						return false;
					},
					isFile() {
						return true;
					},
					mtime: new Date(),
					size: 0,
				};
			} else {
				throw new Error("File not found");
			}
		},
		readDir(_path) {
			return Promise.reject(
				new Error("Not implemented for the legacy FS driver"),
			);
		},
	};
}

// Strongly type the event emitter events
export interface DriverEventCallbacks extends PrefixedNodeEvents {
	"driver ready": () => void;
	"bootloader ready": () => void;
	"cli ready": () => void;
	"all nodes ready": () => void;
	"firmware update progress": (progress: OTWFirmwareUpdateProgress) => void;
	"firmware update finished": (result: OTWFirmwareUpdateResult) => void;
	error: (err: Error) => void;
}

export type DriverEvents = Extract<keyof DriverEventCallbacks, string>;

interface DeferredTransactionBatch {
	timer: Timer;
	transactions: Transaction[];
}

/**
 * The driver is the core of this library. It controls the serial interface,
 * handles transmission and receipt of messages and manages the network cache.
 * Any action you want to perform on the Z-Wave network must go through a driver
 * instance or its associated nodes.
 */
export class Driver
	extends TypedEventTarget<DriverEventCallbacks>
	implements
		CCAPIHost,
		InterviewContext,
		RefreshValuesContext,
		PersistValuesContext
{
	public constructor(
		private port:
			| string
			| ZWaveSerialPortImplementation
			| ZWaveSerialBindingFactory,
		...optionsAndPresets: (PartialZWaveOptions | undefined)[]
	) {
		super();

		// Ensure the given serial port is valid
		if (
			typeof port !== "string"
			&& !isZWaveSerialPortImplementation(port)
			&& !isZWaveSerialBindingFactory(port)
		) {
			throw new ZWaveError(
				`The port must be a string or a valid custom serial port implementation!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		}

		// Deep-Merge all given options/presets
		const definedOptionsAndPresets = optionsAndPresets.filter(
			(o): o is PartialZWaveOptions => !!o,
		);
		let mergedOptions: PartialZWaveOptions = {};
		for (const preset of definedOptionsAndPresets) {
			mergedOptions = mergeDeep(mergedOptions, preset, true);
		}
		// Finally apply the defaults, without overwriting any existing settings
		this._options = mergeDeep(
			mergedOptions,
			cloneDeep(defaultOptions),
		) as ZWaveOptions;

		// And make sure they contain valid values
		checkOptions(this._options);
		if (this._options.userAgent) {
			if (!isObject(this._options.userAgent)) {
				throw new ZWaveError(
					`The userAgent property must be an object!`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}

			this.updateUserAgent(this._options.userAgent);
		}

		// Initialize the cache
		this.cacheDir = this._options.storage.cacheDir;

		const self = this;
		this.messageEncodingContext = {
			getHighestSecurityClass: (nodeId) =>
				this.getHighestSecurityClass(nodeId),
			hasSecurityClass: (nodeId, securityClass) =>
				this.hasSecurityClass(nodeId, securityClass),
			setSecurityClass: (nodeId, securityClass, granted) =>
				this.setSecurityClass(nodeId, securityClass, granted),
			getDeviceConfig: (nodeId) => this.getDeviceConfig(nodeId),
			// These are evaluated lazily, so we cannot spread messageParsingContext unfortunately
			get securityManager() {
				return self.securityManager;
			},
			get securityManager2() {
				return self.securityManager2;
			},
			get securityManagerLR() {
				return self.securityManagerLR;
			},
			getSupportedCCVersion: (cc, nodeId, endpointIndex) =>
				this.getSupportedCCVersion(cc, nodeId, endpointIndex),
		};

		this._scheduler = new TaskScheduler(() => {
			return new ZWaveError(
				"Task was removed",
				ZWaveErrorCodes.Driver_TaskRemoved,
			);
		});
	}

	private serialFactory: ZWaveSerialStreamFactory | undefined;
	/** The serial port instance */
	private serial: ZWaveSerialStream | undefined;

	private messageEncodingContext: Omit<
		MessageEncodingContext,
		keyof HostIDs | "nodeIdType"
	>;

	private getEncodingContext(): MessageEncodingContext & CCEncodingContext {
		return {
			...this.messageEncodingContext,
			tryGetValueDB: (nodeId) => this.tryGetValueDB(nodeId),
			ownNodeId: this.controller.ownNodeId!,
			homeId: this.controller.homeId!,
			nodeIdType: this._controller?.nodeIdType ?? NodeIDType.Short,
		};
	}

	private getMessageParsingContext(): MessageParsingContext {
		return {
			getDeviceConfig: (nodeId) => this.getDeviceConfig(nodeId),
			sdkVersion: this._controller?.sdkVersion,
			requestStorage: this._requestStorage,
			ownNodeId: this._controller?.ownNodeId ?? 0, // Unspecified node ID
			homeId: this._controller?.homeId ?? 0x55555555, // Invalid home ID
			nodeIdType: this._controller?.nodeIdType ?? NodeIDType.Short,
		};
	}

	private getCCParsingContext(): Omit<
		CCParsingContext,
		"sourceNodeId" | "frameType"
	> {
		return {
			...this.messageEncodingContext,
			ownNodeId: this.controller.ownNodeId!,
			homeId: this.controller.homeId!,
		};
	}

	// We have multiple queues to achieve multiple "layers" of communication priority:
	// The default queue for most messages
	private queue!: TransactionQueue; // Is initialized in initTransactionQueues()
	// An immediate queue for handling queries that need to be handled ASAP, e.g. Nonce Get
	private immediateQueue!: TransactionQueue; // Is initialized in initTransactionQueues()
	// And all of them feed into the serial API queue, which contains commands that will be sent ASAP
	private serialAPIQueue!: AsyncQueue<SerialAPIQueueItem>; // Is initialized in initControllerAndNodes()
	// Timers for delayed transaction re-queuing
	private requeueTimers: Map<number, Set<DeferredTransactionBatch>> =
		new Map();

	// Poll timing state per the Z-Wave specification.
	// After any transaction on the mesh completes, we must wait at least pollTime
	// before starting the next poll transaction.
	private _lastTransactionEnd: number = 0;
	// CommandTime is measured from when the poll command is sent to when
	// the successful transmit report is received. The required wait before
	// the next poll is pollTime + commandTime.
	private _lastPollCommandTime: number = 0;
	private _pollDelayTimer: Timer | undefined;

	/** Gives access to the transaction queues, ordered by priority */
	private get queues(): TransactionQueue[] {
		return [this.immediateQueue, this.queue];
	}

	private initTransactionQueues(): void {
		this.immediateQueue = new TransactionQueue({
			name: "immediate",
			mayStartNextTransaction: (t) => {
				// While the controller is unresponsive, only soft resetting is allowed.
				// Since we use GetControllerVersionRequest to check if the controller responds after soft-reset,
				// allow that too.
				if (this.controller.status === ControllerStatus.Unresponsive) {
					return (
						t.message instanceof SoftResetRequest
						|| t.message instanceof GetControllerVersionRequest
					);
				}

				// While the controller is jammed, only soft resetting is allowed
				if (this.controller.status === ControllerStatus.Jammed) {
					return t.message instanceof SoftResetRequest;
				}

				// All other messages on the immediate queue may always be sent as long as the controller is ready to send
				return (
					!this.queuePaused
					&& this.controller.status === ControllerStatus.Ready
				);
			},
		});
		this.queue = new TransactionQueue({
			name: "normal",
			mayStartNextTransaction: (t) => this.mayStartTransaction(t),
		});

		this._queueIdle = false;

		// Start draining the queues
		for (const queue of this.queues) {
			void this.drainTransactionQueue(queue);
		}
	}

	private async destroyTransactionQueues(
		reason: string,
		errorCode?: ZWaveErrorCodes,
	): Promise<void> {
		this.clearDeferredTransactions(
			undefined,
			reason,
			errorCode ?? ZWaveErrorCodes.Driver_TaskRemoved,
		);

		// Clear the poll delay timer
		this._pollDelayTimer?.clear();
		this._pollDelayTimer = undefined;

		// The queues might not have been initialized yet
		for (const queue of this.queues) {
			if (!queue) return;
		}

		// Reject pending transactions, but not during integration tests
		if (getenv("NODE_ENV") !== "test") {
			await this.rejectTransactions(
				(_t) => true,
				reason,
				errorCode ?? ZWaveErrorCodes.Driver_TaskRemoved,
			);
		}

		for (const queue of this.queues) {
			queue.abort();
		}
	}

	private _scheduler: TaskScheduler;
	public get scheduler(): TaskScheduler {
		return this._scheduler;
	}

	private queuePaused = false;
	/** Used to immediately abort ongoing Serial API commands */
	private abortSerialAPICommand: DeferredPromise<Error> | undefined;

	private initSerialAPIQueue(): void {
		this.serialAPIQueue = new AsyncQueue();

		// Start draining the queue
		void this.drainSerialAPIQueue();
	}

	private destroySerialAPIQueue(
		reason: string,
		errorCode?: ZWaveErrorCodes,
	): void {
		// The queue might not have been initialized yet
		if (!this.serialAPIQueue) return;

		this.serialAPIQueue.abort();

		// Abort the currently executed serial API command, so the queue does not lock up
		this.abortSerialAPICommand?.reject(
			new ZWaveError(
				reason,
				errorCode ?? ZWaveErrorCodes.Driver_Destroyed,
			),
		);
	}

	// Keep track of which queues are currently busy
	private _queuesBusyFlags = 0;
	private _queueIdle: boolean = false;
	/** Whether the queue is currently idle */
	public get queueIdle(): boolean {
		return this._queueIdle;
	}
	private set queueIdle(value: boolean) {
		if (this._queueIdle !== value) {
			this.driverLog.print(
				value ? "all queues idle" : "one or more queues busy",
			);
			this._queueIdle = value;
			this.handleQueueIdleChange(value);
		}
	}

	/** A map of handlers for all sorts of requests */
	private requestHandlers = new Map<FunctionType, RequestHandlerEntry[]>();
	/** A list of awaited message headers */
	private awaitedMessageHeaders: AwaitedMessageHeader[] = [];
	/** A list of awaited messages */
	private awaitedMessages: AwaitedMessageEntry[] = [];
	/** A list of awaited commands */
	private awaitedCommands: AwaitedCommandEntry[] = [];
	/** A list of awaited chunks from the bootloader */
	private awaitedBootloaderChunks: AwaitedBootloaderChunkEntry[] = [];
	/** A list of awaited chunks from the end device CLI */
	private awaitedCLIChunks: AwaitedCLIChunkEntry[] = [];
	/** A list of promises waiting for the queues to become idle */
	private awaitedIdle: AwaitedIdleEntry[] = [];

	/** A map of Node ID -> ongoing sessions */
	private nodeSessions = new Map<number, Sessions>();
	private ensureNodeSessions(nodeId: number): Sessions {
		if (!this.nodeSessions.has(nodeId)) {
			this.nodeSessions.set(nodeId, {
				transportService: new Map(),
				supervision: new Map(),
			});
		}
		return this.nodeSessions.get(nodeId)!;
	}

	private _requestStorage: Map<FunctionType, Record<string, unknown>> =
		new Map();
	/**
	 * @internal
	 * Stores data from Serial API command requests to be used by their responses
	 */
	public get requestStorage(): Map<FunctionType, Record<string, unknown>> {
		return this._requestStorage;
	}

	public readonly cacheDir: string;

	private _valueDB: Database<unknown> | undefined;
	/** @internal */
	public get valueDB(): Database<unknown> | undefined {
		return this._valueDB;
	}
	private _metadataDB: Database<ValueMetadata> | undefined;
	/** @internal */
	public get metadataDB(): Database<ValueMetadata> | undefined {
		return this._metadataDB;
	}
	private _networkCache: Database<any> | undefined;
	/** @internal */
	public get networkCache(): Database<any> {
		if (this._networkCache == undefined) {
			throw new ZWaveError(
				"The network cache was not yet initialized!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._networkCache;
	}

	// This is set during `start()` and should not be accessed before
	private _configManager!: ConfigManager;
	public get configManager(): ConfigManager {
		return this._configManager;
	}

	public get configVersion(): string {
		return (
			this.configManager?.configVersion
			?? require("zwave-js/package.json")?.dependencies?.[
				"@zwave-js/config"
			]
			?? libVersion
		);
	}

	// This is set during `start()` and should not be accessed before
	private _logContainer!: LogContainer;
	// This is set during `start()` and should not be accessed before
	private _driverLog!: DriverLogger;
	/** @internal */
	public get driverLog(): DriverLogger {
		return this._driverLog;
	}

	// This is set during `start()` and should not be accessed before
	private _controllerLog!: ControllerLogger;
	/** @internal */
	public get controllerLog(): ControllerLogger {
		return this._controllerLog;
	}

	public logNode(
		nodeId: number,
		message: string,
		level?: LogNodeOptions["level"],
	): void;
	public logNode(nodeId: number, options: LogNodeOptions): void;
	public logNode(...args: any[]): void {
		// @ts-expect-error
		this._controllerLog.logNode(...args);
	}

	private _controller: ZWaveController | undefined;
	/** Encapsulates information about the Z-Wave controller and provides access to its nodes */
	public get controller(): ZWaveController {
		if (this._controller == undefined) {
			throw new ZWaveError(
				"The controller is not yet ready!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._controller;
	}

	/** While in bootloader mode, this encapsulates information about the bootloader and its state */
	private _bootloader: Bootloader | undefined;
	public get bootloader(): Bootloader {
		if (this._bootloader == undefined) {
			throw new ZWaveError(
				"The controller is not in bootloader mode!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._bootloader;
	}

	private _cli: EndDeviceCLI | undefined;
	/** While in end device CLI mode, this encapsulates information about the CLI and its state */
	public get cli(): EndDeviceCLI {
		if (this._cli == undefined) {
			throw new ZWaveError(
				"The Z-Wave module is not in CLI mode!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._cli;
	}

	/** Determines which kind of Z-Wave application the driver is currently communicating with */
	public get mode(): DriverMode {
		if (this._bootloader) return DriverMode.Bootloader;
		if (this._cli) return DriverMode.CLI;
		if (this._controller) return DriverMode.SerialAPI;
		return DriverMode.Unknown;
	}

	private _recoveryPhase: ControllerRecoveryPhase =
		ControllerRecoveryPhase.None;

	private _securityManager: SecurityManager | undefined;
	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public get securityManager(): SecurityManager | undefined {
		return this._securityManager;
	}

	private _securityManager2: SecurityManager2 | undefined;
	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public get securityManager2(): SecurityManager2 | undefined {
		return this._securityManager2;
	}

	private _securityManagerLR: SecurityManager2 | undefined;
	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public get securityManagerLR(): SecurityManager2 | undefined {
		return this._securityManagerLR;
	}

	/** @internal */
	public getSecurityManager2(
		destination: number | MulticastDestination,
	): SecurityManager2 | undefined {
		const nodeId = isArray(destination) ? destination[0] : destination;
		const isLongRange = isLongRangeNodeId(nodeId);
		return isLongRange ? this.securityManagerLR : this.securityManager2;
	}

	private _learnModeAuthenticatedKeyPair: KeyPair | undefined;
	/** @internal */
	public async getLearnModeAuthenticatedKeyPair(): Promise<KeyPair> {
		if (this._learnModeAuthenticatedKeyPair == undefined) {
			// Try restoring from cache
			const privateKey = this.cacheGet<BytesView>(
				cacheKeys.controller.privateKey,
			);
			if (privateKey) {
				this._learnModeAuthenticatedKeyPair =
					await keyPairFromRawECDHPrivateKey(privateKey);
			} else {
				// Not found in cache, create a new one and cache it
				this._learnModeAuthenticatedKeyPair =
					await generateECDHKeyPair();
				this.cacheSet(
					cacheKeys.controller.privateKey,
					this._learnModeAuthenticatedKeyPair.privateKey,
				);
			}
		}
		return this._learnModeAuthenticatedKeyPair;
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications. Use `controller.homeId` instead!
	 */
	public get homeId(): number {
		// This is needed for the ZWaveHost interface
		return this.controller.homeId!;
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications. Use `controller.ownNodeId` instead!
	 */
	public get ownNodeId(): number {
		// This is needed for the ZWaveHost interface
		return this.controller.ownNodeId!;
	}

	/** @internal Used for compatibility with the CCAPIHost interface */
	public getNode(nodeId: number): ZWaveNode | undefined {
		return this.controller.nodes.get(nodeId);
	}

	/** @internal Used for compatibility with the CCAPIHost interface */
	public getNodeOrThrow(nodeId: number): ZWaveNode {
		return this.controller.nodes.getOrThrow(nodeId);
	}

	/** @internal Used for compatibility with the CCAPIHost interface */
	public getAllNodes(): ZWaveNode[] {
		return [...this.controller.nodes.values()];
	}

	public tryGetNode(msg: Message): ZWaveNode | undefined {
		const nodeId = msg.getNodeId();
		if (nodeId != undefined) return this.controller.nodes.get(nodeId);
	}

	public tryGetEndpoint(cc: CommandClass): Endpoint | undefined {
		if (cc.isSinglecast()) {
			return this.controller.nodes
				.get(cc.nodeId)
				?.getEndpoint(cc.endpointIndex);
		}
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public getValueDB(nodeId: number): ValueDB {
		// This is needed for the ZWaveHost interface
		const node = this.controller.nodes.getOrThrow(nodeId);
		return node.valueDB;
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public tryGetValueDB(nodeId: number): ValueDB | undefined {
		// This is needed for the ZWaveHost interface
		const node = this.controller.nodes.get(nodeId);
		return node?.valueDB;
	}

	public getDeviceConfig(nodeId: number): DeviceConfig | undefined {
		// This is needed for the ZWaveHost interface
		return this.controller.nodes.get(nodeId)?.deviceConfig;
	}

	public lookupManufacturer(manufacturerId: number): string | undefined {
		return this.configManager.lookupManufacturer(manufacturerId);
	}

	public getHighestSecurityClass(
		nodeId: number,
	): MaybeNotKnown<SecurityClass> {
		// This is needed for the ZWaveHost interface
		const node = this.controller.nodes.getOrThrow(nodeId);
		return node.getHighestSecurityClass();
	}

	public hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean> {
		// This is needed for the ZWaveHost interface
		const node = this.controller.nodes.getOrThrow(nodeId);
		return node.hasSecurityClass(securityClass);
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void {
		// This is needed for the ZWaveHost interface
		const node = this.controller.nodes.getOrThrow(nodeId);
		node.setSecurityClass(securityClass, granted);
	}

	/** Updates the logging configuration without having to restart the driver. */
	public updateLogConfig(config: Partial<LogConfig>): void {
		this._logContainer.updateConfiguration(config);
	}

	/** Returns the current logging configuration. */
	public getLogConfig(): LogConfig {
		return this._logContainer.getConfiguration();
	}

	/** Updates the preferred sensor scales to use for node queries */
	public setPreferredScales(
		scales: ZWaveOptions["preferences"]["scales"],
	): void {
		this._options.preferences.scales = mergeDeep(
			defaultOptions.preferences.scales,
			scales,
		);
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public getUserPreferences(): UserPreferences {
		return this._options.preferences;
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public getInterviewOptions(): InterviewOptions {
		return this._options.interview;
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications
	 */
	public getRefreshValueTimeouts(): RefreshValueTimeouts {
		return {
			refreshValue: this._options.timeouts.refreshValue,
			refreshValueAfterTransition:
				this._options.timeouts.refreshValueAfterTransition,
		};
	}

	/**
	 * Enumerates all existing serial ports.
	 * @param local Whether to include local serial ports
	 * @param remote Whether to discover remote serial ports using an mDNS query for the `_zwave._tcp` domain
	 */
	public static async enumerateSerialPorts({
		local = true,
		remote = true,
	}: {
		local?: boolean;
		remote?: boolean;
	} = {}): Promise<string[]> {
		const ret: (EnumeratedPort & { path: string })[] = [];

		// Ideally we'd use the host bindings used by the driver, but we can't access them in a static method

		const bindings =
			// oxlint-disable-next-line typescript/ban-ts-comment
			// @ts-ignore - For some reason, VSCode does not like this import, although tsc is fine with it
			(await import("#default_bindings/serial")).serial;
		if (local && typeof bindings.list === "function") {
			for (const port of await bindings.list()) {
				if (port.type === "custom") continue;
				ret.push(port);
			}
		}
		if (remote) {
			const ports = await discoverRemoteSerialPorts();
			if (ports) {
				ret.push(
					...ports.map((p) => ({
						type: "socket" as const,
						path: p.port,
					})),
				);
			}
		}

		const portOrder: EnumeratedPort["type"][] = ["link", "socket", "tty"];

		ret.sort((a, b) => {
			const typeA = portOrder.indexOf(a.type);
			const typeB = portOrder.indexOf(b.type);
			if (typeA !== typeB) return typeA - typeB;
			return a.path.localeCompare(b.path);
		});

		return distinct(ret.map((p) => p.path));
	}

	/** Updates a subset of the driver options on the fly */
	public updateOptions(options: EditableZWaveOptions): void {
		// This code is called from user code, so we need to make sure no options were passed
		// which we are not able to update on the fly
		const safeOptions = pick(options, [
			"attempts",
			"disableOptimisticValueUpdate",
			"emitValueUpdateAfterSetValue",
			"inclusionUserCallbacks",
			"joinNetworkUserCallbacks",
			"interview",
			"preferences",
			"vendor",
		]);

		// Create a new deep-merged copy of the options so we can check them for validity
		// without affecting our own options.
		// The following options are potentially unsafe to clone, so just preserve them:
		// - logConfig
		// - host (could contain classes)
		const { logConfig, host, ...rest } = this._options;
		const newOptions = mergeDeep(
			cloneDeep(rest),
			safeOptions,
			true,
		) as ZWaveOptions;
		newOptions.logConfig = logConfig;
		newOptions.host = host;
		checkOptions(newOptions);

		if (options.userAgent && !isObject(options.userAgent)) {
			throw new ZWaveError(
				`The userAgent property must be an object!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		}

		// All good, update the options
		this._options = newOptions;

		if (options.logConfig) {
			this.updateLogConfig(options.logConfig);
		}

		if (options.userAgent) {
			this.updateUserAgent(options.userAgent);
		}
	}

	private _options: ZWaveOptions;
	public get options(): Readonly<ZWaveOptions> {
		return this._options;
	}

	/**
	 * The host bindings used to access file system etc.
	 */
	// This is set during `start()` and should not be accessed before
	private bindings!: Required<NonNullable<ZWaveOptions["host"]>>;

	private _wasStarted: boolean = false;
	private _isOpen: boolean = false;

	/** Start the driver */
	public async start(): Promise<void> {
		// avoid starting twice
		if (this.wasDestroyed) {
			throw new ZWaveError(
				"The driver was destroyed. Create a new instance and start that one.",
				ZWaveErrorCodes.Driver_Destroyed,
			);
		}
		if (this._wasStarted) return Promise.resolve();
		this._wasStarted = true;

		// Populate default bindings. This has to happen asynchronously, so the driver does not have a hard dependency
		// on Node.js internals
		this.bindings = {
			fs:
				this._options.host?.fs
				?? (await import("#default_bindings/fs")).fs,
			serial:
				this._options.host?.serial
				?? (await import("#default_bindings/serial")).serial,
			db:
				this._options.host?.db
				// oxlint-disable-next-line typescript/ban-ts-comment
				// @ts-ignore - For some reason, VSCode does not like this import, although tsc is fine with it
				?? (await import("#default_bindings/db")).db,
			log:
				this._options.host?.log
				?? (await import("#default_bindings/log")).log,
		};

		// Initialize logging
		this._logContainer = this.bindings.log(this._options.logConfig);
		this._driverLog = new DriverLogger(this, this._logContainer);
		this._controllerLog = new ControllerLogger(this._logContainer);

		// Initialize config manager
		this._configManager = new ConfigManager({
			bindings: this.bindings.fs,
			logContainer: this._logContainer,
			deviceConfigPriorityDir:
				this._options.storage.deviceConfigPriorityDir,
			deviceConfigExternalDir:
				this._options.storage.deviceConfigExternalDir,
		});

		const spOpenPromise = createDeferredPromise();

		// Log which version is running
		if (this._options.logConfig?.showLogo !== false) {
			this.driverLog.print(libNameString, "info");
		}
		this.driverLog.print(`version ${libVersion}`, "info");
		this.driverLog.print("", "info");

		this.driverLog.print("starting driver...");

		// Open the serial port
		let binding: ZWaveSerialBindingFactory;
		if (typeof this.port === "string") {
			if (
				typeof this.bindings.serial.createFactoryByPath === "function"
			) {
				this.driverLog.print(`opening serial port ${this.port}`);
				binding = await this.bindings.serial.createFactoryByPath(
					this.port,
				);
			} else {
				spOpenPromise.reject(
					new ZWaveError(
						"This platform does not support creating a serial connection by path",
						ZWaveErrorCodes.Driver_Failed,
					),
				);
				void this.destroy();
				return;
			}
		} else if (isZWaveSerialPortImplementation(this.port)) {
			this.driverLog.print(
				"opening serial port using the provided custom implementation",
			);
			this.driverLog.print(
				"This is deprecated! Switch to the factory pattern instead.",
				"warn",
			);
			binding = wrapLegacySerialBinding(this.port);
		} else {
			this.driverLog.print(
				"opening serial port using the provided custom factory",
			);
			binding = this.port;
		}
		this.serialFactory = new ZWaveSerialStreamFactory(
			binding,
			this._logContainer,
		);

		// IMPORTANT: Test code expects the open promise to be created and returned synchronously
		// Everything async (including opening the serial port) must happen in the setImmediate callback

		// asynchronously open the serial port
		setImmediate(async () => {
			try {
				await this.openSerialport();
			} catch (e) {
				spOpenPromise.reject(e as Error);
				void this.destroy();
				return;
			}

			this.driverLog.print("serial port opened");
			this._isOpen = true;
			spOpenPromise.resolve();

			// Start the task scheduler
			this._scheduler.start();

			if (
				typeof this._options.testingHooks?.onSerialPortOpen
				=== "function"
			) {
				await this._options.testingHooks.onSerialPortOpen(this.serial!);
			}

			// Perform initialization sequence
			if (this._options.testingHooks?.skipFirmwareIdentification) {
				// No identification desired, just send a NAK and assume it's a
				// Serial API controller
				await this.writeHeader(MessageHeaders.NAK);
				if (getenv("NODE_ENV") !== "test") {
					await wait(1000);
				}
			} else {
				const mode = await this.detectMode();
				if (mode === DriverMode.CLI) {
					this.emit("cli ready");
					return;
				}

				if (mode === DriverMode.Bootloader) {
					if (this._options.bootloaderMode === "stay") {
						this.driverLog.print(
							"Controller is in bootloader mode. Staying in bootloader as requested.",
							"warn",
						);
						this.emit("bootloader ready");
						return;
					}

					this.driverLog.print(
						"Controller is in bootloader, attempting to recover...",
						"warn",
					);
					await this.leaveBootloaderInternal();

					// Wait a short time again. If we're in bootloader mode again, we're stuck
					await wait(1000);

					// FIXME: Leaving the bootloader may end up in the CLI

					if (this._bootloader) {
						if (this._options.bootloaderMode === "allow") {
							this.driverLog.print(
								"Failed to recover from bootloader. Staying in bootloader mode as requested.",
								"warn",
							);
							this.emit("bootloader ready");
						} else {
							// bootloaderMode === "recover"
							void this.destroyWithMessage(
								"Failed to recover from bootloader. Please flash a new firmware to continue...",
							);
						}

						return;
					}
				}
			}

			// Try to create the cache directory. This can fail, in which case we should expose a good error message
			try {
				if (this._options.storage.driver) {
					await this._options.storage.driver.ensureDir(this.cacheDir);
				} else {
					await this.bindings.fs.ensureDir(this.cacheDir);
				}
			} catch (e) {
				let message: string;
				if (
					/\.yarn[/\\]cache[/\\]zwave-js/i.test(
						getErrorMessage(e, true),
					)
				) {
					message = `Failed to create the cache directory ${this.cacheDir}. When using Yarn PnP, you need to change the location with the "storage.cacheDir" driver option.`;
				} else {
					message = `Failed to create the cache directory ${this.cacheDir}. Please make sure that it is writable or change the location with the "storage.cacheDir" driver option.`;
				}

				void this.destroyWithMessage(message);
				return;
			}

			// Load the necessary configuration
			if (this._options.testingHooks?.loadConfiguration !== false) {
				this.driverLog.print("loading configuration...");
				try {
					await this.configManager.loadAll();
				} catch (e) {
					const message = `Failed to load the configuration: ${getErrorMessage(
						e,
					)}`;
					void this.destroyWithMessage(message);
					return;
				}
			}

			this.driverLog.print("beginning interview...");
			try {
				await this.initializeControllerAndNodes();
			} catch (e) {
				let message: string;
				if (
					isZWaveError(e)
					&& e.code === ZWaveErrorCodes.Controller_MessageDropped
				) {
					message = `Failed to initialize the driver, no response from the controller. Are you sure this is a Z-Wave controller?`;
				} else {
					message = `Failed to initialize the driver: ${getErrorMessage(
						e,
						true,
					)}`;
				}
				this.driverLog.print(message, "error");
				this.emit(
					"error",
					new ZWaveError(message, ZWaveErrorCodes.Driver_Failed),
				);
				void this.destroy();
				return;
			}
		});

		return spOpenPromise;
	}

	private async detectMode(): Promise<DriverMode> {
		// We re-use the NAK that should be used to reset the communication on
		// Serial API startup to detect which kind of application we are talking to

		const incomingNAK = this.waitForMessageHeader(
			(h) => h === MessageHeaders.NAK,
			500,
		)
			.then(() => true)
			.catch(() => false);
		await this.writeHeader(MessageHeaders.NAK);

		// The response to this NAK helps determine whether the Z-Wave module is...
		// ...stuck in the bootloader,
		// ...running a SoC end device firmware with CLI
		// ...or a "normal" Serial API

		if (await incomingNAK) {
			// This is possibly a CLI. It should respond with a prompt after we
			// send a newline.
			await this.writeSerial(Bytes.from("\n", "ascii"));
		}

		// If there was no NAK, it may be a bootloader, but it may also be a CLI
		// on a device that just started. In this case it can happen that the
		// NAK is not answered, but a CLI prompt is received.
		// In this case, the CLI is also detected by the serial parsers.

		// In any case, wait another 500ms to give the parsers time to detect
		// either the booloader or the CLI
		await wait(500);

		if (this._cli) return DriverMode.CLI;
		if (this._bootloader) return DriverMode.Bootloader;

		return DriverMode.SerialAPI;
	}

	private _controllerInterviewed: boolean = false;
	private _nodesReady = new Set<number>();
	private _nodesReadyEventEmitted: boolean = false;
	private _isOpeningSerialPort: boolean = false;

	private async openSerialport(): Promise<void> {
		let lastError: unknown;
		// After a reset, the serial port may need a few seconds until we can open it - try a few times
		this._isOpeningSerialPort = true;
		for (
			let attempt = 1;
			attempt <= this._options.attempts.openSerialPort;
			attempt++
		) {
			try {
				this.serial = await this.serialFactory!.createStream();
				// Start reading from the serial port
				void this.handleSerialData(this.serial);

				// There are some situations where the serial port closes unexpectedly
				// after just a few milliseconds, e.g. when reconnecting to a TCP serial port.
				// Wait a bit to see if this happens.
				if (getenv("NODE_ENV") !== "test") {
					await wait(250);
				}

				if (this.serial.isOpen) {
					// It is still open, we're done
					this._isOpeningSerialPort = false;
					return;
				}
			} catch (e) {
				lastError = e;
			}
			if (attempt < this._options.attempts.openSerialPort) {
				await wait(1000);
			}
		}

		this._isOpeningSerialPort = false;

		const message = `Failed to open the serial port: ${getErrorMessage(
			lastError,
		)}`;
		this.driverLog.print(message, "error");

		throw new ZWaveError(message, ZWaveErrorCodes.Driver_Failed);
	}

	/** Indicates whether all nodes are ready, i.e. the "all nodes ready" event has been emitted */
	public get allNodesReady(): boolean {
		return this._nodesReadyEventEmitted;
	}

	private getJsonlDBOptions(): JsonlDBOptions<any> {
		const options: JsonlDBOptions<any> = {
			ignoreReadErrors: true,
			...throttlePresets[this._options.storage.throttle],
		};
		if (this._options.storage.lockDir) {
			options.lockfile = {
				directory: this._options.storage.lockDir,
			};
		}
		return options;
	}

	private async initNetworkCache(homeId: number): Promise<void> {
		const options = this.getJsonlDBOptions();

		const networkCacheFile = path.join(
			this.cacheDir,
			`${homeId.toString(16)}.jsonl`,
		);
		this._networkCache = this.bindings.db.createInstance(networkCacheFile, {
			...options,
			serializer: serializeNetworkCacheValue,
			reviver: deserializeNetworkCacheValue,
		});
		await this._networkCache.open();

		if (getenv("NO_CACHE") === "true") {
			// Since the network cache is append-only, we need to
			// clear it if the cache should be ignored
			this._networkCache.clear();
		}
	}

	private async initValueDBs(homeId: number): Promise<void> {
		const options = this.getJsonlDBOptions();

		const valueDBFile = path.join(
			this.cacheDir,
			`${homeId.toString(16)}.values.jsonl`,
		);
		this._valueDB = this.bindings.db.createInstance(valueDBFile, {
			...options,
			enableTimestamps: true,
			reviver: (_key, value) => deserializeCacheValue(value),
			serializer: (_key, value) => serializeCacheValue(value),
		});
		await this._valueDB.open();

		const metadataDBFile = path.join(
			this.cacheDir,
			`${homeId.toString(16)}.metadata.jsonl`,
		);
		this._metadataDB = this.bindings.db.createInstance(
			metadataDBFile,
			options,
		);
		await this._metadataDB.open();

		if (getenv("NO_CACHE") === "true") {
			// Since value/metadata DBs are append-only, we need to
			// clear them if the cache should be ignored
			this._valueDB.clear();
			this._metadataDB.clear();
		}
	}

	private async performCacheMigration(): Promise<void> {
		if (
			!this._controller
			|| !this.controller.homeId
			|| !this._networkCache
			|| !this._valueDB
		) {
			return;
		}

		// In v9, the network cache was switched from a json file to use a Jsonl-DB
		// Therefore the legacy cache file must be migrated to the new format
		if (this._networkCache.size === 0) {
			// version the cache format, so migrations in the future are easier
			this._networkCache.set("cacheFormat", 1);

			try {
				await migrateLegacyNetworkCache(
					this.controller.homeId,
					this._networkCache,
					this._valueDB,
					this._options.storage.driver
						? wrapLegacyFSDriverForCacheMigrationOnly(
								this._options.storage.driver,
							)
						: this.bindings.fs,
					this.cacheDir,
				);

				// Go through the value DB and remove all keys referencing commandClass -1, which used to be a
				// hacky way to store non-CC specific values
				for (const key of this._valueDB.keys()) {
					if (-1 === key.indexOf(`,"commandClass":-1,`)) {
						continue;
					}
					this._valueDB.delete(key);
				}
			} catch (e) {
				const message = `Migrating the legacy cache file to jsonl failed: ${getErrorMessage(
					e,
					true,
				)}`;
				this.driverLog.print(message, "error");
			}
		}

		// Clean up stale Battery CC "isLow" values that were removed in v15.10.0
		// They were converted to notification events but may still exist in cached data
		if (this._networkCache.get("cacheFormat") === 1) {
			for (const key of this._valueDB.keys()) {
				if (
					-1 !== key.indexOf(`,"commandClass":128,`) // Battery CC (0x80 = 128)
					&& -1 !== key.indexOf(`,"property":"isLow"`)
				) {
					this._valueDB.delete(key);
					this._metadataDB?.delete(key);
				}
			}
			// Update the cache format to 2 to indicate that the migration is done
			this._networkCache.set("cacheFormat", 2);
		}
	}

	/**
	 * Initializes the variables for controller and nodes,
	 * adds event handlers and starts the interview process.
	 */
	private async initializeControllerAndNodes(): Promise<void> {
		if (this._controller) {
			throw new ZWaveError(
				"The controller was already initialized!",
				ZWaveErrorCodes.Driver_Failed,
			);
		}

		this._controller = new ZWaveController(this);
		this._controller
			.on("node found", this.onNodeFound.bind(this))
			.on("node added", this.onNodeAdded.bind(this))
			.on("node removed", this.onNodeRemoved.bind(this))
			.on("status changed", this.onControllerStatusChanged.bind(this))
			.on("network found", this.onNetworkFound.bind(this))
			.on("network joined", this.onNetworkJoined.bind(this))
			.on("network left", this.onNetworkLeft.bind(this))
			// Re-evaluate the send queues, which hold back interview traffic
			// while an inclusion, exclusion or security bootstrap is active.
			// TODO: Remove along with mustHoldTransaction
			.on("inclusion state changed", () => this.triggerQueues());

		// Create and start all queues after creating the controller instance
		this.initTransactionQueues();
		this.initSerialAPIQueue();

		if (!this._options.testingHooks?.skipControllerIdentification) {
			// Determine what the controller can do
			const { nodeIds } = await this.controller.queryCapabilities();

			// Configure the radio
			await this.controller.queryAndConfigureRF();

			// Ensure the controller NIF has the listening flag set and
			// advertises the correct CCs
			await this.controller.setControllerNIF();

			// Soft-reset the stick if possible.
			// On 700+ series, we'll also learn about whether the stick supports
			// Z-Wave Long Range in the current region.
			const maySoftReset = this.maySoftReset();
			if (this._options.features.softReset && !maySoftReset) {
				this.driverLog.print(
					`Soft reset is enabled through config, but this stick does not support it.`,
					"warn",
				);
				this._options.features.softReset = false;
			}

			if (maySoftReset) {
				await this.softResetInternal(false);
			}

			let lrNodeIds: readonly number[] | undefined;
			if (this.controller.supportsLongRange) {
				// If the controller supports ZWLR, we need to query the node IDs again
				// to get the full list of nodes
				lrNodeIds = (await this.controller.queryLongRangeCapabilities())
					.lrNodeIds;
			}

			// If the controller supports ZWLR in the current region, switch to
			// 16-bit node IDs. Otherwise, make sure that it is actually using 8-bit node IDs.
			await this.controller.trySetNodeIDType(
				this.controller.supportsLongRange
					? NodeIDType.Long
					: NodeIDType.Short,
			);

			// Now that we know the node ID type, we can identify the controller
			await this.controller.identify();

			// Perform additional configuration
			await this.controller.configure(nodeIds);

			// now that we know the home ID, we can open the databases
			await this.initNetworkCache(this.controller.homeId!);
			await this.initValueDBs(this.controller.homeId!);
			await this.performCacheMigration();

			// Initialize all nodes and restore the data from cache
			await this.controller.initNodes(
				nodeIds,
				lrNodeIds ?? [],
				async () => {
					// Try to restore the network information from the cache
					if (getenv("NO_CACHE") !== "true") {
						// FIXME: This entire thing is a pretty convoluted way of looking up the device config
						await this.restoreNetworkStructureFromCache();
					}
				},
			);

			// For controllers with proprietary implementations, interview them too
			await this.controller.interviewProprietary();

			// Reading the bootloader version currently depends on a proprietary command
			await this.controller.queryBootloaderVersion();

			this.controllerLog.print("Interview completed");

			if (this.controller.role === ControllerRole.Primary) {
				// Auto-enable smart start inclusion
				this.controller.autoProvisionSmartStart();
			}
		} else {
			// When skipping the controller identification, set the flags to consider the controller a primary
			this.controller["_wasRealPrimary"] = true;
			this.controller["_isSUC"] = true;
			this.controller["_isSISPresent"] = true;
			this.controller["_sucNodeId"] = 1;
		}

		if (this.controller.role === ControllerRole.Primary) {
			// Set up the S0 security manager. We can only do that after the controller
			// interview because we need to know the controller node id.
			const S0Key = this._options.securityKeys?.S0_Legacy;
			if (S0Key) {
				this.driverLog.print(
					"Network key for S0 configured, enabling S0 security manager...",
				);
				this._securityManager = new SecurityManager({
					networkKey: S0Key,
					ownNodeId: this._controller.ownNodeId!,
					nonceTimeout: this._options.timeouts.nonce,
				});
			} else {
				this.driverLog.print(
					"No network key for S0 configured, communication with secure (S0) devices won't work!",
					"warn",
				);
			}

			// The S2 security manager could be initialized earlier, but we do it here for consistency
			if (
				this._options.securityKeys
				// Only set it up if we have security keys for at least one S2 security class
				&& Object.keys(this._options.securityKeys).some(
					(key) =>
						key.startsWith("S2_")
						&& key in SecurityClass
						&& securityClassIsS2((SecurityClass as any)[key]),
				)
			) {
				this.driverLog.print(
					"At least one network key for S2 configured, enabling S2 security manager...",
				);
				this._securityManager2 = await SecurityManager2.create();
				// Set up all keys
				for (const secClass of [
					"S2_Unauthenticated",
					"S2_Authenticated",
					"S2_AccessControl",
					"S0_Legacy",
				] as const) {
					const key = this._options.securityKeys[secClass];
					if (key) {
						await this._securityManager2.setKey(
							SecurityClass[secClass],
							key,
						);
					}
				}
			} else {
				this.driverLog.print(
					"No network key for S2 configured, communication with secure (S2) devices won't work!",
					"warn",
				);
			}

			if (
				this._options.securityKeysLongRange?.S2_AccessControl
				|| this._options.securityKeysLongRange?.S2_Authenticated
			) {
				this.driverLog.print(
					"At least one network key for Z-Wave Long Range configured, enabling security manager...",
				);
				this._securityManagerLR = await SecurityManager2.create();
				if (this._options.securityKeysLongRange?.S2_AccessControl) {
					await this._securityManagerLR.setKey(
						SecurityClass.S2_AccessControl,
						this._options.securityKeysLongRange.S2_AccessControl,
					);
				}
				if (this._options.securityKeysLongRange?.S2_Authenticated) {
					await this._securityManagerLR.setKey(
						SecurityClass.S2_Authenticated,
						this._options.securityKeysLongRange.S2_Authenticated,
					);
				}
			} else {
				this.driverLog.print(
					"No network key for Z-Wave Long Range configured, communication won't work!",
					"warn",
				);
			}
		} else {
			// Secondary controller - load security keys from cache.
			// Either LR or S2+S0, not both
			// FIXME: The fallback code duplicates the logic from the primary controller above. Find a nicer solution.
			if (isLongRangeNodeId(this.controller.ownNodeId!)) {
				const securityKeysLongRange = [
					SecurityClass.S2_AccessControl,
					SecurityClass.S2_Authenticated,
				]
					.map(
						(sc) =>
							[
								sc,
								this.cacheGet<BytesView>(
									cacheKeys.controller.securityKeysLongRange(
										sc,
									),
								),
							] as [SecurityClass, BytesView | undefined],
					)
					.filter(
						(v): v is [SecurityClass, BytesView] =>
							v[1] != undefined,
					);
				if (securityKeysLongRange.length) {
					this.driverLog.print(
						"At least one network key for Z-Wave Long Range found in cache, enabling security manager...",
					);
					this._securityManagerLR = await SecurityManager2.create();
					for (const [sc, key] of securityKeysLongRange) {
						await this._securityManagerLR.setKey(sc, key);
					}
				} else if (
					this._options.securityKeysLongRange?.S2_AccessControl
					|| this._options.securityKeysLongRange?.S2_Authenticated
				) {
					this.driverLog.print(
						"Fallback to configured network keys for Z-Wave Long Range, enabling security manager...",
					);
					this._securityManagerLR = await SecurityManager2.create();
					if (this._options.securityKeysLongRange?.S2_AccessControl) {
						await this._securityManagerLR.setKey(
							SecurityClass.S2_AccessControl,
							this._options.securityKeysLongRange
								.S2_AccessControl,
						);
					}
					if (this._options.securityKeysLongRange?.S2_Authenticated) {
						await this._securityManagerLR.setKey(
							SecurityClass.S2_Authenticated,
							this._options.securityKeysLongRange
								.S2_Authenticated,
						);
					}
				} else {
					this.driverLog.print(
						"No network key for Z-Wave Long Range configured, communication won't work!",
						"warn",
					);
				}
			} else {
				const s0Key = this.cacheGet<BytesView>(
					cacheKeys.controller.securityKeys(SecurityClass.S0_Legacy),
				);
				if (s0Key) {
					this.driverLog.print(
						"Network key for S0 found in cache, enabling S0 security manager...",
					);
					this._securityManager = new SecurityManager({
						networkKey: s0Key,
						ownNodeId: this._controller.ownNodeId!,
						nonceTimeout: this._options.timeouts.nonce,
					});
				} else if (this._options.securityKeys?.S0_Legacy) {
					this.driverLog.print(
						"Fallback to configured S0 network key, enabling S0 security manager...",
					);
					this._securityManager = new SecurityManager({
						networkKey: this._options.securityKeys.S0_Legacy,
						ownNodeId: this._controller.ownNodeId!,
						nonceTimeout: this._options.timeouts.nonce,
					});
				} else {
					this.driverLog.print(
						"No network key for S0 found in cache, communication with secure (S0) devices won't work!",
						"warn",
					);
				}
				const securityKeys = securityClassOrder
					.map(
						(sc) =>
							[
								sc,
								this.cacheGet<BytesView>(
									cacheKeys.controller.securityKeys(sc),
								),
							] as [SecurityClass, BytesView | undefined],
					)
					.filter(
						(v): v is [SecurityClass, BytesView] =>
							v[1] != undefined,
					);
				if (securityKeys.length) {
					this.driverLog.print(
						"At least one network key for S2 found in cache, enabling S2 security manager...",
					);
					this._securityManager2 = await SecurityManager2.create();
					for (const [sc, key] of securityKeys) {
						await this._securityManager2.setKey(sc, key);
					}
				} else if (
					this._options.securityKeys
					&& Object.keys(this._options.securityKeys).some(
						(key) =>
							key.startsWith("S2_")
							&& key in SecurityClass
							&& securityClassIsS2((SecurityClass as any)[key]),
					)
				) {
					this.driverLog.print(
						"Fallback to configured network keys for S2, enabling S2 security manager...",
					);
					this._securityManager2 = await SecurityManager2.create();
					// Set up all keys
					for (const secClass of [
						"S2_Unauthenticated",
						"S2_Authenticated",
						"S2_AccessControl",
						"S0_Legacy",
					] as const) {
						const key = this._options.securityKeys[secClass];
						if (key) {
							await this._securityManager2.setKey(
								SecurityClass[secClass],
								key,
							);
						}
					}
				} else {
					this.driverLog.print(
						"No network key for S2 found in cache, communication with secure (S2) devices won't work!",
						"warn",
					);
				}
			}
		}

		// in any case we need to emit the driver ready event here
		this._controllerInterviewed = true;
		this.driverLog.print("driver ready");
		this.emit("driver ready");

		// Add event handlers for the nodes
		for (const node of this._controller.nodes.values()) {
			this.addNodeEventHandlers(node);
		}

		if (this.controller.role === ControllerRole.Primary) {
			// Before interviewing nodes reset our knowledge about their ready state
			this._nodesReady.clear();
			this._nodesReadyEventEmitted = false;

			if (!this._options.testingHooks?.skipNodeInterview) {
				// Now interview all nodes
				// First complete the controller interview
				const controllerNode = this._controller.nodes.get(
					this._controller.ownNodeId!,
				)!;
				await this.interviewNodeInternal(controllerNode);
				// The controller node is always alive
				controllerNode.markAsAlive();

				// Then do all the nodes in parallel, but prioritize nodes that are more likely to be ready
				const nodeInterviewOrder = [...this._controller.nodes.values()]
					.filter((n) => n.id !== this._controller!.ownNodeId)
					.toSorted(
						(a, b) =>
							// Fully-interviewed devices first (need the least amount of communication now)
							b.interviewStage - a.interviewStage
							// Always listening -> FLiRS -> sleeping
							|| (b.isListening
								? 2
								: b.isFrequentListening
									? 1
									: 0)
								- (a.isListening
									? 2
									: a.isFrequentListening
										? 1
										: 0)
							// Then by last seen, more recently first
							|| (b.lastSeen?.getTime() ?? 0)
								- (a.lastSeen?.getTime() ?? 0)
							// Lastly ascending by node ID
							|| a.id - b.id,
					);

				if (nodeInterviewOrder.length) {
					this.controllerLog.print(
						`Interviewing nodes and/or determining their status: ${nodeInterviewOrder
							.map((n) => n.id)
							.join(", ")}`,
					);
					for (const node of nodeInterviewOrder) {
						if (node.canSleep) {
							// A node that can sleep should be assumed to be sleeping after resuming from cache
							node.markAsAsleep();
							// Don't queue the interview — it would pin the
							// concurrency group slot. It will be queued when
							// the node wakes up.
							continue;
						}

						// Continue the interview if necessary, otherwise determine the node's status
						if (node.interviewStage < InterviewStage.Complete) {
							void this.interviewNodeInternal(node);
						} else if (
							node.isListening
							|| node.isFrequentListening
						) {
							// Ping non-sleeping nodes to determine their status
							void node.ping();
						}
					}
				}
			}
		} else {
			if (!this._options.testingHooks?.skipNodeInterview) {
				// We're a secondary controller. Just determine if nodes are ready and do the interview at another time.

				// First complete the controller "interview"
				const controllerNode = this._controller.nodes.get(
					this._controller.ownNodeId!,
				)!;
				await this.interviewNodeInternal(controllerNode);
				// The controller node is always alive
				controllerNode.markAsAlive();

				// Query the protocol information from the controller
				for (const node of this._controller.nodes.values()) {
					if (node.isControllerNode) continue;
					if (node.interviewStage === InterviewStage.Complete) {
						// A node that can sleep should be assumed to be sleeping after resuming from cache
						if (node.canSleep) node.markAsAsleep();
						continue;
					}
					await node["queryProtocolInfo"]();
				}

				// Then ping (frequently) listening nodes to determine their status
				const nodeInterviewOrder = [...this._controller.nodes.values()]
					.filter((n) => n.id !== this._controller!.ownNodeId)
					.filter((n) => n.isListening || n.isFrequentListening)
					.toSorted(
						(a, b) =>
							// Always listening -> FLiRS
							(b.isListening ? 1 : 0) - (a.isListening ? 1 : 0)
							// Then by last seen, more recently first
							|| (b.lastSeen?.getTime() ?? 0)
								- (a.lastSeen?.getTime() ?? 0)
							// Lastly ascending by node ID
							|| a.id - b.id,
					);

				if (nodeInterviewOrder.length) {
					this.controllerLog.print(
						`Determining node status: ${nodeInterviewOrder
							.map((n) => n.id)
							.join(", ")}`,
					);
					for (const node of nodeInterviewOrder) {
						void node.ping();
					}
				}
			}
		}

		// If we only have sleeping nodes or a controller-only network, the send
		// thread is idle before the driver gets marked ready, the idle tasks won't be triggered.
		// So do it manually.
		this.handleQueueIdleChange(this.queueIdle);
	}

	private autoRefreshNodeValueTimers = new Map<number, Interval>();
	private reinterviewTimers = new Map<number, Timer>();

	/**
	 * @internal
	 * Starts or resumes the interview of a Z-Wave node. It is advised to NOT
	 * await this method as it can take a very long time (minutes to hours)!
	 *
	 * WARNING: Do not call this method from application code. To refresh the information
	 * for a specific node, use `node.refreshInfo()` instead
	 */
	public interviewNodeInternal(node: ZWaveNode): Promise<void> {
		const task = node.getInterviewTask();

		let promise: Promise<void>;
		if (task instanceof Promise) {
			promise = task;
		} else {
			// Cancel any pending delayed re-interview (e.g. after firmware update)
			this.reinterviewTimers.get(node.id)?.clear();
			this.reinterviewTimers.delete(node.id);

			promise = this._scheduler.queueTask(task);
		}

		return promise.catch((e) => {
			if (isZWaveError(e)) {
				if (
					e.code === ZWaveErrorCodes.Driver_NotReady
					|| e.code === ZWaveErrorCodes.Controller_NodeRemoved
				) {
					// This only happens when a node is removed during the interview
					return;
				} else if (
					e.code === ZWaveErrorCodes.Controller_InterviewRestarted
					|| e.code === ZWaveErrorCodes.Driver_TaskRemoved
				) {
					// The interview was restarted or cancelled
					return;
				}
				this.controllerLog.logNode(
					node.id,
					`Error during node interview: ${e.message}`,
					"error",
				);
			} else {
				throw e;
			}
		});
	}

	/** Adds the necessary event handlers for a node instance */
	private addNodeEventHandlers(node: ZWaveNode): void {
		node.on("wake up", this.onNodeWakeUp.bind(this))
			.on("sleep", this.onNodeSleep.bind(this))
			.on("alive", this.onNodeAlive.bind(this))
			.on("dead", this.onNodeDead.bind(this))
			.on("interview completed", this.onNodeInterviewCompleted.bind(this))
			.on("ready", this.onNodeReady.bind(this))
			.on(
				"firmware update finished",
				this.onNodeFirmwareUpdated.bind(this),
			)
			.on("notification", this.onNodeNotification.bind(this));

		// Add forwarders for all node events
		for (const event of zWaveNodeEvents) {
			node.on(event, (...args: any[]) => {
				// @ts-expect-error We made sure that args matches
				this.emit(`node ${event}`, ...args);
			});
		}
	}

	/** Removes a node's event handlers that were added with addNodeEventHandlers */
	private removeNodeEventHandlers(node: ZWaveNode): void {
		node.removeAllListeners();
	}

	/** Is called when a node wakes up */
	private onNodeWakeUp(node: ZWaveNode, oldStatus: NodeStatus): void {
		this.controllerLog.logNode(
			node.id,
			`The node is ${
				oldStatus === NodeStatus.Unknown ? "" : "now "
			}awake.`,
		);

		// Make sure to handle the pending messages as quickly as possible
		if (oldStatus === NodeStatus.Asleep) {
			void this.reduceQueues((transaction, source) => {
				const { message } = transaction;
				// Ignore messages that are not for this node
				if (message.getNodeId() !== node.id) return { type: "keep" };
				// Resolve pings, so we don't need to send them (we know the node is awake)
				if (messageIsPing(message)) {
					return { type: "resolve", message: undefined };
				}
				// Don't interfere with active transactions where the sending portion
				// is already complete (e.g. waiting for a response from the node,
				// or verifying non-supervised S2 delivery)
				if (
					source === "active"
					&& transaction.parts.current?.completedTimestamp
				) {
					return { type: "keep" };
				}
				// Re-queue all other transactions for this node, so they get added in front of the others
				return { type: "requeue" };
			});
		}

		// Re-queue incomplete interview
		if (
			node.interviewStage !== InterviewStage.Complete
			&& !this._options.testingHooks?.skipNodeInterview
		) {
			void this.interviewNodeInternal(node);
		}

		// Start the timer for sending the node to sleep again
		this.debounceSendNodeToSleep(node);
	}

	/** Is called when a node goes to sleep */
	private onNodeSleep(node: ZWaveNode, oldStatus: NodeStatus): void {
		this.controllerLog.logNode(
			node.id,
			`The node is ${
				oldStatus === NodeStatus.Unknown ? "" : "now "
			}asleep.`,
		);

		// Move all its pending messages to the WakeupQueue
		// This clears the current transaction and continues sending the next messages
		this.moveMessagesToWakeupQueue(node.id);

		// Reject a running interview's pending transactions. The task treats this
		// as a failed attempt and exits, releasing the concurrency group slot for
		// other nodes. onNodeWakeUp re-queues incomplete interviews.
		const interviewTask = this.scheduler.findTask(
			(t) => t.tag?.id === "interview" && t.tag.nodeId === node.id,
		);
		if (interviewTask) {
			void this.rejectTransactions(
				(t) =>
					t.message.getNodeId() === node.id && t.tag === "interview",
				"The node is asleep",
				ZWaveErrorCodes.Controller_MessageDropped,
			);
		}
	}

	/** Is called when a previously dead node starts communicating again */
	private onNodeAlive(node: ZWaveNode, oldStatus: NodeStatus): void {
		this.controllerLog.logNode(
			node.id,
			`The node is ${
				oldStatus === NodeStatus.Unknown ? "" : "now "
			}alive.`,
		);
		if (
			oldStatus === NodeStatus.Dead
			&& node.interviewStage !== InterviewStage.Complete
			&& !this._options.testingHooks?.skipNodeInterview
		) {
			void this.interviewNodeInternal(node);
		}
	}

	/** Is called when a node is marked as dead */
	private onNodeDead(node: ZWaveNode, oldStatus: NodeStatus): void {
		this.controllerLog.logNode(
			node.id,
			`The node is ${
				oldStatus === NodeStatus.Unknown ? "" : "now "
			}dead.`,
		);

		// This could mean that we need to ignore it in the all nodes ready check,
		// so perform the check again
		this.checkAllNodesReady();
	}

	/** Is called when a node is ready to be used */
	private onNodeReady(node: ZWaveNode): void {
		this._nodesReady.add(node.id);
		this.controllerLog.logNode(node.id, "The node is ready to be used");

		// Regularly check if values of non-sleeping nodes need to be refreshed per the specs
		// For sleeping nodes this is done on wakeup
		if (this.autoRefreshNodeValueTimers.has(node.id)) {
			this.autoRefreshNodeValueTimers.get(node.id)?.clear();
			this.autoRefreshNodeValueTimers.delete(node.id);
		}
		if (!node.canSleep) {
			// Randomize the interval so we don't get a flood of queries for all listening nodes
			const intervalMinutes = 50 + Math.random() * 20;
			this.autoRefreshNodeValueTimers.set(
				node.id,
				setInterval(() => {
					void node.autoRefreshValues().catch(() => {
						// ignore errors
					});
				}, timespan.minutes(intervalMinutes)).unref(),
			);
		}

		this.checkAllNodesReady();
	}

	/** Checks if all nodes are ready and emits the "all nodes ready" event if they are */
	private checkAllNodesReady(): void {
		// Only emit "all nodes ready" once
		if (this._nodesReadyEventEmitted) return;

		for (const [id, node] of this.controller.nodes) {
			// Ignore dead nodes or the all nodes ready event will never be emitted without physical user interaction
			if (node.status === NodeStatus.Dead) continue;

			if (!this._nodesReady.has(id)) return;
		}
		// All nodes are ready
		this.controllerLog.print("All nodes are ready to be used");
		this.emit("all nodes ready");
		this._nodesReadyEventEmitted = true;

		// We know we have all data, this is the time to send statistics (when enabled)
		void this.compileAndSendStatistics().catch(() => {
			/* ignore */
		});
	}

	private _statisticsEnabled: boolean = false;
	/** Whether reporting usage statistics is currently enabled */
	public get statisticsEnabled(): boolean {
		return this._statisticsEnabled;
	}

	private statisticsAppInfo:
		| Pick<AppInfo, "applicationName" | "applicationVersion">
		| undefined;

	private userAgentComponents = new Map<string, string>();

	/**
	 * Updates individual components of the user agent. Versions for individual applications can be added or removed.
	 * @param components An object with application/module/component names and their versions. Set a version to `null` or `undefined` explicitly to remove it from the user agent.
	 */
	public updateUserAgent(
		components: Record<string, string | null | undefined>,
	): void {
		this.userAgentComponents = mergeUserAgent(
			this.userAgentComponents,
			components,
		);
		this._userAgent = this.getEffectiveUserAgentString(
			this.userAgentComponents,
		);
	}

	/**
	 * Returns the effective user agent string for the given components.
	 * The driver name and version is automatically prepended and the statisticsAppInfo data is automatically appended if no components were given.
	 */
	private getEffectiveUserAgentString(
		components: Map<string, string>,
	): string {
		const effectiveComponents = new Map([
			[libName, libVersion],
			...components,
		]);
		if (
			effectiveComponents.size === 1
			&& this.statisticsAppInfo
			&& this.statisticsAppInfo.applicationName !== "node-zwave-js"
			// node-zwave-js was renamed to just zwave-js in v15
			&& this.statisticsAppInfo.applicationName !== "zwave-js"
		) {
			effectiveComponents.set(
				this.statisticsAppInfo.applicationName,
				this.statisticsAppInfo.applicationVersion,
			);
		}
		return userAgentComponentsToString(effectiveComponents);
	}

	private _userAgent: string = `zwave-js/${libVersion}`;
	/** Returns the user agent string used for service requests */
	public get userAgent(): string {
		return this._userAgent;
	}

	/** Returns the user agent string combined with the additional components (if given) */
	public getUserAgentStringWithComponents(
		components?: Record<string, string | null | undefined>,
	): string {
		if (!components || Object.keys(components).length === 0) {
			return this._userAgent;
		}

		const merged = mergeUserAgent(
			this.userAgentComponents,
			components,
			false,
		);
		return this.getEffectiveUserAgentString(merged);
	}

	/**
	 * Enable sending usage statistics. Although this does not include any sensitive information, we expect that you
	 * inform your users before enabling statistics.
	 */
	public enableStatistics(
		appInfo: Pick<AppInfo, "applicationName" | "applicationVersion">,
	): void {
		if (this._statisticsEnabled) return;

		if (
			!isObject(appInfo)
			|| typeof appInfo.applicationName !== "string"
			|| typeof appInfo.applicationVersion !== "string"
		) {
			throw new ZWaveError(
				`The application statistics must be an object with two string properties "applicationName" and "applicationVersion"!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		} else if (appInfo.applicationName.length > 100) {
			throw new ZWaveError(
				`The applicationName for statistics must be maximum 100 characters long!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		} else if (appInfo.applicationVersion.length > 100) {
			throw new ZWaveError(
				`The applicationVersion for statistics must be maximum 100 characters long!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		}

		this._statisticsEnabled = true;
		this.statisticsAppInfo = appInfo;

		// If we're already ready, send statistics
		if (this._nodesReadyEventEmitted) {
			void this.compileAndSendStatistics().catch(() => {
				/* ignore */
			});
		}
	}

	/**
	 * Disable sending usage statistics
	 */
	public disableStatistics(): void {
		this._statisticsEnabled = false;
		this.statisticsAppInfo = undefined;
		this.statisticsTimeout?.clear();
		this.statisticsTimeout = undefined;
	}

	/** @internal */
	public async getUUID(): Promise<string> {
		// To anonymously identify a network, we create a unique ID and use it to salt the Home ID
		if (!this._valueDB!.has("uuid")) {
			this._valueDB!.set(
				"uuid",
				Bytes.view(randomBytes(32)).toString("hex"),
			);
		}
		const ret = this._valueDB!.get("uuid") as string;
		return ret;
	}

	private statisticsTimeout: Timer | undefined;
	private async compileAndSendStatistics(): Promise<void> {
		// Don't send anything if statistics are not enabled
		if (!this.statisticsEnabled || !this.statisticsAppInfo) return;

		this.statisticsTimeout?.clear();
		this.statisticsTimeout = undefined;

		let success: number | boolean = false;
		try {
			const statistics = await compileStatistics(this, {
				driverVersion: libVersion,
				...this.statisticsAppInfo,
				nodeVersion: process.versions.node,
				os: process.platform,
				arch: process.arch,
			});
			success = await sendStatistics(statistics);
		} catch {
			// Didn't work - try again in a few hours
			success = false;
		} finally {
			if (typeof success === "number") {
				this.driverLog.print(
					`Sending usage statistics was rate limited - next attempt scheduled in ${success} seconds.`,
					"verbose",
				);
				// Wait at most 6 hours to try again
				const retryMs = Math.max(
					timespan.minutes(1),
					Math.min(success * 1000, timespan.hours(6)),
				);
				this.statisticsTimeout = setTimer(() => {
					void this.compileAndSendStatistics();
				}, retryMs).unref();
			} else {
				this.driverLog.print(
					success
						? `Usage statistics sent - next transmission scheduled in 23 hours.`
						: `Failed to send usage statistics - next transmission scheduled in 6 hours.`,
					"verbose",
				);
				this.statisticsTimeout = setTimer(
					() => {
						void this.compileAndSendStatistics();
					},
					timespan.hours(success ? 23 : 6),
				).unref();
			}
		}
	}

	/** Is called when a node interview is completed */
	private onNodeInterviewCompleted(node: ZWaveNode): void {
		this.debounceSendNodeToSleep(node);
	}

	/** This is called when a new node was found and is being added to the network */
	private onNodeFound(node: FoundNode): void {
		// GH#7692: In some cases, an old node's info may be left in the value DB,
		// causing incorrect behavior during interview.

		// Delete from value and metadata DBs
		const prefix = `{"nodeId":${node.id},`;
		for (const key of this.valueDB!.keys()) {
			if (key.startsWith(prefix)) {
				this.valueDB!.delete(key);
			}
		}
		for (const key of this.metadataDB!.keys()) {
			if (key.startsWith(prefix)) {
				this.metadataDB!.delete(key);
			}
		}

		this.cachePurge(
			cacheKeys.node(node.id)._baseKey,
			// Preserve the device class though - this is set during the initial inclusion
			// https://github.com/zwave-js/zwave-js/issues/8346
			(key) => key === cacheKeys.node(node.id).deviceClass,
		);
	}

	/** This is called when a new node has been added to the network */
	private onNodeAdded(node: ZWaveNode): void {
		this.addNodeEventHandlers(node);

		if (this._options.interview?.disableOnNodeAdded) return;
		if (this._options.testingHooks?.skipNodeInterview) return;

		// Interview the node
		// don't await the interview, because it may take a very long time
		// if a node is asleep
		void this.interviewNodeInternal(node);
	}

	/** This is called when a node was removed from the network */
	private onNodeRemoved(node: ZWaveNode, reason: RemoveNodeReason): void {
		// Remove all listeners and timers
		this.removeNodeEventHandlers(node);
		if (this.sendNodeToSleepTimers.has(node.id)) {
			this.sendNodeToSleepTimers.get(node.id)?.clear();
			this.sendNodeToSleepTimers.delete(node.id);
		}
		void this._scheduler.removeTasks(
			(t) => t.tag?.id === "interview" && t.tag.nodeId === node.id,
			new ZWaveError(
				"The node was removed",
				ZWaveErrorCodes.Controller_NodeRemoved,
			),
		);
		if (this.reinterviewTimers.has(node.id)) {
			this.reinterviewTimers.get(node.id)?.clear();
			this.reinterviewTimers.delete(node.id);
		}
		if (this.autoRefreshNodeValueTimers.has(node.id)) {
			this.autoRefreshNodeValueTimers.get(node.id)?.clear();
			this.autoRefreshNodeValueTimers.delete(node.id);
		}
		void this._scheduler.removeTasks(
			(t) => t.tag?.id === "refresh-values" && t.tag.nodeId === node.id,
			new ZWaveError(
				"The node was removed",
				ZWaveErrorCodes.Controller_NodeRemoved,
			),
		);
		if (this.requeueTimers.has(node.id)) {
			this.clearDeferredTransactions(
				node.id,
				"The node was removed from the network",
				ZWaveErrorCodes.Controller_NodeRemoved,
			);
		}

		// purge node values from the DB
		node.valueDB.clear();
		this.cachePurge(cacheKeys.node(node.id)._baseKey);

		// Remove the node from all security manager instances
		this.securityManager?.deleteAllNoncesForReceiver(node.id);
		this.securityManager2?.deleteNonce(node.id);
		this.securityManagerLR?.deleteNonce(node.id);

		void this.rejectAllTransactionsForNode(
			node.id,
			"The node was removed from the network",
			ZWaveErrorCodes.Controller_NodeRemoved,
		);

		const replaced =
			reason === RemoveNodeReason.Replaced
			|| reason === RemoveNodeReason.ProxyReplaced;
		if (!replaced) {
			// Asynchronously remove the node from all possible associations, ignore potential errors
			// but only if the node is not getting replaced, because the removal will interfere with
			// bootstrapping the new node
			this.controller
				.removeNodeFromAllAssociations(node.id)
				.catch((err) => {
					this.driverLog.print(
						`Failed to remove node ${node.id} from all associations: ${err.message}`,
						"error",
					);
				});
		}

		// And clean up all remaining resources used by the node
		node.destroy();

		// If this was a failed node it could mean that all nodes are now ready
		this.checkAllNodesReady();
	}

	private onControllerStatusChanged(_status: ControllerStatus): void {
		this.triggerQueues();
	}

	private async onNetworkFound(
		homeId: number,
		_ownNodeId: number,
	): Promise<void> {
		try {
			this.driverLog.print(
				`Joined network with home ID ${num2hex(
					homeId,
				)}, switching to new network cache...`,
			);
			await this.recreateNetworkCacheAndValueDBs();
		} catch (e) {
			this.driverLog.print(
				`Recreating the network cache and value DBs failed: ${getErrorMessage(
					e,
				)}`,
				"error",
			);
		}
	}

	private onNetworkJoined(): void {
		this.driverLog.print(`Finished joining network`);
	}

	private async onNetworkLeft(): Promise<void> {
		try {
			this.driverLog.print(
				`Left the previous network, switching network cache to new home ID ${num2hex(
					this.controller.homeId,
				)}...`,
			);
			await this.recreateNetworkCacheAndValueDBs();
		} catch (e) {
			this.driverLog.print(
				`Recreating the network cache and value DBs failed: ${getErrorMessage(
					e,
				)}`,
				"error",
			);
		}
	}

	private async recreateNetworkCacheAndValueDBs(): Promise<void> {
		await this._networkCache?.close();
		await this._valueDB?.close();
		await this._metadataDB?.close();

		// Reopen with the new home ID
		await this.initNetworkCache(this.controller.homeId!);
		await this.initValueDBs(this.controller.homeId!);
		await this.performCacheMigration();
	}

	/**
	 * Returns the time in seconds to actually wait after a firmware upgrade, depending on what the device said.
	 * This number will always be a bit greater than the advertised duration, because devices have been found to take longer to actually reboot.
	 */
	public getConservativeWaitTimeAfterFirmwareUpdate(
		advertisedWaitTime: number | undefined,
	): number {
		// Wait the specified time plus a bit, so the device is actually ready to use
		if (!advertisedWaitTime) {
			// Wait at least 5 seconds
			return 5;
		} else if (advertisedWaitTime < 20) {
			return advertisedWaitTime + 5;
		} else if (advertisedWaitTime < 60) {
			return advertisedWaitTime + 10;
		} else {
			return advertisedWaitTime + 30;
		}
	}

	/** This is called when the firmware on one of a node's firmware targets was updated */
	private async onNodeFirmwareUpdated(
		node: ZWaveNode,
		result: FirmwareUpdateResult,
	): Promise<void> {
		const { success, reInterview } = result;

		// Nothing to do for non-successful updates
		if (!success) return;

		// TODO: Add support for delayed activation

		// Reset nonces etc. to prevent false-positive duplicates after the update
		this.securityManager?.deleteAllNoncesForReceiver(node.id);
		this.securityManager2?.deleteNonce(node.id);
		this.securityManagerLR?.deleteNonce(node.id);

		// waitTime should always be defined, but just to be sure
		const waitTime = result.waitTime ?? 5;

		if (reInterview) {
			this.controllerLog.logNode(
				node.id,
				`Firmware updated, scheduling interview in ${waitTime} seconds...`,
			);
			this.reinterviewTimers.set(
				node.id,
				setTimer(() => {
					this.reinterviewTimers.delete(node.id);
					// After a firmware update, refresh the node info
					void node.refreshInfo({
						waitForWakeup: false,
					});
				}, waitTime * 1000).unref(),
			);
		} else {
			this.controllerLog.logNode(
				node.id,
				`Firmware updated. No restart or re-interview required. Refreshing version information in ${waitTime} seconds...`,
			);

			await wait(waitTime * 1000, true);

			try {
				const versionAPI = node.commandClasses.Version;
				await versionAPI.get();
				if (
					versionAPI.supportsCommand(VersionCommand.CapabilitiesGet)
				) {
					await versionAPI.getCapabilities();
				}
				if (
					versionAPI.supportsCommand(VersionCommand.ZWaveSoftwareGet)
				) {
					await versionAPI.getZWaveSoftware();
				}
			} catch {
				// ignore
			}

			// No need to keep the node awake longer than necessary
			node.keepAwake = false;
			this.debounceSendNodeToSleep(node);
		}
	}

	/** This is called when a node emits a `"notification"` event */
	private onNodeNotification: ZWaveNotificationCallback = (
		endpoint,
		ccId,
		ccArgs,
	) => {
		let prefix: string;
		let details: LogPayloadDict;
		if (ccId === CommandClasses.Notification) {
			const msg: MessageRecord = {
				type: ccArgs.label,
				event: ccArgs.eventLabel,
			};
			if (ccArgs.parameters) {
				if (isUint8Array(ccArgs.parameters)) {
					msg.parameters = buffer2hex(ccArgs.parameters);
				} else if (ccArgs.parameters instanceof Duration) {
					msg.duration = ccArgs.parameters.toString();
				} else if (isObject(ccArgs.parameters)) {
					// Copy parameters but censor the userCode field if present
					for (const [key, value] of Object.entries(
						ccArgs.parameters,
					)) {
						if (key === "userCode") {
							// Censor the user code for logging
							msg[key] =
								typeof value === "string" || isUint8Array(value)
									? userCodeToLogString(value)
									: String(value);
						} else {
							msg[key] = isUint8Array(value)
								? buffer2hex(value)
								: value;
						}
					}
				}
			}
			prefix = "[Notification]";
			details = logDict(msg);
		} else if (ccId === CommandClasses["Entry Control"]) {
			prefix = "[Notification] Entry Control";
			details = logDict({
				"event type": ccArgs.eventTypeLabel,
				"data type": ccArgs.dataTypeLabel,
			});
		} else if (ccId === CommandClasses["Multilevel Switch"]) {
			prefix = "[Notification] Multilevel Switch";
			details = logDict({
				"event type": ccArgs.eventTypeLabel,
				direction: ccArgs.direction,
			});
		} /*if (ccId === CommandClasses.Powerlevel)*/ else {
			// Don't bother logging this
			return;
		}

		this.controllerLog.logNode(endpoint.nodeId, {
			endpoint: endpoint.index,
			message: logText(prefix, { nested: details }),
		});
	};

	/** Checks if there are any pending messages for the given node */
	private hasPendingMessages(
		node: ZWaveNodeBase & NodeSchedulePoll,
	): boolean {
		// First check if there are messages in the queue
		if (
			this.hasPendingTransactions(
				(t) => t.message.getNodeId() === node.id,
			)
		) {
			return true;
		}

		// Then check if there are scheduled polls
		return node.hasScheduledPolls();
	}

	/** Checks if there are any pending transactions that match the given predicate */
	public hasPendingTransactions(
		predicate: (t: Transaction) => boolean,
	): boolean {
		// Queue is not an array
		// oxlint-disable-next-line unicorn/prefer-array-some
		if (!!this.queue.find((t) => predicate(t))) return true;
		return this.queues.some(
			(q) => q.currentTransaction && predicate(q.currentTransaction),
		);
	}

	/**
	 * Retrieves the maximum version of a command class the given endpoint supports.
	 * Returns 0 when the CC is not supported. Also returns 0 when the node was not found.
	 * Falls back to querying the root endpoint if an endpoint was not found on the node
	 *
	 * @param cc The command class whose version should be retrieved
	 * @param nodeId The node for which the CC version should be retrieved
	 * @param endpointIndex The endpoint in question
	 */
	public getSupportedCCVersion(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex: number = 0,
	): number {
		if (!this._controller?.nodes.has(nodeId)) {
			return 0;
		}
		const node = this.controller.nodes.get(nodeId)!;
		const endpoint = node.getEndpoint(endpointIndex);
		if (endpoint) return endpoint.getCCVersion(cc);
		// We sometimes receive messages from an endpoint, but can't find that endpoint.
		// In that case fall back to the root endpoint to determine the supported version.
		return node.getCCVersion(cc);
	}

	/**
	 * Retrieves the maximum version of a command class that can be used to communicate with a node.
	 * Returns the highest implemented version if the node's CC version is unknown.
	 * Returns `undefined` for CCs that are not implemented in this library yet.
	 *
	 * @param cc The command class whose version should be retrieved
	 * @param nodeId The node for which the CC version should be retrieved
	 * @param endpointIndex The endpoint for which the CC version should be retrieved
	 */
	public getSafeCCVersion(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex: number = 0,
	): number | undefined {
		const implementedVersion = getImplementedVersion(cc);
		if (
			implementedVersion === 0
			|| implementedVersion === Number.POSITIVE_INFINITY
		) {
			return undefined;
		}
		const supportedVersion = this.getSupportedCCVersion(
			cc,
			nodeId,
			endpointIndex,
		);
		if (supportedVersion === 0) {
			// Unknown, use the highest implemented version
			return implementedVersion;
		}

		return Math.min(supportedVersion, implementedVersion);
	}

	/**
	 * Determines whether a CC must be secure for a given node and endpoint.
	 *
	 * @param ccId The command class in question
	 * @param nodeId The node for which the CC security should be determined
	 * @param endpointIndex The endpoint for which the CC security should be determined
	 */
	isCCSecure(
		ccId: CommandClasses,
		nodeId: number,
		endpointIndex: number = 0,
	): boolean {
		// This is obvious
		if (
			ccId === CommandClasses.Security
			|| ccId === CommandClasses["Security 2"]
		) {
			return true;
		}

		const node = this.controller.nodes.get(nodeId);
		// Node is unknown, don't use secure communication
		if (!node) return false;

		const endpoint = node.getEndpoint(endpointIndex);

		const securityClass = node.getHighestSecurityClass();
		// Node is not secure, don't use secure communication
		if (
			securityClass === undefined
			|| securityClass === SecurityClass.None
		) {
			return false;
		}

		// Special case for Basic CC, which we sometimes hide:
		// A securely included node MAY support the Basic Command Class at the highest security level but it
		// MUST NOT support the Basic Command Class at any lower security level or non-securely.
		const isBasicCC = ccId === CommandClasses.Basic;

		// Security S2 specs also mandate that all non-securely supported CCs MUST also be supported securely
		// so we can just shortcut if the node is using S2
		if (securityClassIsS2(securityClass)) {
			// Use secure communication if the CC is supported. This avoids silly things like S2-encapsulated pings
			return (
				!!this.getSecurityManager2(nodeId)
				&& (isBasicCC || (endpoint ?? node).supportsCC(ccId))
			);
		}

		// Security S0 can be a little more complicated, with secure and non-secure endpoints
		if (securityClass === SecurityClass.S0_Legacy) {
			// Therefore actually check if the CC is marked as secure
			return (
				!!this.securityManager
				&& (isBasicCC || (endpoint ?? node).isCCSecure(ccId))
			);
		}

		// We shouldn't be here
		return false;
	}

	/**
	 * **!!! INTERNAL !!!**
	 *
	 * Not intended to be used by applications.
	 * Needed for compatibility with CCAPIHost
	 */
	public schedulePoll(
		nodeId: number,
		valueId: ValueID,
		options: SchedulePollOptions,
	): boolean {
		const node = this.controller.nodes.getOrThrow(nodeId);
		return node.schedulePoll(valueId, options);
	}

	private isSoftResetting: boolean = false;

	private maySoftReset(): boolean {
		// 700+ series controllers have no problems with soft reset and MUST even be soft reset in some cases
		if (this._controller?.sdkVersionGt("7.0")) return true;

		// Blacklist some sticks that are known to not support soft reset
		const { manufacturerId, productType, productId } = this.controller;

		// Z-Wave.me UZB1
		if (
			manufacturerId === 0x0115
			&& productType === 0x0000
			&& productId === 0x0000
		) {
			return false;
		}

		// Z-Wave.me UZB
		if (
			manufacturerId === 0x0115
			&& productType === 0x0400
			&& productId === 0x0001
		) {
			return false;
		}

		// Vision Gen5 USB Stick
		if (
			manufacturerId === 0x0109
			&& productType === 0x1001
			&& productId === 0x0201
			// firmware version 15.1 (GH#3730)
		) {
			return false;
		}

		// No clear indication, make the result depend on the config option
		return !!this._options.features.softReset;
	}

	/**
	 * Soft-resets the controller if the feature is enabled
	 */
	public async trySoftReset(): Promise<void> {
		if (this.maySoftReset()) {
			await this.softReset();
		} else {
			const message = `The controller should not or cannot be soft reset, skipping API call.`;
			this.controllerLog.print(message, "warn");
		}
	}

	/**
	 * Instruct the controller to soft-reset.
	 *
	 * **Warning:** USB modules will reconnect, meaning that they might get a new address.
	 *
	 * **Warning:** This call will throw if soft-reset is not enabled.
	 */
	public async softReset(): Promise<void> {
		if (!this.maySoftReset()) {
			const message = `The controller does not support soft reset or the soft reset feature has been disabled with a config option or the ZWAVEJS_DISABLE_SOFT_RESET environment variable.`;
			this.controllerLog.print(message, "error");
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.Driver_FeatureDisabled,
			);
		}

		if (this._controller?.isAnyOTAFirmwareUpdateInProgress()) {
			const message = `Failed to soft reset controller: A firmware update is in progress on this network.`;
			this.controllerLog.print(message, "error");
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy,
			);
		}

		return this.softResetInternal(true);
	}

	private async softResetInternal(destroyOnError: boolean): Promise<void> {
		this.controllerLog.print("Performing soft reset...");

		try {
			this.isSoftResetting = true;
			await this.sendMessage(new SoftResetRequest(), {
				supportCheck: false,
				pauseSendThread: true,
			});
		} catch (e) {
			this.controllerLog.print(
				`Soft reset failed: ${getErrorMessage(e)}`,
				"error",
			);
			// Don't continue if the controller is unresponsive
			if (isMissingControllerACK(e)) {
				this.isSoftResetting = false;
				throw e;
			}
		}

		if (this._controller) {
			// Soft-reset resets the node ID type back to 8 bit
			this._controller["_nodeIdType"] = NodeIDType.Short;

			// Soft-resetting disables any ongoing inclusion, so we need to reset
			// the state that is tracked in the controller
			this._controller.setInclusionState(InclusionState.Idle);
		}

		// Make sure we're able to communicate with the controller again
		if (!(await this.ensureSerialAPI())) {
			if (destroyOnError) {
				// Notify applications that the driver failed, so they can
				// clean up and restart, instead of just disappearing
				await this.destroyWithMessage(
					"The Serial API did not respond after soft-reset",
				);
			} else {
				throw new ZWaveError(
					"The Serial API did not respond after soft-reset",
					ZWaveErrorCodes.Driver_Failed,
				);
			}
		}

		this.isSoftResetting = false;

		// This is a bit hacky, but what the heck...
		if (!this._enteringBootloader) {
			// Start the watchdog again, unless disabled
			if (this.options.features.watchdog) {
				void this._controller?.startWatchdog();
			}

			// If desired, re-configure the controller to use 16 bit node IDs
			void this._controller?.trySetNodeIDType(NodeIDType.Long);

			// Resume sending
			this.unpauseSendQueue();
		}
	}

	/**
	 * Soft-reset the Z-Wave module and restart the driver instance.
	 * @param callingTask The task that calls this method. It survives the restart, all other tasks are removed.
	 */
	public async softResetAndRestart(callingTask?: TaskHandle): Promise<void> {
		this.controllerLog.print("Performing soft reset...");

		try {
			this.isSoftResetting = true;
			await this.sendMessage(new SoftResetRequest(), {
				supportCheck: false,
				pauseSendThread: true,
			});
		} catch (e) {
			this.controllerLog.print(
				`Soft reset failed: ${getErrorMessage(e)}`,
				"error",
			);
		}

		// Make sure we're able to communicate with the controller again
		if (!(await this.ensureSerialAPI())) {
			await this.destroyWithMessage(
				"The Serial API did not respond after soft-reset",
			);
		}

		this.isSoftResetting = false;

		// Clean up and interview the controller again
		await this.destroyController((task) => task === callingTask);
		void this.initializeControllerAndNodes();
	}

	/**
	 * Checks whether recovering an unresponsive controller is enabled
	 * and whether the driver is in a state where it makes sense.
	 */
	private mayRecoverUnresponsiveController(): boolean {
		if (!this._options.features.unresponsiveControllerRecovery) {
			return false;
		}
		// Only recover after we know the controller has been responsive
		return this._controllerInterviewed;
	}

	private async ensureSerialAPI(): Promise<boolean> {
		// Wait 1.5 seconds after reset to ensure that the module is ready for communication again
		// Z-Wave 700 sticks are relatively fast, so we also wait for the Serial API started command
		// to bail early
		this.controllerLog.print("Waiting for the controller to reconnect...");
		let waitResult = await this.waitForMessage<SerialAPIStartedRequest>(
			(msg) => msg.functionType === FunctionType.SerialAPIStarted,
			1500,
		).catch(() => false as const);

		if (waitResult) {
			// Serial API did start
			this.controllerLog.print("reconnected and restarted");
			if (this._controller) {
				this._controller["_supportsLongRange"] =
					waitResult.supportsLongRange;
			}
			return true;
		}

		// If the controller disconnected the serial port during the soft reset, we need to re-open it
		if (!this.serial!.isOpen) {
			this.controllerLog.print("Re-opening serial port...");
			try {
				await this.openSerialport();
			} catch {
				return false;
			}
		}

		// Wait the configured amount of time for the Serial API started command to be received
		this.controllerLog.print("Waiting for the Serial API to start...");
		waitResult = await this.waitForMessage<SerialAPIStartedRequest>(
			(msg) => {
				return msg.functionType === FunctionType.SerialAPIStarted;
			},
			this._options.timeouts.serialAPIStarted,
		).catch(() => false as const);

		if (waitResult) {
			// Serial API did start, maybe do something with the information?
			this.controllerLog.print("Serial API started");
			if (this._controller) {
				this._controller["_supportsLongRange"] =
					waitResult.supportsLongRange;
			}
			return true;
		}

		this.controllerLog.print(
			"Did not receive notification that Serial API has started, checking if it responds...",
		);

		// We don't need to use any specific command here. However we're going to use this one in the interview
		// anyways, so we might aswell use it here too
		const pollController = async () => {
			try {
				// And resume sending - this requires us to unpause the send thread
				this.unpauseSendQueue();
				await this.sendMessage(new GetControllerVersionRequest(), {
					supportCheck: false,
					priority: MessagePriority.ControllerImmediate,
				});
				this.pauseSendQueue();
				this.controllerLog.print("Serial API responded");
				return true;
			} catch {
				return false;
			}
		};
		// Poll the controller with increasing backoff delay
		if (await pollController()) return true;
		for (const backoff of [2, 5, 10, 15]) {
			this.controllerLog.print(
				`Serial API did not respond, trying again in ${backoff} seconds...`,
			);
			await wait(backoff * 1000);
			if (await pollController()) return true;
		}

		this.controllerLog.print(
			"Serial API did not respond, giving up",
			"error",
		);
		return false;
	}

	private _ensureCLIReadyPromise: DeferredPromise<boolean> | undefined;
	private async ensureCLIReady(): Promise<boolean> {
		// Ensure this is only called once and all subsequent calls block
		if (this._ensureCLIReadyPromise) return this._ensureCLIReadyPromise;
		this._ensureCLIReadyPromise = createDeferredPromise();

		// Try to detect the available CLI commands and wait long enough for the communication to succeed
		// Wait 1.5 seconds after reset to ensure that the module is ready for communication again
		// Z-Wave 700 sticks are relatively fast, so we also wait for the Serial API started command
		// to bail early
		this.controllerLog.print("Waiting for the CLI to be ready...");

		// After booting, the CLI can take a while to respond to commands
		// Try up to 3 times to detect the available commands
		await wait(250);
		for (let i = 0; ; i++) {
			try {
				await this.cli.detectCommands();
				this.controllerLog.print("CLI started");
				this._ensureCLIReadyPromise?.resolve(true);
				this._ensureCLIReadyPromise = undefined;
				return true;
			} catch {
				if (i === 2) {
					this.controllerLog.print(
						"CLI did not respond, giving up",
						"error",
					);
					this._ensureCLIReadyPromise?.resolve(false);
					this._ensureCLIReadyPromise = undefined;
					return false;
				}
				await wait(1000);
			}
		}
	}

	/**
	 * Performs a hard reset on the controller. This wipes out all configuration!
	 *
	 * The returned Promise resolves when the hard reset has been performed.
	 * It does not wait for the initialization process which is started afterwards.
	 */
	public async hardReset(): Promise<void> {
		this.ensureReady(true);

		if (this.controller.isAnyOTAFirmwareUpdateInProgress()) {
			const message = `Failed to hard reset controller: A firmware update is in progress on this network.`;
			this.controllerLog.print(message, "error");
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy,
			);
		}

		// Preserve the private key for the authenticated learn mode ECDH key pair
		const oldPrivateKey = this.cacheGet<BytesView>(
			cacheKeys.controller.privateKey,
		);

		// Drop all scheduled tasks - they don't make sense after a hard reset
		await this.scheduler.removeTasks(
			() => true,
			new ZWaveError(
				"The controller is being hard-reset",
				ZWaveErrorCodes.Driver_TaskRemoved,
			),
		);

		// Update the controller NIF prior to hard resetting
		await this.controller.setControllerNIF();
		await this.controller.hardReset();

		// Clean up
		await this.destroyController();
		void this.initializeControllerAndNodes();

		// Save the key pair in the new cache again
		if (oldPrivateKey) {
			this.once("driver ready", () => {
				this.cacheSet(cacheKeys.controller.privateKey, oldPrivateKey);
			});
		}
	}

	/**
	 * Instructs the Z-Wave API to shut down in order to safely remove the power.
	 * This will destroy the driver instance if it succeeds.
	 */
	public async shutdown(): Promise<boolean> {
		this.ensureReady(true);

		// Not a good idea to abort firmware updates this way
		if (this.controller.isAnyOTAFirmwareUpdateInProgress()) {
			const message = `Failed to shut down controller: A firmware update is in progress on this network.`;
			this.controllerLog.print(message, "error");
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy,
			);
		}

		const result = await this.controller.shutdown();
		try {
			if (result) await this.destroy();
		} finally {
			// oxlint-disable-next-line no-unsafe-finally - We want to return this value in any case
			return result;
		}
	}

	private _destroyPromise: DeferredPromise<void> | undefined;
	private get wasDestroyed(): boolean {
		return !!this._destroyPromise;
	}

	/**
	 * Ensures that the driver is ready to communicate (serial port open and not destroyed).
	 * If desired, also checks that the controller interview has been completed.
	 */
	private ensureReady(includingController: boolean = false): void {
		if (!this._wasStarted || !this._isOpen || this.wasDestroyed) {
			throw new ZWaveError(
				"The driver is not ready or has been destroyed",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		if (includingController && !this._controllerInterviewed) {
			throw new ZWaveError(
				"The controller is not ready yet",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		if (this._bootloader) {
			throw new ZWaveError(
				"Cannot do this while in bootloader mode",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
	}

	/** Indicates whether the driver is ready, i.e. the "driver ready" event was emitted */
	public get ready(): boolean {
		return (
			this._wasStarted
			&& this._isOpen
			&& !this.wasDestroyed
			&& this._controllerInterviewed
		);
	}

	private async destroyWithMessage(message: string): Promise<void> {
		this.driverLog.print(message, "error");

		const error = new ZWaveError(message, ZWaveErrorCodes.Driver_Failed);
		this.emit("error", error);

		await this.destroy();
	}

	/**
	 * Terminates the driver instance and closes the underlying serial connection.
	 * Must be called under any circumstances.
	 */
	public async destroy(): Promise<void> {
		// Ensure this is only called once and all subsequent calls block
		if (this._destroyPromise) return this._destroyPromise;
		this._destroyPromise = createDeferredPromise();

		this.driverLog.print("destroying driver instance...");

		// First stop the scheduler, all queues and close the serial port, so nothing happens anymore
		await this._scheduler.stop();

		await this.destroyTransactionQueues(
			"driver instance destroyed",
			ZWaveErrorCodes.Driver_Destroyed,
		);

		this.destroySerialAPIQueue(
			"driver instance destroyed",
			ZWaveErrorCodes.Driver_Destroyed,
		);

		if (this.serial != undefined) {
			// Avoid spewing errors if the port was in the middle of receiving something
			if (this.serial.isOpen) await this.serial.close();
			this.serial = undefined;
		}

		await this.destroyController();

		this.driverLog.print(`driver instance destroyed`);

		// destroy loggers as the very last thing
		this._logContainer.destroy();

		this._destroyPromise.resolve();
	}

	/** Cleanly destroy the controller instance, but not the entire driver */
	// FIXME: Too much overlap with destroy()
	private async destroyController(
		keepTask?: (task: Task<unknown>) => boolean,
	): Promise<void> {
		// Avoid re-transmissions etc. communicating with other applications
		// or the bootloader
		await this.scheduler.removeTasks(
			(task) => !keepTask?.(task),
			new ZWaveError(
				"The controller instance is being destroyed",
				ZWaveErrorCodes.Driver_TaskRemoved,
			),
		);

		await this.destroyTransactionQueues(
			"The controller instance is being destroyed",
			ZWaveErrorCodes.Driver_TaskRemoved,
		);

		this.destroySerialAPIQueue(
			"The controller instance is being destroyed",
			ZWaveErrorCodes.Driver_TaskRemoved,
		);

		this.requestHandlers.clear();

		// Attempt to close the value DBs and network cache
		await this.closeDatabases();

		// Remove all timeouts
		this.clearAllTimeouts();

		// Destroy all nodes and the controller
		if (this._controller) {
			this._controller.destroy();
			this._controller = undefined;
		}

		this._controllerInterviewed = false;
		this._nodesReady.clear();
		this._nodesReadyEventEmitted = false;
	}

	private async closeDatabases(): Promise<void> {
		try {
			await this._valueDB?.close();
		} catch (e) {
			this.driverLog.print(
				`Closing the value DB failed: ${getErrorMessage(e)}`,
				"error",
			);
		}
		try {
			await this._metadataDB?.close();
		} catch (e) {
			this.driverLog.print(
				`Closing the metadata DB failed: ${getErrorMessage(e)}`,
				"error",
			);
		}
		try {
			await this._networkCache?.close();
		} catch (e) {
			this.driverLog.print(
				`Closing the network cache failed: ${getErrorMessage(e)}`,
				"error",
			);
		}
	}

	private clearAllTimeouts() {
		for (const timeout of [this._powerlevelTestNodeContext?.timeout]) {
			if (timeout) clearTimeout(timeout);
		}
		for (const timeout of [
			...this.autoRefreshNodeValueTimers.values(),
			...this.reinterviewTimers.values(),
			this.statisticsTimeout,
			this.pollBackgroundRSSITimer,
			...this.sendNodeToSleepTimers.values(),
			...this.awaitedCommands.map((c) => c.timeout),
			...this.awaitedMessages.map((m) => m.timeout),
			...this.awaitedMessageHeaders.map((h) => h.timeout),
			...this.awaitedBootloaderChunks.map((b) => b.timeout),
			...this.awaitedCLIChunks.map((c) => c.timeout),
			...[...this.requeueTimers.values()].flatMap((batches) =>
				[...batches].map((batch) => batch.timer),
			),
			this._pollDelayTimer,
		]) {
			timeout?.clear();
		}

		this.partialCCSessions.clear();
	}

	private async handleSerialData(serial: ZWaveSerialStream): Promise<void> {
		try {
			for await (const frame of serial.readable) {
				setImmediate(() => {
					// Frames that were read before the driver was destroyed
					// must not be handled anymore
					if (this.wasDestroyed) return;

					if (frame.type === ZWaveSerialFrameType.SerialAPI) {
						void this.serialport_onData(frame.data);
					} else if (frame.type === ZWaveSerialFrameType.Bootloader) {
						void this.serialport_onBootloaderData(frame.data);
					} else if (frame.type === ZWaveSerialFrameType.CLI) {
						void this.serialport_onCLIData(frame.data);
					} else {
						// Handle discarded data?
					}
				});
			}
		} catch (e) {
			if (isAbortError(e)) return;

			if (
				isZWaveError(e)
				&& e.code === ZWaveErrorCodes.Driver_SerialPortClosed
			) {
				// A disconnection while soft resetting is to be expected.
				// The soft reset method will handle reopening
				if (this.isSoftResetting || this._isOpeningSerialPort) return;

				void this.handleSerialPortClosedUnexpectedly();
				return;
			}
			throw e;
		}
	}

	private async handleSerialPortClosedUnexpectedly(): Promise<void> {
		// Otherwise, try to recover by reopening the serial port
		this.driverLog.print(
			"Serial port closed unexpectedly, attempting to reopen...",
			"warn",
		);

		await wait(1000);
		try {
			await this.openSerialport();
		} catch (ee) {
			void this.destroyWithMessage(getErrorMessage(ee));
			return;
		}

		this.driverLog.print("Serial port reopened", "warn");
	}

	/**
	 * Is called when the serial port has received a single-byte message or a complete message buffer
	 */
	private async serialport_onData(
		data:
			| BytesView
			| MessageHeaders.ACK
			| MessageHeaders.CAN
			| MessageHeaders.NAK,
	): Promise<void> {
		if (typeof data === "number") {
			switch (data) {
				case MessageHeaders.ACK:
				case MessageHeaders.NAK:
				case MessageHeaders.CAN: {
					// check if someone is waiting for this
					for (const entry of this.awaitedMessageHeaders) {
						if (entry.predicate(data)) {
							entry.handler(data);
							break;
						}
					}
					return;
				}
			}
		}

		this._cli = undefined;
		this._bootloader = undefined;

		let msg: Message | undefined;
		try {
			// Parse the message while remembering potential decoding errors in embedded CCs
			// This way we can log the invalid CC contents
			msg = Message.parse(data, this.getMessageParsingContext());

			// Parse embedded CCs
			if (isCommandRequest(msg) && containsSerializedCC(msg)) {
				msg.command = await CommandClass.parse(msg.serializedCC, {
					...this.getCCParsingContext(),
					sourceNodeId: msg.getNodeId()!,
					frameType: msg.frameType,
				});

				// Whether successful or not, a message from a node should update last seen
				const node = this.tryGetNode(msg);
				if (node) node.lastSeen = new Date();

				// Ensure there are no errors
				assertValidCCs(msg as ContainsCC);
			}
			// And update statistics
			if (!!this._controller) {
				if (containsCC(msg)) {
					this.tryGetNode(msg)?.incrementStatistics("commandsRX");
				} else {
					this._controller.incrementStatistics("messagesRX");
				}
			}
			// all good, send ACK
			await this.writeHeader(MessageHeaders.ACK);
		} catch (e: any) {
			try {
				if (await this.handleSecurityS2DecodeError(e, msg)) {
					// TODO
				} else {
					const response = this.handleDecodeError(e, data, msg);
					if (response) await this.writeHeader(response);
					if (!!this._controller) {
						if (containsCC(msg)) {
							this.tryGetNode(msg)?.incrementStatistics(
								"commandsDroppedRX",
							);

							// Figure out if the command was received with supervision encapsulation
							const supervisionSessionId =
								SupervisionCC.getSessionId(msg.command);
							if (
								supervisionSessionId !== undefined
								&& msg.command instanceof InvalidCC
							) {
								// If it was, we need to notify the sender that we couldn't decode the command
								await this.answerUnsuccessfulSupervisedCommand(
									msg,
									SupervisionStatus.NoSupport,
								);
								return;
							}
						} else {
							this._controller.incrementStatistics(
								"messagesDroppedRX",
							);
						}
					}
				}
			} catch (ee) {
				if (ee instanceof Error) {
					if (/serial port is not open/.test(ee.message)) {
						this.emit("error", ee);
						void this.destroy();
						return;
					}
					// Print something, so we know what is wrong
					this._driverLog.print(ee.stack ?? ee.message, "error");
				}
			}
			// Don't keep handling the message
			msg = undefined;
		}

		// If we receive a CC from a node while the controller is not ready yet,
		// we can't do anything with it, but logging it may assume that it can access the controller.
		// To prevent this problem, we just ignore CCs until the controller is ready
		if (!this._controller && containsCC(msg)) return;

		// If the message could be decoded, forward it to the send thread
		if (msg) {
			if (isCommandRequest(msg) && containsCC(msg)) {
				// SecurityCCCommandEncapsulationNonceGet is two commands in one, but
				// we're not set up to handle things like this. Reply to the nonce get
				// and handle the encapsulation part normally
				if (
					msg.command
					instanceof SecurityCCCommandEncapsulationNonceGet
				) {
					const node = this.tryGetNode(msg);
					if (node) {
						void this.handleSecurityNonceGet(node);
					}
				}

				// Transport Service commands must be handled before assembling partial CCs
				if (isTransportServiceEncapsulation(msg.command)) {
					// Log Transport Service commands before doing anything else
					this.driverLog.logMessage(msg, {
						secondaryTags: ["partial"],
						direction: "inbound",
					});

					const reassembled =
						await this.handleTransportServiceCommand(msg.command);
					if (!reassembled) {
						// The datagram is not complete yet.
						// Check if a message timer needs to be refreshed.
						this.refreshAwaitedMessageTimers(msg);
						return;
					}

					// The reassembled command continues through the normal receive
					// path and is logged again there, so its contents are visible.
					// Transport Service is always the outermost CC, so nothing else
					// needs to be preserved.
					msg.command = reassembled;
				}

				// Make sure the command was received at the expected security level
				// BEFORE assembling partial CCs. Otherwise it would be possible to
				// inject unencrypted segments into a partial CC session.
				if (this.isSecurityLevelTooLow(msg.command)) {
					this.driverLog.logMessage(msg, {
						direction: "inbound",
						secondaryTags: ["discarded"],
					});
					return;
				}

				// Assemble partial CCs on the driver level. Only forward complete messages to the send thread machine
				const completeMsg = await this.assemblePartialCCs(msg);
				if (!completeMsg) {
					// Check if a message timer needs to be refreshed.
					this.refreshAwaitedMessageTimers(msg);
					return;
				}
				// Responses split into multiple messages are completed by the message
				// containing the final segment, which may not be the current one
				msg = completeMsg;

				// Now that the command is complete, the checks that depend on the actual payload can be done
				if (
					// This includes re-checking the security level, because
					// S0 encapsulated frames are only decrypted in assemblePartialCCs
					this.isSecurityLevelTooLow(completeMsg.command)
					|| this.shouldDiscardCC(completeMsg.command)
				) {
					this.driverLog.logMessage(completeMsg, {
						direction: "inbound",
						secondaryTags: ["discarded"],
					});
					return;
				}

				// When we have a complete CC, save its values
				try {
					this.persistCCValues(completeMsg.command);
				} catch (e) {
					// Indicate invalid payloads with a special CC type
					if (
						isZWaveError(e)
						&& e.code
							=== ZWaveErrorCodes.PacketFormat_InvalidPayload
					) {
						this.driverLog.print(
							`dropping CC with invalid values${
								typeof e.context === "string"
									? ` (Reason: ${e.context})`
									: ""
							}`,
							"warn",
						);
						// If the command was received with supervision encapsulation,
						// notify the sender that we failed to handle it
						await this.answerUnsuccessfulSupervisedCommand(
							completeMsg,
							SupervisionStatus.Fail,
						);
						// TODO: We may need to do the S2 MOS dance here - or we can deal with it when the next valid CC arrives
						return;
					} else if (isDatabaseNotOpenError(e)) {
						// The value DB is closed while the driver is shutting
						// down or reinitializing the controller
						this.driverLog.print(
							`Dropping message because the driver is not ready to handle it.`,
							"warn",
						);
						return;
					} else {
						throw e;
					}
				}
			}

			try {
				this.driverLog.logMessage(msg, {
					direction: "inbound",
				});
			} catch (e) {
				// We shouldn't throw just because logging a message fails
				this.driverLog.print(
					`Logging a message failed: ${getErrorMessage(e)}`,
				);
			}

			// // Check if this message is unsolicited by passing it to the Serial API command interpreter if possible
			// if (
			// 	this.serialAPIInterpreter?.status === InterpreterStatus.Running
			// ) {
			// 	this.serialAPIInterpreter.send({
			// 		type: "message",
			// 		message: msg,
			// 	});
			// } else {
			void this.handleUnsolicitedMessage(msg);
			// }
		}
	}

	/** Handles a decoding error and returns the desired reply to the stick */
	private handleDecodeError(
		e: Error,
		data: BytesView,
		msg: Message | undefined,
	): MessageHeaders | undefined {
		if (isZWaveError(e)) {
			switch (e.code) {
				case ZWaveErrorCodes.PacketFormat_Invalid:
				case ZWaveErrorCodes.PacketFormat_Checksum:
				case ZWaveErrorCodes.PacketFormat_Truncated:
					this.driverLog.print(
						`Dropping message because it contains invalid data`,
						"warn",
					);
					return MessageHeaders.NAK;

				case ZWaveErrorCodes.Deserialization_NotImplemented:
				case ZWaveErrorCodes.CC_NotImplemented:
					this.driverLog.print(
						`Dropping message because it could not be deserialized: ${e.message}`,
						"warn",
					);
					return MessageHeaders.ACK;

				case ZWaveErrorCodes.Driver_NotReady:
					this.driverLog.print(
						`Dropping message because the driver is not ready to handle it yet.`,
						"warn",
					);
					return MessageHeaders.ACK;

				case ZWaveErrorCodes.PacketFormat_InvalidPayload:
					if (msg) {
						const nodeId = msg.getNodeId();
						const message = `Dropping message with invalid payload${
							typeof e.context === "string"
								? ` (Reason: ${e.context})`
								: ""
						}`;
						if (nodeId != undefined) {
							this.controllerLog.logNode(nodeId, {
								message,
								direction: "inbound",
								level: "warn",
							});
						} else {
							this.driverLog.print(message, "warn");
						}
						try {
							this.driverLog.logMessage(msg, {
								direction: "inbound",
							});
						} catch (e) {
							// We shouldn't throw just because logging a message fails
							this.driverLog.print(
								`Logging a message failed: ${getErrorMessage(
									e,
								)}`,
							);
						}
					} else {
						this.driverLog.print(
							`Dropping message with invalid payload${
								typeof e.context === "string"
									? ` (Reason: ${e.context})`
									: ""
							}:\n${buffer2hex(data)}`,
							"warn",
						);
					}
					return MessageHeaders.ACK;

				case ZWaveErrorCodes.Driver_NoSecurity:
				case ZWaveErrorCodes.Security2CC_NotInitialized:
					this.driverLog.print(
						`Dropping message because network keys are not set or the driver is not yet ready to receive secure messages.`,
						"warn",
					);
					return MessageHeaders.ACK;

				case ZWaveErrorCodes.Controller_NodeNotFound:
					this.driverLog.print(
						`Dropping message because ${
							typeof e.context === "number"
								? `node ${e.context}`
								: "the node"
						} does not exist.`,
						"warn",
					);
					return MessageHeaders.ACK;
			}
		} else {
			if (isDatabaseNotOpenError(e)) {
				this.driverLog.print(
					`Dropping message because the driver is not ready to handle it yet.`,
					"warn",
				);
				return MessageHeaders.ACK;
			}
		}
		// Pass all other errors through
		throw e;
	}

	private mustReplyWithSecurityS2MOS(
		msg: ContainsCC & CommandRequest,
	): boolean {
		// We're looking for a singlecast S2-encapsulated request
		if (msg.frameType !== "singlecast") return false;
		const encapS2 = msg.command.getEncapsulatingCC(
			CommandClasses["Security 2"],
			Security2Command.MessageEncapsulation,
		) as Security2CCMessageEncapsulation | undefined;
		if (!encapS2) return false;

		// With the MGRP extension present
		const node = this.tryGetNode(msg);
		if (!node) return false;
		const groupId = encapS2.getMulticastGroupId();
		if (groupId == undefined) return false;
		const securityManager = this.getSecurityManager2(node.id);
		if (
			// but where we don't have an MPAN stored
			securityManager?.getPeerMPAN(msg.command.nodeId as number, groupId)
				.type !== MPANState.MPAN
		) {
			return true;
		}
		return false;
	}

	private async handleSecurityS2DecodeError(
		e: Error,
		msg: Message | undefined,
	): Promise<boolean> {
		if (!isZWaveError(e)) return false;
		if (
			(e.code === ZWaveErrorCodes.Security2CC_NoSPAN
				|| e.code === ZWaveErrorCodes.Security2CC_CannotDecode)
			&& containsCC(msg)
		) {
			// Decoding the command failed because no SPAN has been established with the other node
			const nodeId = msg.getNodeId()!;
			// If the node isn't known, ignore this error
			const node = this._controller?.nodes.get(nodeId);
			if (!node) return false;

			// Before we can send anything, ACK the command
			await this.writeHeader(MessageHeaders.ACK);

			this.driverLog.logMessage(msg, { direction: "inbound" });
			node.incrementStatistics("commandsDroppedRX");

			// We might receive this before the node has been interviewed. If that case, we need to mark Security S2 as
			// supported or we won't ever be able to communicate with the node
			if (node.interviewStage < InterviewStage.NodeInfo) {
				node.addCC(CommandClasses["Security 2"], {
					isSupported: true,
					version: 1,
				});
			}

			// Ensure that we're not flooding the queue with unnecessary NonceReports
			const isS2NonceReport = (t: Transaction) =>
				t.message.getNodeId() === nodeId
				&& containsCC(t.message)
				&& t.message.command instanceof Security2CCNonceReport;

			const message: string =
				e.code === ZWaveErrorCodes.Security2CC_CannotDecode
					? "Message authentication failed"
					: "No SPAN is established yet";

			if (this.controller.bootstrappingS2NodeId === nodeId) {
				// The node is currently being bootstrapped.
				const securityManager = this.getSecurityManager2(nodeId);
				if (securityManager?.tempKeys.has(nodeId)) {
					// The DSK has been verified, so we should be able to decode this command.
					// If this is the first attempt, we need to request a nonce first
					if (
						securityManager.getSPANState(nodeId).type
						=== SPANState.None
					) {
						this.controllerLog.logNode(nodeId, {
							message: `${message}, cannot decode command. Requesting a nonce...`,
							level: "verbose",
							direction: "outbound",
						});
						// Send the node our nonce
						node.commandClasses["Security 2"]
							.sendNonce()
							.catch(() => {
								// Ignore errors
							});
					} else {
						// Us repeatedly not being able to decode the command means we need to abort the bootstrapping process
						// because the PIN is wrong
						this.controllerLog.logNode(nodeId, {
							message: `${message}, cannot decode command. Aborting the S2 bootstrapping process...`,
							level: "error",
							direction: "inbound",
						});
						this.controller.cancelSecureBootstrapS2(
							KEXFailType.BootstrappingCanceled,
						);
					}
				} else {
					this.controllerLog.logNode(nodeId, {
						message: `Ignoring KEXSet because the DSK has not been verified yet`,
						level: "verbose",
						direction: "inbound",
					});
				}
			} else if (!this.hasPendingTransactions(isS2NonceReport)) {
				this.controllerLog.logNode(nodeId, {
					message: `${message}, cannot decode command. Requesting a nonce...`,
					level: "verbose",
					direction: "outbound",
				});
				// Send the node our nonce, and use the chance to re-sync the MPAN if necessary
				const s2MulticastOutOfSync =
					isCommandRequest(msg)
					&& this.mustReplyWithSecurityS2MOS(msg);

				node.commandClasses["Security 2"]
					.withOptions({ s2MulticastOutOfSync })
					.sendNonce()
					.catch(() => {
						// Ignore errors
					});
			} else {
				this.controllerLog.logNode(nodeId, {
					message: `${message}, cannot decode command.`,
					level: "verbose",
					direction: "none",
				});
			}

			return true;
		} else if (
			(e.code === ZWaveErrorCodes.Security2CC_NoMPAN
				|| e.code === ZWaveErrorCodes.Security2CC_CannotDecodeMulticast)
			&& containsCC(msg)
		) {
			// Decoding the command failed because the MPAN used by the other node
			// is not known to us yet
			const nodeId = msg.getNodeId()!;
			// If the node isn't known, ignore this error
			const node = this._controller?.nodes.get(nodeId);
			if (!node) return false;

			// Before we can send anything, ACK the command
			await this.writeHeader(MessageHeaders.ACK);

			this.driverLog.logMessage(msg, { direction: "inbound" });
			node.incrementStatistics("commandsDroppedRX");

			this.controllerLog.logNode(nodeId, {
				message: `Cannot decode S2 multicast command, since MPAN is not known yet. Will attempt re-sync after the next singlecast.`,
				level: "verbose",
			});

			return true;
		}
		return false;
	}

	/** Checks if a transaction failed because a node didn't respond in time */
	private isMissingNodeACK(
		transaction: Transaction,
		e: ZWaveError,
	): transaction is Transaction & {
		message: SendDataRequest | SendDataBridgeRequest;
	} {
		return (
			// If the node does not acknowledge our request, it is either asleep or dead
			e.code === ZWaveErrorCodes.Controller_CallbackNOK
			&& (transaction.message instanceof SendDataRequest
				|| transaction.message instanceof SendDataBridgeRequest)
		);
	}

	/**
	 * @internal
	 * Handles the case that a node failed to respond in time.
	 * Returns `true` if the transaction failure was handled, `false` if it needs to be rejected.
	 */
	public handleMissingNodeACK(
		transaction: Transaction & {
			message: HasNodeId;
		},
		error: ZWaveError,
	): boolean {
		const node = this.tryGetNode(transaction.message);
		if (!node) return false; // This should never happen, but whatever

		const messagePart1 = isSendData(transaction.message)
			? `The node did not respond after ${transaction.message.maxSendAttempts} attempts`
			: `The node did not respond`;

		if (!transaction.changeNodeStatusOnTimeout) {
			// The sender of this transaction doesn't want it to change the status of the node
			return false;
		} else if (node.canSleep) {
			if (node.status === NodeStatus.Asleep) {
				// We already moved the messages to the wakeup queue before. If we end up here, this means a command
				// was sent that may be sent to potentially asleep nodes - including pings.
				return false;
			}
			this.controllerLog.logNode(
				node.id,
				`${messagePart1}. It is probably asleep, moving its messages to the wakeup queue.`,
				"warn",
			);

			// There is no longer a reference to the current transaction. If it should be moved to the wakeup queue,
			// it temporarily needs to be added to the queue again.
			const handled = this.mayMoveToWakeupQueue(transaction);
			if (handled) {
				this.queue.add(transaction);
			}

			// Mark the node as asleep. This will move the messages to the wakeup queue
			node.markAsAsleep();

			return handled;
		} else {
			const errorMsg = `${messagePart1}, it is presumed dead`;
			this.controllerLog.logNode(node.id, errorMsg, "warn");

			node.markAsDead();

			// There is no longer a reference to the current transaction on the queue, so we need to reject it separately.
			transaction.setProgress({
				state: TransactionState.Failed,
				reason: errorMsg,
			});

			transaction.abort(error);
			void this.rejectAllTransactionsForNode(node.id, errorMsg);

			return true;
		}
	}

	/**
	 * @internal
	 * Handles the case that the controller didn't acknowledge a command in time
	 * Returns `true` if the transaction failure was handled, `false` if it needs to be rejected.
	 */
	private handleMissingControllerACK(
		transaction: Transaction,
		error: ZWaveError & {
			code: ZWaveErrorCodes.Controller_Timeout;
			context: "ACK";
		},
	): boolean {
		if (!this._controller || !this.mayRecoverUnresponsiveController()) {
			return false;
		}

		const recoverByReopeningSerialport = async () => {
			if (!this.serial) return;
			this.driverLog.print(
				"Attempting to recover unresponsive controller by reopening the serial port...",
				"warn",
			);
			if (this.serial.isOpen) await this.serial.close();
			await wait(1000);
			try {
				await this.openSerialport();
			} catch (e) {
				// The serial port cannot be reopened, e.g. because a TCP-based
				// connection to the controller is gone. The driver cannot
				// recover from this, so notify applications that it failed,
				// allowing them to clean up and restart.
				void this.destroyWithMessage(getErrorMessage(e));
				return;
			}

			this.driverLog.print(
				"Serial port reopened. Returning to normal operation and hoping for the best...",
				"warn",
			);

			// We don't know if this worked
			// Go back to normal operation and hope for the best.
			this._controller?.setStatus(ControllerStatus.Ready);
			this._recoveryPhase = ControllerRecoveryPhase.None;
		};

		if (
			(this._controller.status !== ControllerStatus.Unresponsive
				&& !this.maySoftReset())
			|| this._recoveryPhase
				=== ControllerRecoveryPhase.ACKTimeoutAfterReset
		) {
			// Either we can/could not do a soft reset or the controller is still timing out afterwards
			void recoverByReopeningSerialport().catch(noop);

			return true;
		} else if (this._controller.status !== ControllerStatus.Unresponsive) {
			// The controller was responsive before this transaction failed.
			// Mark it as unresponsive and try to soft-reset it.
			this.controller.setStatus(ControllerStatus.Unresponsive);

			this._recoveryPhase = ControllerRecoveryPhase.ACKTimeout;

			this.driverLog.print(
				"Attempting to recover unresponsive controller by restarting it...",
				"warn",
			);

			// Execute the soft-reset asynchronously
			void this.softReset()
				.then(() => {
					// The controller responded. It is no longer unresponsive

					// Re-queue the transaction, so it can get handled next.
					// Its message generator may have finished, so reset that too.
					transaction.reset();
					this.getQueueForTransaction(transaction).add(
						transaction.clone(),
					);

					this._controller?.setStatus(ControllerStatus.Ready);
					this._recoveryPhase = ControllerRecoveryPhase.None;
				})
				.catch(() => {
					// Soft-reset failed. Reject the transaction
					this.rejectTransaction(transaction, error);

					// and reopen the serial port
					return recoverByReopeningSerialport();
				});

			return true;
		} else {
			// Not sure what to do here
			return false;
		}
	}

	/**
	 * @internal
	 * Handles the case that the controller didn't send the callback for a SendData in time
	 * Returns `true` if the transaction failure was handled, `false` if it needs to be rejected.
	 */
	private handleMissingSendDataResponseOrCallback(
		transaction: Transaction,
		error: ZWaveError & {
			code: ZWaveErrorCodes.Controller_Timeout;
			context: "callback" | "response";
		},
	): boolean {
		if (!this._controller || !this.mayRecoverUnresponsiveController()) {
			return false;
		}

		if (
			// The SendData response can time out on older controllers trying to reach a dead node.
			// In this case, we do not want to reset the controller, but just mark the node as dead.
			error.context === "response"
			// Also do this if the callback is timing out even after restarting the controller
			|| this._recoveryPhase
				=== ControllerRecoveryPhase.CallbackTimeoutAfterReset
		) {
			const node = this.tryGetNode(transaction.message);
			if (!node) return false; // This should never happen, but whatever

			// The controller is still timing out transmitting after a soft reset, don't try again.
			// Real-world experience has shown that for older controllers this situation can be caused by unresponsive nodes.

			// The following is essentially a copy of handleMissingNodeACK, but with updated error messages
			const messagePart1 =
				"The node is causing the controller to become unresponsive";

			let handled: boolean;

			if (node.canSleep) {
				if (node.status === NodeStatus.Asleep) {
					// We already moved the messages to the wakeup queue before. If we end up here, this means a command
					// was sent that may be sent to potentially asleep nodes - including pings.
					return false;
				}
				this.controllerLog.logNode(
					node.id,
					`${messagePart1}. It is probably asleep, moving its messages to the wakeup queue.`,
					"warn",
				);

				// There is no longer a reference to the current transaction. If it should be moved to the wakeup queue,
				// it temporarily needs to be added to the queue again.
				handled = this.mayMoveToWakeupQueue(transaction);
				if (handled) {
					this.queue.add(transaction);
				}

				// Mark the node as asleep. This will move the messages to the wakeup queue
				node.markAsAsleep();
			} else {
				const errorMsg = `${messagePart1}, it is presumed dead`;
				this.controllerLog.logNode(node.id, errorMsg, "warn");

				node.markAsDead();

				// There is no longer a reference to the current transaction on the queue, so we need to reject it separately.
				transaction.setProgress({
					state: TransactionState.Failed,
					reason: errorMsg,
				});

				transaction.abort(error);
				void this.rejectAllTransactionsForNode(node.id, errorMsg);

				handled = true;
			}

			// If the controller is still timing out, reset it once more
			if (
				this._recoveryPhase
				=== ControllerRecoveryPhase.CallbackTimeoutAfterReset
			) {
				this.driverLog.print(
					"Attempting to recover controller again...",
					"warn",
				);
				void this.softResetInternal(true)
					.catch(() => {
						this.driverLog.print(
							"Automatic controller recovery failed. Returning to normal operation and hoping for the best.",
							"warn",
						);
					})
					.finally(() => {
						this._recoveryPhase = ControllerRecoveryPhase.None;
						this._controller?.setStatus(ControllerStatus.Ready);
					});
			}

			return handled;
		} else if (this._controller.status !== ControllerStatus.Unresponsive) {
			// The controller was responsive before this transaction failed.

			if (this.maySoftReset()) {
				// Mark it as unresponsive and try to soft-reset it.
				this.controller.setStatus(ControllerStatus.Unresponsive);

				this._recoveryPhase = ControllerRecoveryPhase.CallbackTimeout;

				this.driverLog.print(
					"Controller missed Send Data callback. Attempting to recover...",
					"warn",
				);

				// Execute the soft-reset asynchronously
				void this.softResetInternal(true)
					.then(() => {
						// The controller responded. It is no longer unresponsive.

						// Re-queue the transaction, so it can get handled next.
						// Its message generator may have finished, so reset that too.
						transaction.reset();
						this.getQueueForTransaction(transaction).add(
							transaction.clone(),
						);

						this._controller?.setStatus(ControllerStatus.Ready);
						this._recoveryPhase =
							ControllerRecoveryPhase.CallbackTimeoutAfterReset;
					})
					.catch(() => {
						// Soft-reset failed. Just reject the transaction
						this.rejectTransaction(transaction, error);

						this.driverLog.print(
							"Automatic controller recovery failed. Returning to normal operation and hoping for the best.",
							"warn",
						);
						this._recoveryPhase = ControllerRecoveryPhase.None;
						this._controller?.setStatus(ControllerStatus.Ready);
					});
			} else {
				this.driverLog.print(
					"Controller missed Send Data callback. Cannot recover automatically because the soft reset feature is unsupported or disabled. Returning to normal operation and hoping for the best...",
					"warn",
				);
				this.rejectTransaction(transaction, error);
			}

			return true;
		} else {
			// Not sure what to do here
			return false;
		}
	}

	/**
	 * @internal
	 * Handles the case that the controller locks up and fails to transmit continuously
	 */
	private handleJammedController(
		transaction: Transaction,
		error: ZWaveError,
	): boolean {
		if (!this._controller || !this.mayRecoverUnresponsiveController()) {
			return false;
		}

		if (
			// Transmits still fail even after restarting the controller
			this._recoveryPhase === ControllerRecoveryPhase.JammedAfterReset
		) {
			// Maybe this isn't actually the controller being jammed. Give up on this command.
			this.driverLog.print(
				"Automatic controller recovery failed. Returning to normal operation and hoping for the best.",
				"warn",
			);
			this._recoveryPhase = ControllerRecoveryPhase.None;
			this._controller.setStatus(ControllerStatus.Ready);

			return false;
		} else if (this._controller.status === ControllerStatus.Jammed) {
			// The controller failed to transmit continuously. Try to soft-reset it if we can.
			if (this.controller.sdkVersionLt("7.0")) {
				// The workaround only makes sense on 700/800 series
				this.driverLog.print(
					"Cannot recover jammed controller automatically. Returning to normal operation and hoping for the best...",
					"warn",
				);
				this._controller?.setStatus(ControllerStatus.Ready);
				this.rejectTransaction(transaction, error);
			} else if (this.maySoftReset()) {
				this._recoveryPhase = ControllerRecoveryPhase.Jammed;

				this.driverLog.print(
					"Attempting to recover jammed controller...",
					"warn",
				);

				// Execute the soft-reset asynchronously
				void this.softReset()
					.then(() => {
						// The controller responded. It is no longer unresponsive.

						// Re-queue the transaction, so it can get handled next.
						// Its message generator may have finished, so reset that too.
						transaction.reset();
						this.getQueueForTransaction(transaction).add(
							transaction.clone(),
						);

						this._recoveryPhase =
							ControllerRecoveryPhase.JammedAfterReset;
					})
					.catch(() => {
						// Soft-reset failed. Just reject the transaction
						this.rejectTransaction(transaction, error);

						this.driverLog.print(
							"Automatic controller recovery failed. Returning to normal operation and hoping for the best.",
							"warn",
						);
						this._recoveryPhase = ControllerRecoveryPhase.None;
						this._controller?.setStatus(ControllerStatus.Ready);
					});
			} else {
				this.driverLog.print(
					"Cannot recover jammed controller automatically because the soft reset feature is unsupported or disabled. Returning to normal operation and hoping for the best...",
					"warn",
				);
				this._controller?.setStatus(ControllerStatus.Ready);
				this.rejectTransaction(transaction, error);
			}

			return true;
		} else {
			// Not sure what to do here
			return false;
		}
	}

	private shouldRequestWakeupOnDemand(node: ZWaveNode): boolean {
		return (
			!!node.supportsWakeUpOnDemand
			&& node.status === NodeStatus.Asleep
			&& this.hasPendingTransactions(
				(t) =>
					t.requestWakeUpOnDemand
					&& t.message.getNodeId() === node.id,
			)
		);
	}

	/**
	 * Answers a supervised command that cannot be handled with the given status.
	 */
	private async answerUnsuccessfulSupervisedCommand(
		msg: Message & ContainsCC,
		status: SupervisionStatus.NoSupport | SupervisionStatus.Fail,
	): Promise<void> {
		const command = getInnermostCommandClass(msg.command);
		const supervisionSessionId = SupervisionCC.getSessionId(command);
		if (supervisionSessionId == undefined) return;

		const node = this.tryGetNode(msg);
		if (!node) return;

		const endpoint = node.getEndpoint(command.endpointIndex) ?? node;
		const encapsulationFlags = command.encapsulationFlags;
		await endpoint.createAPI(CommandClasses.Supervision, false).sendReport({
			sessionId: supervisionSessionId,
			moreUpdatesFollow: false,
			status,
			requestWakeUpOnDemand: this.shouldRequestWakeupOnDemand(node),
			encapsulationFlags,
			lowPriority: this.shouldUseLowPriorityForSupervisionReport(
				node,
				encapsulationFlags,
			),
		});
	}

	private partialCCSessions = new PartialCCSessionManager({
		getSegmentTimeout: () => this._options.timeouts.report,
		getMaxReRequestAttempts: () => this._options.attempts.partialReports,
		findRequestCC: (command) => this.findPartialCCSessionRequest(command),
		rerequestSession: (session) => this.rerequestPartialCCSession(session),
		onSessionLost: (session) => {
			this.controllerLog.logNode(session.nodeId, {
				message: `Dropping incomplete partial CC session`,
				level: "warn",
				direction: "inbound",
			});
		},
	});

	/**
	 * Determines the request a new partial CC session is the response to, if any.
	 * This is used to re-request the response when segments are missing.
	 */
	private findPartialCCSessionRequest(
		command: CommandClass,
	): CommandClass | undefined {
		const currentMessage =
			this.queue.currentTransaction?.getCurrentMessage();
		if (
			!currentMessage
			|| !containsCC(currentMessage)
			|| currentMessage.getNodeId() !== command.nodeId
			|| !currentMessage.expectsNodeUpdate(this)
		) {
			return;
		}

		// The predicate does not check for complete commands or encapsulation,
		// which is good enough to correlate a partial report with its request
		const request = getInnermostCommandClass(currentMessage.command);
		if (
			!request.isExpectedCCResponse(
				this,
				getInnermostCommandClass(command),
			)
		) {
			return;
		}
		return request;
	}

	/** Re-requests the response a partial CC session belongs to because segments are missing */
	private rerequestPartialCCSession(session: PartialCCSession): void {
		// Give the node more time to respond by refreshing the report timeout
		// of the transaction the partial reports belong to
		this.refreshAwaitedMessageTimers(session.lastSegmentMsg);

		this.controllerLog.logNode(session.nodeId, {
			message: `Some expected reports were not received, requesting the response again...`,
			level: "warn",
			direction: "outbound",
		});

		// The original transaction is still waiting for the response, so the
		// re-requested one must not be awaited again
		void this.sendCommand(session.requestCC!, {
			priority: MessagePriority.Immediate,
			maxSendAttempts: 1,
			ignoreNodeUpdate: true,
		}).catch(noop);
	}

	/**
	 * Assembles partial CCs in a message body. Returns the message containing the complete
	 * command to continue handling. This is not necessarily the passed message, since responses
	 * may be split into multiple messages.
	 * If the message contains a partial CC and more segments are expected, this returns `undefined`.
	 */
	private async assemblePartialCCs(
		msg: CommandRequest & ContainsCC,
	): Promise<(CommandRequest & ContainsCC) | undefined> {
		let command: CommandClass | undefined = msg.command;
		// We search for the every CC that provides us with a session ID
		// There might be newly-completed CCs that contain a partial CC,
		// so investigate the entire CC encapsulation stack.
		while (true) {
			const update = this.partialCCSessions.handleCommand(command, msg);
			if (update?.type === "segment") {
				if (update.duplicate) {
					this.controllerLog.logNode(command.nodeId as number, {
						message: `Ignoring duplicate partial CC segment:`,
						level: "debug",
						direction: "inbound",
					});
				}
				// This is not the final segment, don't handle the command now
				this.driverLog.logMessage(msg, {
					secondaryTags: ["partial"],
					direction: "inbound",
				});
				return undefined;
			} else if (update?.type === "complete") {
				if (update.partials.length > 0) {
					// Log the current segment like it was received. The merged
					// command is logged when handling the final message continues.
					this.driverLog.logMessage(msg, {
						secondaryTags: ["partial"],
						direction: "inbound",
					});
				}

				// All segments were received, merge them into the final one
				try {
					await update.command.mergePartialCCs(update.partials, {
						...this.getCCParsingContext(),
						sourceNodeId: update.command.nodeId as number,
						frameType: update.finalMsg.frameType,
					});
					// Ensure there are no errors
					assertValidCCs(update.finalMsg);

					if (update.partials.length > 0) {
						this.controllerLog.logNode(
							update.command.nodeId as number,
							{
								message: `Assembled partial CC from ${
									update.partials.length + 1
								} segments`,
								level: "debug",
								direction: "inbound",
							},
						);
					}
				} catch (e) {
					if (isZWaveError(e)) {
						switch (e.code) {
							case ZWaveErrorCodes.Deserialization_NotImplemented:
							case ZWaveErrorCodes.CC_NotImplemented:
								this.driverLog.print(
									`Dropping message because it could not be deserialized: ${e.message}`,
									"warn",
								);
								// Don't continue handling this message
								return undefined;

							case ZWaveErrorCodes.PacketFormat_InvalidPayload:
								this.driverLog.print(
									`Could not assemble partial CCs because the payload is invalid. Dropping them.`,
									"warn",
								);
								// Don't continue handling this message
								return undefined;

							case ZWaveErrorCodes.Driver_NotReady:
								this.driverLog.print(
									`Could not assemble partial CCs because the driver is not ready yet. Dropping them`,
									"warn",
								);
								// Don't continue handling this message
								return undefined;
						}
					}
					throw e;
				}
				// Continue handling the message which contained the final segment.
				// Assembling this CC was successful - but it might contain another partial CC
				msg = update.finalMsg;
				command = update.command;
			}

			// If this is an encapsulating CC, we need to look one level deeper
			if (isEncapsulatingCommandClass(command)) {
				command = command.encapsulated;
			} else {
				break;
			}
		}
		return msg;
	}

	/** Refreshes the timeouts of awaited messages which a partial message may belong to */
	private refreshAwaitedMessageTimers(msg: Message): void {
		// Since this is a partial message there may be no clear 1:1 match.
		// Therefore we loop through all awaited messages
		for (const entry of this.awaitedMessages) {
			if (entry.refreshPredicate?.(msg)) {
				entry.timeout?.refresh();
			}
		}
	}

	/**
	 * Is called when a Transport Service command is received.
	 * When the command completes a datagram, the reassembled command is returned.
	 */
	private async handleTransportServiceCommand(
		command:
			| TransportServiceCCFirstSegment
			| TransportServiceCCSubsequentSegment,
	): Promise<CommandClass | undefined> {
		const nodeSessions = this.ensureNodeSessions(command.nodeId);

		// TODO: Figure out how to know which timeout is the correct one. For now use the larger one
		const missingSegmentTimeout =
			TransportServiceTimeouts.requestMissingSegmentR2;

		const sendSegmentComplete = () => {
			const cc = new TransportServiceCCSegmentComplete({
				nodeId: command.nodeId,
				sessionId: command.sessionId,
			});
			void this.sendCommand(cc, {
				maxSendAttempts: 1,
				priority: MessagePriority.Immediate,
			}).catch(noop);
		};

		// The state handling is synchronous, all outgoing commands are sent in the
		// background so the receive path is not blocked
		const advanceTransportServiceSession = (
			session: TransportServiceSession,
			input: TransportServiceRXMachineInput,
		): "completed" | undefined => {
			const machine = session.machine;

			// Figure out what needs to be done for this input
			const transition = machine.next(input);
			if (transition) {
				machine.transition(transition.newState);

				if (machine.state.value === "receive") {
					// We received a segment in the normal flow. Restart the timer
					startMissingSegmentTimeout(session);
				} else if (machine.state.value === "requestMissing") {
					// A segment is missing. Request it and restart the timeout
					this.controllerLog.logNode(command.nodeId, {
						message: `Transport Service RX session #${command.sessionId}: Segment with offset ${machine.state.offset} missing - requesting it...`,
						level: "debug",
						direction: "outbound",
					});
					const cc = new TransportServiceCCSegmentRequest({
						nodeId: command.nodeId,
						sessionId: command.sessionId,
						datagramOffset: machine.state.offset,
					});
					this.sendCommand(cc, {
						maxSendAttempts: 1,
						priority: MessagePriority.Immediate,
					})
						.catch(noop)
						// Only time out waiting for the missing segment after requesting it
						.finally(() => startMissingSegmentTimeout(session));
				} else if (machine.state.value === "failure") {
					this.controllerLog.logNode(command.nodeId, {
						message: `Transport Service RX session #${command.sessionId} failed`,
						level: "error",
						direction: "none",
					});
					// TODO: Update statistics
					nodeSessions.transportService.delete(command.sessionId);
					if (session.timeout) {
						clearTimeout(session.timeout);
					}
				} else if (machine.state.value === "success") {
					this.controllerLog.logNode(command.nodeId, {
						message: `Transport Service RX session #${command.sessionId} complete`,
						level: "debug",
						direction: "inbound",
					});
					if (session.timeout) {
						clearTimeout(session.timeout);
					}

					sendSegmentComplete();
					return "completed";
				}
			} else if (machine.state.value === "success") {
				// The session was already complete, but the node re-sent the last segment
				// because the SegmentComplete message got lost. Acknowledge it again, but
				// do not hand the datagram to the application a second time.
				sendSegmentComplete();
			}
		};

		function startMissingSegmentTimeout(
			session: TransportServiceSession,
		): void {
			if (session.timeout) {
				clearTimeout(session.timeout);
			}

			session.timeout = setTimeout(() => {
				session.timeout = undefined;
				advanceTransportServiceSession(session, {
					value: "timeout",
				});
			}, missingSegmentTimeout);
		}

		let session: TransportServiceSession | undefined;
		let datagramOffset: number;

		if (command instanceof TransportServiceCCFirstSegment) {
			// This is the first message in a sequence. Create or re-initialize the session
			// We don't delete finished sessions when the last message is received in order to be able to
			// handle when the SegmentComplete message gets lost. As soon as the node initializes a new session,
			// we do know that the previous one is finished.
			nodeSessions.transportService.clear();

			this.controllerLog.logNode(command.nodeId, {
				message: `Beginning Transport Service RX session #${command.sessionId}...`,
				level: "debug",
				direction: "inbound",
			});

			const machine = createTransportServiceRXMachine(
				command.datagramSize,
				command.partialDatagram.length,
			);

			session = {
				machine,
				datagram: new Bytes(command.datagramSize),
			};
			nodeSessions.transportService.set(command.sessionId, session);
			datagramOffset = 0;
		} else {
			// This is a subsequent message in a sequence. Continue executing the state machine
			session = nodeSessions.transportService.get(command.sessionId);
			if (!session) {
				// This belongs to a session we don't know... tell the sending node to try again
				const cc = new TransportServiceCCSegmentWait({
					nodeId: command.nodeId,
					pendingSegments: 0,
				});
				await this.sendCommand(cc, {
					maxSendAttempts: 1,
					priority: MessagePriority.Immediate,
				}).catch(noop);
				return;
			}
			datagramOffset = command.datagramOffset;
		}

		// Ensure that we don't try to write out-of-bounds
		if (
			datagramOffset + command.partialDatagram.length
			> session.datagram.length
		) {
			this.controllerLog.logNode(command.nodeId, {
				message: `Transport Service RX session #${command.sessionId}: Ignoring segment because it is incompatible with the datagram length`,
				level: "warn",
				direction: "inbound",
			});
			return;
		}
		session.datagram.set(command.partialDatagram, datagramOffset);

		const result = advanceTransportServiceSession(session, {
			value: "segment",
			offset: datagramOffset,
			length: command.partialDatagram.length,
		});
		if (result !== "completed") return;

		// The datagram is complete, reassemble the command it contains
		try {
			return await CommandClass.parse(session.datagram, {
				...this.getCCParsingContext(),
				sourceNodeId: command.nodeId,
				// Transport Service is only used for singlecast commands
				frameType: command.frameType ?? "singlecast",
			});
		} catch (e) {
			this.driverLog.print(
				`Dropping Transport Service datagram because the contained command could not be deserialized: ${getErrorMessage(
					e,
				)}`,
				"warn",
			);
			return;
		}
	}

	/**
	 * Is called when a message is received that does not belong to any ongoing transactions
	 * @param msg The decoded message
	 */
	private async handleUnsolicitedMessage(msg: Message): Promise<void> {
		// FIXME: Rename this - msg might not be unsolicited
		// This is a message we might have registered handlers for
		try {
			if (msg.type === MessageType.Request) {
				await this.handleRequest(msg);
			} else {
				await this.handleResponse(msg);
			}
		} catch (e) {
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Driver_NotReady) {
				this.driverLog.print(
					`Cannot handle message because the driver is not ready to handle it yet.`,
					"warn",
				);
			} else {
				throw e;
			}
		}
	}

	/**
	 * Is called when the Serial API restart unexpectedly.
	 */
	private async handleSerialAPIStartedUnexpectedly(
		msg: SerialAPIStartedRequest,
	): Promise<boolean> {
		// Normally, the soft reset command includes waiting for this message.
		// If we end up here, it is unexpected.

		switch (msg.wakeUpReason) {
			// All wakeup reasons that indicate a reset of the Serial API
			// need to be handled here, so we interpret node IDs correctly.
			case SerialAPIWakeUpReason.Reset:
			case SerialAPIWakeUpReason.WatchdogReset:
			case SerialAPIWakeUpReason.SoftwareReset:
			case SerialAPIWakeUpReason.PowerUp:
			case SerialAPIWakeUpReason.EmergencyWatchdogReset:
			case SerialAPIWakeUpReason.BrownoutCircuit: {
				// The Serial API restarted unexpectedly
				this.controllerLog.print(
					`Serial API restarted unexpectedly.`,
					"warn",
				);

				// In this situation, we may be executing a Serial API command, which will never complete.
				// Abort it, so it can be retried
				if (this.abortSerialAPICommand) {
					this.controllerLog.print(
						`Currently active command will be retried...`,
						"warn",
					);
					this.abortSerialAPICommand.reject(
						new ZWaveError(
							"The Serial API restarted unexpectedly",
							ZWaveErrorCodes.Controller_Reset,
						),
					);
				}

				// Restart the watchdog unless disabled
				if (this.options.features.watchdog) {
					await this._controller?.startWatchdog();
				}

				if (this._controller?.nodeIdType === NodeIDType.Long) {
					// We previously used 16 bit node IDs, but the controller was reset.
					// Remember this and try to go back to 16 bit.
					this._controller.nodeIdType = NodeIDType.Short;
					await this._controller.trySetNodeIDType(NodeIDType.Long);
				}

				return true; // Don't invoke any more handlers
			}
		}

		return false; // Not handled
	}

	/**
	 * Registers a handler for messages that are not handled by the driver as part of a message exchange.
	 * The handler function needs to return a boolean indicating if the message has been handled.
	 * Registered handlers are called in sequence until a handler returns `true`.
	 *
	 * @param fnType The function type to register the handler for
	 * @param handler The request handler callback
	 * @param oneTime Whether the handler should be removed after its first successful invocation
	 */
	public registerRequestHandler<T extends Message>(
		fnType: FunctionType,
		handler: RequestHandler<T>,
		oneTime: boolean = false,
	): void {
		const handlers: RequestHandlerEntry<T>[] = this.requestHandlers.has(
			fnType,
		)
			? this.requestHandlers.get(fnType)!
			: [];
		const entry: RequestHandlerEntry<T> = { invoke: handler, oneTime };
		handlers.push(entry);
		this.driverLog.print(
			`added${oneTime ? " one-time" : ""} request handler for ${
				FunctionType[fnType]
			} (${num2hex(fnType)})...
${handlers.length} registered`,
		);
		this.requestHandlers.set(fnType, handlers as RequestHandlerEntry[]);
	}

	/**
	 * Unregisters a message handler that has been added with `registerRequestHandler`
	 * @param fnType The function type to unregister the handler for
	 * @param handler The previously registered request handler callback
	 */
	public unregisterRequestHandler(
		fnType: FunctionType,
		handler: RequestHandler,
	): void {
		const handlers = this.requestHandlers.has(fnType)
			? this.requestHandlers.get(fnType)!
			: [];
		for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
			// remove the handler if it was found
			if (entry.invoke === handler) {
				handlers.splice(i, 1);
				break;
			}
		}
		this.driverLog.print(
			`removed request handler for ${FunctionType[fnType]} (${fnType})...
${handlers.length} left`,
		);
		this.requestHandlers.set(fnType, handlers);
	}

	/**
	 * Checks whether a CC has a lower than expected security level and needs to be discarded
	 */
	private isSecurityLevelTooLow(cc: CommandClass): boolean {
		// With Security S0, some commands may be accepted without encryption, some require it
		// With Security S2, a node MUST support its command classes only when communication is using its
		// highest Security Class granted during security bootstrapping.

		// We already discard lower S2 keys when decrypting, so all that's left here to check is if the
		// CC is encrypted at all.

		const node = this._controller?.nodes.get(cc.nodeId as number);
		if (!node) {
			// Node does not exist, don't accept the CC
			this.controllerLog.logNode(
				cc.nodeId as number,
				`is unknown - discarding received command...`,
				"warn",
			);
			return true;
		}

		// CRC16 belongs outside of Security encapsulation
		if (cc instanceof CRC16CCCommandEncapsulation) {
			return this.isSecurityLevelTooLow(cc.encapsulated);
		}

		const secClass = node.getHighestSecurityClass();
		if (
			secClass === SecurityClass.None
			|| secClass === SecurityClass.Temporary
		) {
			return false;
		}

		const expectedSecurityCC = securityClassIsS2(secClass)
			? CommandClasses["Security 2"]
			: secClass === SecurityClass.S0_Legacy
				? CommandClasses.Security
				: undefined;

		const isCCConsideredSecure = (
			cmd: CommandClass,
		): MaybeNotKnown<boolean> => {
			// Some CCs are always accepted, regardless of security class
			if (cmd instanceof SecurityCC) {
				switch (cmd.ccCommand) {
					// Cannot be sent encapsulated:
					case SecurityCommand.NonceGet:
					case SecurityCommand.NonceReport:
					case SecurityCommand.SchemeGet:
					case SecurityCommand.SchemeReport:
						return true;
				}

				if (cmd instanceof SecurityCCCommandEncapsulation) {
					// CommandsSupportedReport is always accepted to be able to learn security classes and interview nodes
					// CommandsSupportedGet is always accepted, so others can learn our security classes
					if (
						cmd.encapsulated
							instanceof SecurityCCCommandsSupportedReport
						|| cmd.encapsulated
							instanceof SecurityCCCommandsSupportedGet
					) {
						return true;
					}

					// The same is true before the command has been assembled, when the encapsulated command
					// is still only in binary form
					if (
						cmd.decryptedCCBytes
						&& cmd.decryptedCCBytes[0] === CommandClasses.Security
						&& [
							SecurityCommand.CommandsSupportedGet,
							SecurityCommand.CommandsSupportedReport,
						].includes(cmd.decryptedCCBytes[1])
					) {
						return true;
					}

					// Other S0 commands are only accepted if S0 is the highest security class
					return secClass === SecurityClass.S0_Legacy;
				}
			} else if (cmd instanceof Security2CC) {
				if (cmd instanceof Security2CCMessageEncapsulation) {
					// CommandsSupportedReport is always accepted to be able to learn security classes and interview nodes
					if (
						cmd.encapsulated
						instanceof Security2CCCommandsSupportedReport
					) {
						return true;
					}

					// CommandsSupportedGet is always accepted, so others can learn our security classes
					if (
						cmd.encapsulated
						instanceof Security2CCCommandsSupportedGet
					) {
						return true;
					}

					// Multicast commands are always accepted
					if (cmd.getMulticastGroupId() != undefined) return true;

					// This shouldn't happen, but better be sure
					if (cmd.securityClass == undefined) return false;

					// All other commands are only accepted if the highest security class is used
					return cmd.securityClass === secClass;
				}
			}

			return cmd.ccId === expectedSecurityCC;
		};

		let requiresSecurity = securityClassIsS2(secClass);
		const isSecure = isCCConsideredSecure(cc);

		while (true) {
			if (isEncapsulatingCommandClass(cc)) {
				cc = cc.encapsulated;
			} else if (isMultiEncapsulatingCommandClass(cc)) {
				requiresSecurity ||= cc.encapsulated.some((cmd) =>
					node.isCCSecure(cmd.ccId),
				);
				break;
			} else {
				requiresSecurity ||=
					node.isCCSecure(cc.ccId)
					&& cc.ccId !== CommandClasses.Security
					&& cc.ccId !== CommandClasses["Security 2"];

				break;
			}
		}
		if (requiresSecurity && !isSecure) {
			// none found, don't accept the CC
			this.controllerLog.logNode(
				cc.nodeId as number,
				`command was received at a lower security level than expected - discarding it:`,
				"warn",
			);
			return true;
		}

		return false;
	}

	/** Checks whether a CC should be discarded */
	private shouldDiscardCC(cc: CommandClass): boolean {
		if (isEncapsulatingCommandClass(cc)) {
			return this.shouldDiscardCC(cc.encapsulated);
		}

		const node = this._controller?.nodes.get(cc.nodeId as number);
		// We should have checked this before, but better be safe than sorry
		if (!node) {
			// Node does not exist, don't accept the CC
			this.controllerLog.logNode(
				cc.nodeId as number,
				`is unknown - discarding received command...`,
				"warn",
			);
			return true;
		}

		if (
			cc.constructor.name.endsWith("Get")
			&& (cc.frameType === "multicast" || cc.frameType === "broadcast")
		) {
			this.controllerLog.logNode(
				cc.nodeId as number,
				`received GET-type command via ${cc.frameType} - discarding...`,
				"warn",
			);
			return true;
		}

		// Do not accept Meter CC and/or Multilevel Sensor CC if the node does not support them
		// https://github.com/zwave-js/zwave-js/issues/5510
		// TODO: Consider expanding this to all CCs and not only reports
		if (
			cc.ccId === CommandClasses.Meter
			|| cc.ccId === CommandClasses["Multilevel Sensor"]
		) {
			const endpoint = node.getEndpoint(cc.endpointIndex) ?? node;
			if (
				!endpoint.supportsCC(cc.ccId)
				&& !endpoint.controlsCC(cc.ccId)
			) {
				this.controllerLog.logNode(
					cc.nodeId as number,
					`${
						cc.endpointIndex > 0
							? `Endpoint ${cc.endpointIndex} `
							: ""
					}does not support CC ${getCCName(
						cc.ccId,
					)} - discarding received command...`,
					"warn",
				);
				return true;
			}
		}

		return false;
	}

	/**
	 * Is called when a Response-type message was received
	 */
	private handleResponse(msg: Message): Promise<void> {
		// Check if we have a dynamic handler waiting for this message
		for (const entry of this.awaitedMessages) {
			if (entry.predicate(msg)) {
				// We do
				entry.handler(msg);
				return Promise.resolve();
			}
		}

		this.driverLog.transactionResponse(msg, undefined, "unexpected");
		this.driverLog.print("unexpected response, discarding...", "warn");

		return Promise.resolve();
	}

	/**
	 * Is called when a Request-type message was received
	 */
	private async handleRequest(msg: Message): Promise<void> {
		let handlers: RequestHandlerEntry[] | undefined;

		if (hasNodeId(msg) || containsCC(msg)) {
			const node = this.tryGetNode(msg);
			if (node) {
				// We have received an unsolicited message from a dead node, bring it back to life
				if (node.status === NodeStatus.Dead) {
					node.markAsAlive();
				}
			}
		}

		// Check if we have a dynamic handler waiting for this message
		for (const entry of this.awaitedMessages) {
			if (entry.predicate(msg)) {
				// We do
				entry.handler(msg);
				return;
			}
		}

		if (isCommandRequest(msg) && containsCC(msg)) {
			const nodeId = msg.getNodeId()!;

			// It could also be that this is the node's response for a CC that we sent, but where the ACK is delayed
			const currentTransaction = this.queue.currentTransaction;
			const currentMessage = currentTransaction?.getCurrentMessage();
			const isS2NonceReportSOS =
				msg.command instanceof Security2CCNonceReport
				&& msg.command.SOS
				&& !!msg.command.receiverEI;
			const isS0NonceReport =
				msg.command instanceof SecurityCCNonceReport;
			const isNonceReport = isS0NonceReport || isS2NonceReportSOS;
			if (
				currentMessage
				&& currentMessage.expectsNodeUpdate(this)
				&& currentMessage.isExpectedNodeUpdate(this, msg)
			) {
				// The message we're currently sending is still in progress but expects this message in response,
				// which has just been received. The message generator is not waiting for it yet, so it ended up here.

				// Due to how the message generators are architected, it is currently not possible to short-circuit
				// waiting for the transmit report, so we remember the premature response for later processing.
				currentMessage.prematureNodeUpdate = msg;

				if (isSendData(currentMessage)) {
					// Also abort the ongoing transaction to avoid unnecessarily waiting for the ACK (or timeout)
					this.controllerLog.logNode(msg.getNodeId()!, {
						message: `received expected response prematurely, aborting ongoing transmission...`,
						level: "verbose",
						direction: "inbound",
					});

					void this.abortSendData();
				}

				// A S0/S2 nonce report is treated like an expected node update,
				// but it is not considered a valid result of the ongoing transaction.
				// Calling abortSendData will allow the message generator to continue normally,
				// eventually resulting in a NoAck transmit report, at which point
				// simpleMessageGenerator returns the premature nonce report as if it was received
				// normally.

				// If this is a valid result of the current transaction, abort the
				// transaction with the received message as the result.
				// This will short-circuit all the way to the catch block in
				// Driver.executeTransaction, where prematureNodeUpdate is returned
				// as the result.
				if (!isNonceReport) {
					currentTransaction!.abort(msg);
				}

				return;
			}

			// Notify non-consuming observers before unwrapping, so their predicate can
			// inspect the command as received (e.g. encapsulation details like the S2
			// sequence number). These do not consume the command, so it is still
			// handled normally afterwards.
			for (const entry of this.awaitedCommands) {
				if (entry.consume === false && entry.predicate(msg.command)) {
					entry.handler(msg.command);
				}
			}

			// For further actions, we are only interested in the innermost CC
			this.unwrapCommands(msg);

			// cannot handle ApplicationCommandRequests without a controller
			if (this._controller == undefined) {
				this.driverLog.print(
					`  the controller is not ready yet, discarding...`,
					"warn",
				);
				return;
			} else if (!this.controller.nodes.has(nodeId)) {
				this.driverLog.print(
					`  the node is unknown or not initialized yet, discarding...`,
					"warn",
				);
				return;
			}

			const node = this.controller.nodes.get(nodeId)!;
			const nodeSessions = this.nodeSessions.get(nodeId);
			// Check if we need to handle the command ourselves

			// Some Security-related commands make sense to be handled in the driver
			if (msg.command instanceof SecurityCCNonceGet) {
				return this.handleSecurityNonceGet(node);
			}
			if (msg.command instanceof SecurityCCNonceReport) {
				return this.handleSecurityNonceReport(node, msg.command);
			}
			if (msg.command instanceof SecurityCCCommandsSupportedGet) {
				return this.handleSecurityCommandsSupportedGet(
					node,
					msg.command,
				);
			}

			if (msg.command instanceof Security2CCNonceGet) {
				return this.handleSecurity2NonceGet(node);
			}
			// Nonce Report is handled further down, as we might have dynamic handlers for it
			if (msg.command instanceof Security2CCCommandsSupportedGet) {
				return this.handleSecurity2CommandsSupportedGet(
					node,
					msg.command,
				);
			}

			if (
				msg.command.ccId === CommandClasses.Supervision
				&& msg.command instanceof SupervisionCCReport
				&& nodeSessions?.supervision.has(msg.command.sessionId)
			) {
				// Supervision commands are handled here
				this.controllerLog.logNode(msg.command.nodeId, {
					message: `Received update for a Supervision session`,
					direction: "inbound",
				});

				// Call the update handler
				nodeSessions.supervision.get(msg.command.sessionId)!({
					status: msg.command.status,
					remainingDuration: msg.command.duration,
				} as SupervisionResult);
				// If this was a final report, remove the handler
				if (!msg.command.moreUpdatesFollow) {
					nodeSessions.supervision.delete(msg.command.sessionId);
				}

				return;
			}

			// Figure out if the command was received with supervision encapsulation and we need to respond accordingly
			const supervisionSessionId = SupervisionCC.getSessionId(
				msg.command,
			);
			// Figure out if this is an S2 multicast followup for a group that is out of sync
			const s2MulticastOutOfSync = this.mustReplyWithSecurityS2MOS(msg);

			const encapsulationFlags = msg.command.encapsulationFlags;

			let reply: (
				status:
					| SupervisionStatus.Success
					| SupervisionStatus.Fail
					| SupervisionStatus.NoSupport,
			) => Promise<void>;
			if (supervisionSessionId != undefined) {
				// The command was supervised, and we must respond with a Supervision Report
				const endpoint =
					node.getEndpoint(msg.command.endpointIndex) ?? node;
				reply = (status) =>
					endpoint
						.createAPI(CommandClasses.Supervision, false)
						.withOptions({ s2MulticastOutOfSync })
						.sendReport({
							sessionId: supervisionSessionId,
							moreUpdatesFollow: false,
							status,
							requestWakeUpOnDemand:
								this.shouldRequestWakeupOnDemand(node),
							encapsulationFlags,
							lowPriority:
								this.shouldUseLowPriorityForSupervisionReport(
									node,
									encapsulationFlags,
								),
						});
			} else {
				// Unsupervised, reply is a no-op
				reply = () => Promise.resolve();
			}

			const trySupervised = async (
				action: () => void | Promise<void>,
			): Promise<void> => {
				try {
					await action();
					await reply(SupervisionStatus.Success);
				} catch (e) {
					let handled = false;
					if (isZWaveError(e)) {
						if (e.code === ZWaveErrorCodes.CC_OperationFailed) {
							// The sending node tried to do something that didn't work
							await reply(SupervisionStatus.Fail);
							handled = true;
						} else if (e.code === ZWaveErrorCodes.CC_NotSupported) {
							// The sending node sent a command we could not handle
							await reply(SupervisionStatus.NoSupport);
							handled = true;
						}
					}

					if (!handled) {
						// Something unexpected happened.
						// Report failure, then re-throw the error, so it can be handled accordingly
						await reply(SupervisionStatus.Fail);

						throw e;
					}
				}
			};

			// DO NOT force-add support for the Supervision CC here. Some devices only support Supervision when sending,
			// so we need to trust the information we already have.

			// In the case where the command was unsupervised and we need to send a MOS, do it as soon as possible
			if (supervisionSessionId == undefined && s2MulticastOutOfSync) {
				// If the command was NOT received using Supervision,
				// we need to respond with an MOS nonce. Otherwise we'll set the flag
				// on the Supervision Report
				node.commandClasses["Security 2"].sendMOS().catch(() => {
					// Ignore errors
				});
			}

			// check if someone is waiting for this command
			for (const entry of this.awaitedCommands) {
				if (entry.predicate(msg.command)) {
					// there is!
					entry.handler(msg.command);

					// Non-consuming observers only inspect the command, so we
					// continue handling it normally.
					if (entry.consume === false) continue;

					// and possibly reply to a supervised command
					await reply(SupervisionStatus.Success);
					return;
				}
			}

			// Handle Nonce Reports if there was no dynamic handler waiting for them
			if (msg.command instanceof Security2CCNonceReport) {
				return this.handleSecurity2NonceReport(node, msg.command);
			}

			// Some S2 commands contain only extensions. Those are handled by the CC implementation.
			if (
				msg.command instanceof Security2CCMessageEncapsulation
				&& msg.command.encapsulated == undefined
			) {
				// possibly reply to a supervised command
				await reply(SupervisionStatus.Success);
				return;
			}

			// Inclusion controller commands are handled by the controller class
			if (msg.command instanceof InclusionControllerCCInitiate) {
				const command = msg.command;
				if (
					msg.command.step === InclusionControllerStep.ProxyInclusion
				) {
					await trySupervised(() =>
						this.controller.handleInclusionControllerCCInitiateProxyInclusion(
							command,
						),
					);
					return;
				} else if (
					msg.command.step
					=== InclusionControllerStep.ProxyInclusionReplace
				) {
					await trySupervised(() =>
						this.controller.handleInclusionControllerCCInitiateReplace(
							command,
						),
					);
				}
			}

			// No one is waiting, dispatch the command to the node itself
			await trySupervised(() => node.handleCommand(msg.command));

			return;
		} else if (msg instanceof ApplicationUpdateRequest) {
			// Make sure we're ready to handle this command
			this.ensureReady(true);
			return this.controller.handleApplicationUpdateRequest(msg);
		} else if (msg instanceof SerialAPIStartedRequest) {
			if (await this.handleSerialAPIStartedUnexpectedly(msg)) {
				return;
			}
		} else {
			if (
				msg.functionType >= FunctionType.Proprietary_F0
				&& msg.functionType <= FunctionType.Proprietary_FE
				&& (await this._controller?.handleUnsolictedProprietaryCommand(
					msg,
				))
			) {
				// Proprietary command was handled
				return;
			}

			// TODO: This deserves a nicer formatting
			this.driverLog.print(
				`handling request ${
					FunctionType[msg.functionType]
				} (${msg.functionType})`,
			);
			handlers = this.requestHandlers.get(msg.functionType);
		}

		if (handlers != undefined && handlers.length > 0) {
			this.driverLog.print(
				`  ${handlers.length} handler${
					handlers.length !== 1 ? "s" : ""
				} registered!`,
			);
			// loop through all handlers and find the first one that returns true to indicate that it handled the message
			for (let i = 0; i < handlers.length; i++) {
				this.driverLog.print(`  invoking handler #${i}`);
				// Invoke the handler and remember its result
				const handler = handlers[i];
				let handlerResult = handler.invoke(msg);
				if (handlerResult instanceof Promise) {
					handlerResult = await handlerResult;
				}
				if (handlerResult) {
					this.driverLog.print(`    the message was handled`);
					if (handler.oneTime) {
						this.driverLog.print(
							"  one-time handler was successfully called, removing it...",
						);
						handlers.splice(i, 1);
					}
					// don't invoke any more handlers
					break;
				}
			}
		} else {
			this.driverLog.print("  no handlers registered!", "warn");
		}
	}

	private hasLoggedNoNetworkKey = false;

	private async handleSecurityNonceGet(node: ZWaveNode): Promise<void> {
		// Only reply if secure communication is set up
		if (!this.securityManager) {
			if (!this.hasLoggedNoNetworkKey) {
				this.hasLoggedNoNetworkKey = true;
				this.controllerLog.logNode(node.id, {
					message: `cannot reply to NonceGet because no network key was configured!`,
					direction: "inbound",
					level: "warn",
				});
			}
			return;
		}

		// When a node asks us for a nonce, it must support Security CC
		node.addCC(CommandClasses.Security, {
			isSupported: true,
			version: 1,
			// Security CC is always secure
			secure: true,
		});

		// Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
		const isNonceReport = (t: Transaction) =>
			t.message.getNodeId() === node.id
			&& containsCC(t.message)
			&& t.message.command instanceof SecurityCCNonceReport;

		if (this.hasPendingTransactions(isNonceReport)) {
			this.controllerLog.logNode(node.id, {
				message:
					"in the process of replying to a NonceGet, won't send another NonceReport",
				level: "warn",
			});
			return;
		}

		// Delete all previous nonces we sent the node, since they should no longer be used
		this.securityManager.deleteAllNoncesForReceiver(node.id);

		// Now send the current nonce
		try {
			await node.commandClasses.Security.sendNonce();
		} catch (e) {
			this.controllerLog.logNode(node.id, {
				message: `failed to send nonce: ${getErrorMessage(e)}`,
				direction: "inbound",
			});
		}
	}

	/**
	 * Is called when a nonce report is received that does not belong to any transaction.
	 * The received nonce reports are stored as "free" nonces
	 */
	private handleSecurityNonceReport(
		node: ZWaveNode,
		command: SecurityCCNonceReport,
	): void {
		const secMan = this.securityManager;
		if (!secMan) return;

		secMan.setNonce(
			{
				issuer: node.id,
				nonceId: secMan.getNonceId(command.nonce),
			},
			{
				nonce: command.nonce,
				receiver: this.controller.ownNodeId!,
			},
			{ free: true },
		);
	}

	private async handleSecurityCommandsSupportedGet(
		node: ZWaveNode,
		command: SecurityCCCommandsSupportedGet,
	): Promise<void> {
		const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

		if (this.getHighestSecurityClass(node.id) === SecurityClass.S0_Legacy) {
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

	/** Handles a nonce request for S2 */
	private async handleSecurity2NonceGet(node: ZWaveNode): Promise<void> {
		// Only reply if secure communication is set up
		if (!this.getSecurityManager2(node.id)) {
			if (!this.hasLoggedNoNetworkKey) {
				this.hasLoggedNoNetworkKey = true;
				this.controllerLog.logNode(node.id, {
					message: `cannot reply to NonceGet (S2) because no network key was configured!`,
					direction: "inbound",
					level: "warn",
				});
			}
			return;
		}

		// When a node asks us for a nonce, it must support Security 2 CC
		node.addCC(CommandClasses["Security 2"], {
			isSupported: true,
			version: 1,
			// Security 2 CC is always secure
			secure: true,
		});

		// Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
		const isNonceReport = (t: Transaction) =>
			t.message.getNodeId() === node.id
			&& containsCC(t.message)
			&& t.message.command instanceof Security2CCNonceReport;

		if (this.hasPendingTransactions(isNonceReport)) {
			this.controllerLog.logNode(node.id, {
				message:
					"in the process of replying to a NonceGet, won't send another NonceReport",
				level: "warn",
			});
			return;
		}

		try {
			await node.commandClasses["Security 2"].sendNonce();
		} catch (e) {
			this.controllerLog.logNode(node.id, {
				message: `failed to send nonce: ${getErrorMessage(e)}`,
				direction: "inbound",
			});
		}
	}

	/**
	 * Is called when a nonce report is received that does not belong to any transaction.
	 */
	private handleSecurity2NonceReport(
		node: ZWaveNode,
		_command: Security2CCNonceReport,
	): void {
		// const secMan = this.securityManager2;
		// if (!secMan) return;

		// This has the potential of resetting our SPAN state in the middle of a transaction which may expect it to be valid
		// So we probably shouldn't react here, and instead handle the NonceReport we'll get in response to the next command we send

		// if (command.SOS && command.receiverEI) {
		// 	// The node couldn't decrypt the last command we sent it. Invalidate
		// 	// the shared SPAN, since it did the same
		// 	secMan.storeRemoteEI(node.id, command.receiverEI);
		// }

		// Since we landed here, this is not in response to any command we sent
		this.controllerLog.logNode(node.id, {
			message: `received S2 nonce without an active transaction, not sure what to do with it`,
			level: "warn",
			direction: "inbound",
		});
	}

	private async handleSecurity2CommandsSupportedGet(
		node: ZWaveNode,
		command: Security2CCCommandsSupportedGet,
	): Promise<void> {
		const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

		const highestSecurityClass = this.getHighestSecurityClass(node.id);
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

			const implementedCCs = new Set(
				allCCs.filter((cc) => getImplementedVersion(cc) > 0),
			);

			// Encapsulation CCs are always supported
			const implementedEncapsulationCCs = encapsulationCCs.filter(
				(cc) =>
					implementedCCs.has(cc)
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
			const supportedCommandsNotInNIF = [...supportedCCs].filter(
				(cc) => !commandsInNIF.has(cc),
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

	/**
	 * Returns the next callback ID. Callback IDs are used to correlate requests
	 * to the controller/nodes with its response
	 */
	public readonly getNextCallbackId = createWrappingCounter(0xff);

	private readonly supervisionSessionIDs = new Map<number, () => number>();
	/**
	 * Returns the next session ID for Supervision CC
	 */
	public getNextSupervisionSessionId(nodeId: number): number {
		if (!this.supervisionSessionIDs.has(nodeId)) {
			this.supervisionSessionIDs.set(
				nodeId,
				createWrappingCounter(MAX_SUPERVISION_SESSION_ID, true),
			);
		}
		return this.supervisionSessionIDs.get(nodeId)!();
	}

	/**
	 * Returns the next session ID for Transport Service CC
	 */
	public readonly getNextTransportServiceSessionId = createWrappingCounter(
		MAX_TRANSPORT_SERVICE_SESSION_ID,
		true,
	);

	private encapsulateCommands(
		cmd: CommandClass,
		options: Omit<SendCommandOptions, keyof SendMessageOptions> = {},
	): CommandClass {
		// The encapsulation order (from outside to inside) is as follows:
		// 5. Any one of the following combinations:
		//   a. Security (S0 or S2) followed by transport service
		//   b. Transport Service
		//   c. Security (S0 or S2)
		//   d. CRC16
		// b and d are mutually exclusive, security is not
		// 4. Multi Channel
		// 3. Supervision
		// 2. Multi Command
		// 1. Encapsulated Command Class (payload), e.g. Basic Set

		// TODO: 2.

		// 3.
		if (SupervisionCC.requiresEncapsulation(cmd)) {
			cmd = SupervisionCC.encapsulate(
				cmd,
				this.getNextSupervisionSessionId(cmd.nodeId as number),
			);
		}

		// 4.
		if (MultiChannelCC.requiresEncapsulation(cmd)) {
			const multiChannelCCVersion = this.getSupportedCCVersion(
				CommandClasses["Multi Channel"],
				cmd.nodeId as number,
			);

			cmd =
				multiChannelCCVersion === 1
					? MultiChannelCC.encapsulateV1(cmd)
					: MultiChannelCC.encapsulate(cmd);
		}

		// 5.
		if (CRC16CC.requiresEncapsulation(cmd)) {
			cmd = CRC16CC.encapsulate(cmd);
		} else {
			// The command must be S2-encapsulated, if ...
			let maybeS2 = false;
			const node = cmd.getNode(this);
			if (node?.supportsCC(CommandClasses["Security 2"])) {
				// ... the node supports S2 and has a valid security class
				const nodeSecClass = node.getHighestSecurityClass();
				const securityManager = this.getSecurityManager2(node.id);
				maybeS2 =
					securityClassIsS2(nodeSecClass)
					|| !!securityManager?.tempKeys.has(node.id);
			} else if (options.s2MulticastGroupId != undefined) {
				// ... or we're dealing with S2 multicast
				maybeS2 = true;
			}
			if (maybeS2 && Security2CC.requiresEncapsulation(cmd)) {
				cmd = Security2CC.encapsulate(cmd, this.ownNodeId, this, {
					securityClass: options.s2OverrideSecurityClass,
					multicastOutOfSync: !!options.s2MulticastOutOfSync,
					multicastGroupId: options.s2MulticastGroupId,
					verifyDelivery: options.s2VerifyDelivery,
				});
			}

			// This check will return false for S2-encapsulated commands
			if (SecurityCC.requiresEncapsulation(cmd)) {
				cmd = SecurityCC.encapsulate(
					this.ownNodeId,
					this.securityManager!,
					cmd,
				);
			}
		}
		return cmd;
	}

	public unwrapCommands(msg: Message & ContainsCC): void {
		// Unwrap encapsulating CCs until we get to the core
		while (
			isEncapsulatingCommandClass(msg.command)
			|| isMultiEncapsulatingCommandClass(msg.command)
		) {
			const unwrapped = msg.command.encapsulated;
			if (isArray(unwrapped)) {
				// Multi Command CC cannot be further unwrapped. Preserve the encapsulation flags though.
				for (const cmd of unwrapped) {
					cmd.toggleEncapsulationFlag(
						msg.command.encapsulationFlags,
						true,
					);
				}
				return;
			}

			// Copy the encapsulation flags and add the current encapsulation
			unwrapped.encapsulationFlags = msg.command.encapsulationFlags;
			switch (msg.command.ccId) {
				case CommandClasses.Supervision:
					unwrapped.toggleEncapsulationFlag(
						EncapsulationFlags.Supervision,
						true,
					);
					break;
				case CommandClasses["Security 2"]:
				case CommandClasses.Security:
					unwrapped.toggleEncapsulationFlag(
						EncapsulationFlags.Security,
						true,
					);
					break;
				case CommandClasses["CRC-16 Encapsulation"]:
					unwrapped.toggleEncapsulationFlag(
						EncapsulationFlags.CRC16,
						true,
					);
					break;
			}

			msg.command = unwrapped;
		}
	}

	private shouldPersistCCValues(cc: CommandClass): boolean {
		// Always persist encapsulation CCs, otherwise interviews don't work.
		if (isEncapsulationCC(cc.ccId)) return true;

		// Do not persist values for a node or endpoint that does not exist
		const endpoint = this.tryGetEndpoint(cc);
		const node = endpoint?.tryGetNode();
		if (!node) return false;

		// Do not persist values for a CC that was force-removed via config
		if (endpoint?.wasCCRemovedViaConfig(cc.ccId)) return false;

		// Do not persist values for a CC that's being mapped to another endpoint.
		// FIXME: This duplicates logic in Node.ts -> handleCommand
		const compatConfig = node?.deviceConfig?.compat;
		if (
			cc.endpointIndex === 0
			&& cc.constructor.name.endsWith("Report")
			&& node.getEndpointCount() >= 1
			// Only map reports from the root device to an endpoint if we know which one
			&& compatConfig?.mapRootReportsToEndpoint != undefined
		) {
			const targetEndpoint = node.getEndpoint(
				compatConfig.mapRootReportsToEndpoint,
			);
			if (targetEndpoint?.supportsCC(cc.ccId)) return false;
		}

		return true;
	}

	/** Persists the values contained in a Command Class in the corresponding nodes's value DB */
	private persistCCValues(cc: CommandClass) {
		if (this.shouldPersistCCValues(cc)) {
			cc.persistValues(this);
		}

		if (isEncapsulatingCommandClass(cc)) {
			this.persistCCValues(cc.encapsulated);
		} else if (isMultiEncapsulatingCommandClass(cc)) {
			for (const encapsulated of cc.encapsulated) {
				this.persistCCValues(encapsulated);
			}
		}
	}

	/**
	 * Gets called whenever any Serial API command succeeded or a SendData command had a negative callback.
	 */
	private handleSerialAPICommandResult(
		msg: Message,
		options: SendMessageOptions,
		result: Message | undefined,
	): void {
		// Update statistics
		const node = this.tryGetNode(msg);
		let success = true;
		if (isSendData(msg) || hasNodeId(msg)) {
			// This shouldn't happen, but just in case
			if (!node) return;

			// If this is a transmit report, use it to update statistics
			if (isTransmitReport(result)) {
				if (!result.isOK()) {
					success = false;
					node.incrementStatistics("commandsDroppedTX");
				} else {
					node.incrementStatistics("commandsTX");
					node.updateRTT(msg);
					// Update last seen state
					node.lastSeen = new Date();
				}

				// Notify listeners about the status report if one was received
				if (hasTXReport(result)) {
					node.updateRouteStatistics(result.txReport);
				}
			}

			// Track and potentially update the status of the node when communication succeeds
			if (success) {
				if (node.canSleep) {
					// Do not update the node status when we only responded to a nonce/supervision request
					if (options.priority !== MessagePriority.Immediate) {
						// If the node is not meant to be kept awake, try to send it back to sleep
						if (!node.keepAwake) {
							setImmediate(() =>
								this.debounceSendNodeToSleep(node),
							);
						}
						// The node must be awake because it answered
						node.markAsAwake();
					}
				} else if (node.status !== NodeStatus.Alive) {
					// The node status was unknown or dead - in either case it must be alive because it answered
					node.markAsAlive();
				}
			}
		} else {
			this._controller?.incrementStatistics("messagesTX");
		}
	}

	private shouldUseLowPriorityForSupervisionReport(
		targetNode: ZWaveNode,
		encapsulationFlags: EncapsulationFlags,
	): boolean {
		// To avoid S2 collisions, we reduce the priority of Supervision reports
		// when they are S2-encapsulated, and another S2-encapsulated transaction is in
		// progress for the same node

		// Use Immediate priority if there is no other transaction for this node in progress
		const currentNormalMsg = this.queue.currentTransaction?.message;
		if (currentNormalMsg?.getNodeId() !== targetNode.id) {
			return false;
		}
		if (!containsCC(currentNormalMsg)) {
			return false;
		}

		// Use Immediate priority if the node isn't using Security S2
		if (!securityClassIsS2(targetNode.getHighestSecurityClass())) {
			return false;
		}

		// Use Immediate priority unless both messages are S2-encapsulated
		const currentMsgIsSecure =
			currentNormalMsg.command instanceof Security2CCMessageEncapsulation;
		const reportIsSecure = !!(
			encapsulationFlags & EncapsulationFlags.Security
		);
		if (!currentMsgIsSecure || !reportIsSecure) {
			return false;
		}

		// This has potential for a conflict, use low priority
		this.controllerLog.logNode(targetNode.id, {
			message:
				"S2 collision detected, reducing priority for Supervision report",
			level: "debug",
		});
		return true;
	}

	/**
	 * @internal
	 * Hold back interview traffic while an inclusion, exclusion or security
	 * bootstrap is active, so it does not interfere with the process.
	 * TODO: Remove this once CC interviews are coroutines that yield around
	 * each command - the task scheduler will then pause them automatically.
	 */
	public mustHoldTransaction(transaction: Transaction): boolean {
		return (
			transaction.tag === "interview"
			&& this._controller != undefined
			&& this._controller.inclusionState !== InclusionState.Idle
			&& this._controller.inclusionState !== InclusionState.SmartStart
		);
	}

	private mayStartTransaction(transaction: Transaction): boolean {
		// We may not send anything on the normal queue if the send thread is paused
		// or the controller is unresponsive
		if (
			this.queuePaused
			|| this.controller.status === ControllerStatus.Unresponsive
		) {
			return false;
		}

		if (this.mustHoldTransaction(transaction)) return false;

		const message = transaction.message;
		const targetNode = message.tryGetNode(this);

		// Messages to the controller may always be sent...
		if (!targetNode) return true;

		// The transaction queue is sorted automatically. If the first message is for a sleeping node, all messages in the queue are.
		// There are a few exceptions:
		// 1. Pings may be used to determine whether a node is really asleep.
		// 2. Responses to nonce requests must be sent independent of the node status, because some sleeping nodes may try to send us encrypted messages.
		//    If we don't send them, they block the send queue
		// 3. Nodes that can sleep but do not support wakeup: https://github.com/zwave-js/zwave-js/discussions/1537
		//    We need to try and send messages to them even if they are asleep, because we might never hear from them

		// 2. is handled by putting the message into the immediate queue

		// Pings may always be sent
		if (messageIsPing(message)) return true;

		// Enforce polling timing requirements from the spec.
		// After a poll transaction completes, wait at least 10 seconds before starting the next one.
		if (transaction.priority === MessagePriority.Poll) {
			const elapsed = Date.now() - this._lastTransactionEnd;
			const requiredDelay =
				this._options.timeouts.pollTime + this._lastPollCommandTime;
			if (elapsed < requiredDelay) {
				// Schedule a re-trigger of the queue when the delay has elapsed
				if (!this._pollDelayTimer) {
					this._pollDelayTimer = setTimer(() => {
						this._pollDelayTimer = undefined;
						this.queue.trigger();
					}, requiredDelay - elapsed).unref();
				}
				return false;
			}
		}

		return (
			targetNode.status !== NodeStatus.Asleep
			|| (!targetNode.supportsCC(CommandClasses["Wake Up"])
				&& targetNode.interviewStage >= InterviewStage.NodeInfo)
		);
	}

	/**
	 * Whether a completed transaction delays the next poll. Controller-only requests
	 * never reach the mesh. Immediate-priority commands are replies forced by the
	 * other node, so a chatty node must not be able to hold back polls forever.
	 */
	private countsAsMeshActivity(transaction: Transaction): boolean {
		if (transaction.message.getNodeId() == undefined) return false;
		return (
			transaction.priority !== MessagePriority.Immediate
			&& transaction.priority !== MessagePriority.ImmediateLow
		);
	}

	private markQueueBusy(queue: TransactionQueue, busy: boolean): void {
		const index = this.queues.indexOf(queue);
		if (busy) {
			this._queuesBusyFlags |= 1 << index;
		} else {
			this._queuesBusyFlags &= ~(1 << index);
		}
		this.queueIdle = this._queuesBusyFlags === 0;
	}

	private async drainTransactionQueue(
		queue: TransactionQueue,
	): Promise<void> {
		let setIdleTimer: NodeJS.Immediate | undefined;
		for await (const transaction of queue) {
			if (setIdleTimer) {
				clearImmediate(setIdleTimer);
				setIdleTimer = undefined;
			}
			this.markQueueBusy(queue, true);

			const isPoll = transaction.priority === MessagePriority.Poll;
			const pollStart = isPoll ? Date.now() : undefined;

			let error: ZWaveError | undefined;
			try {
				await this.executeTransaction(transaction);
			} catch (e) {
				error = e as ZWaveError;
			} finally {
				queue.finalizeTransaction();
			}

			// Per spec, PollTime MUST NOT be less than 1 second + CommandTime after any
			// command, including failed ones. Track when the last transaction ended.
			if (this.countsAsMeshActivity(transaction)) {
				this._lastTransactionEnd = Date.now();
			}
			if (isPoll) {
				// CommandTime is measured from when the poll was first sent to when the
				// transmit report was received. For simplicity, we approximate it as the
				// full transaction duration, which includes retransmissions in case of failure
				// but also the time it takes the node to respond. So we tend to wait a bit
				// longer than necessary.
				this._lastPollCommandTime = Date.now() - pollStart!;
			}

			// Handle errors after clearing the current transaction.
			// Otherwise, it will get considered the active transaction and cause an unnecessary SendDataAbort
			if (error) {
				this.handleFailedTransaction(transaction, error);
			}

			setIdleTimer = setImmediate(() => {
				this.markQueueBusy(queue, false);
			});
		}
	}

	/** Steps through the message generator of a transaction. Throws an error if the transaction should fail. */
	private async executeTransaction(transaction: Transaction): Promise<void> {
		let prevResult: Message | undefined;
		let msg: Message | undefined;

		transaction.start();
		transaction.setProgress({ state: TransactionState.Active });

		const maxJammedAttempts =
			this._recoveryPhase === ControllerRecoveryPhase.JammedAfterReset
				? // After attempting soft-reset, only try sending once
					1
				: this.options.attempts.sendDataJammed;

		// Step through the transaction as long as it gives us a next message
		while ((msg = await transaction.generateNextMessage(prevResult))) {
			// Keep track of how often the controller failed to send a command, to prevent ending up in an infinite loop
			let jammedAttempts = 0; // SendData failed with status Fail
			let queueAttempts = 0; // SendData returned a negative response
			let commandAttempts = 0; // The command was not acknowledged
			attemptMessage: for (let attemptNumber = 1; ; attemptNumber++) {
				try {
					prevResult = await this.queueSerialAPICommand(
						msg,
						transaction.stack,
					);
					if (isTransmitReport(prevResult)) {
						// Figure out if the controller is jammed. If it is, wait a second and try again.
						// https://github.com/zwave-js/zwave-js/issues/6199
						// In some cases, the transmit status can be Fail, even after transmitting for a couple of seconds.
						// Not sure what causes this, but it doesn't mean that the controller is jammed.
						if (
							prevResult.transmitStatus === TransmitStatus.Fail
							&& "txReport" in prevResult
							// Ensure the controller didn't actually transmit
							&& prevResult.txReport?.txTicks === 0
						) {
							jammedAttempts++;
							attemptNumber--;
							if (jammedAttempts < maxJammedAttempts) {
								// The controller is jammed. Wait a bit, then try again.
								this.controller.setStatus(
									ControllerStatus.Jammed,
								);
								await wait(
									this.options.timeouts.retryJammed,
									true,
								);

								continue attemptMessage;
							} else {
								// Reject the transaction so we can attempt to recover
								throw new ZWaveError(
									`Failed to send the command after ${jammedAttempts} attempts`,
									ZWaveErrorCodes.Controller_MessageDropped,
									prevResult,
									transaction.stack,
								);
							}
						}

						// A command could be sent, so the controller is no longer jammed
						if (
							this.controller.status === ControllerStatus.Jammed
						) {
							this.controller.setStatus(ControllerStatus.Ready);
						}
						// and a possible recovery phase is over
						if (
							this._recoveryPhase
							=== ControllerRecoveryPhase.JammedAfterReset
						) {
							this._recoveryPhase = ControllerRecoveryPhase.None;
						}

						if (!prevResult.isOK()) {
							throw new ZWaveError(
								"The node did not acknowledge the command",
								ZWaveErrorCodes.Controller_CallbackNOK,
								prevResult,
								transaction.stack,
							);
						}
					}
					// We got a result - it will be passed to the next iteration
					break attemptMessage;
				} catch (e: any) {
					let zwError: ZWaveError;

					if (!isZWaveError(e)) {
						zwError = createMessageDroppedUnexpectedError(e);
					} else {
						// Handle a couple of special cases
						if (isSendData(msg) && isMissingControllerCallback(e)) {
							// The controller is unresponsive. Reject the transaction, so we can attempt to recover
							throw e;
						} else if (isMissingControllerACK(e)) {
							commandAttempts++;
							attemptNumber--;
							if (
								commandAttempts
								< this.options.attempts.controller
							) {
								// Try again
								continue attemptMessage;
							} else {
								// The controller is unresponsive. Reject the transaction, so we can attempt to recover
								throw e;
							}
						} else if (wasControllerReset(e)) {
							// The controller was reset unexpectedly. Reject the transaction, so we can attempt to recover
							throw e;
						} else if (
							isAnySendDataResponse(e.context)
							&& !e.context.wasSent
						) {
							// If a SendData command could not be queued, try again after a short delay
							queueAttempts++;
							attemptNumber--;
							if (queueAttempts < 3) {
								await wait(500, true);
								continue attemptMessage;
							}

							// Give up
							throw e;
						} else if (
							e.code === ZWaveErrorCodes.Controller_MessageDropped
							|| e.code === ZWaveErrorCodes.Driver_TaskRemoved
							|| e.code === ZWaveErrorCodes.Driver_Destroyed
						) {
							// We gave up on this command, so don't retry it
							throw e;
						}

						// If we receive a premature node update, we abort the transaction
						// so we should end up here with transmit status NoACK.
						// This is expected and intended, so continue with the next message.
						if (msg.prematureNodeUpdate) {
							break attemptMessage;
						}

						if (
							this.mayRetrySerialAPICommand(msg, attemptNumber, e)
						) {
							// Retry the command
							continue attemptMessage;
						}

						zwError = e;
					}

					// Sending the command failed, reject the transaction
					throw zwError;
				}
			}
		}
	}

	/**
	 * Provides access to the result Promise for the currently executed serial API command
	 */
	private _currentSerialAPICommandPromise:
		| DeferredPromise<Message | undefined>
		| undefined;

	/** Handles sequencing of queued Serial API commands */
	private async drainSerialAPIQueue(): Promise<void> {
		for await (const item of this.serialAPIQueue) {
			const { msg, transactionSource, result } = item;
			this._currentSerialAPICommandPromise = result;

			// Attempt the command multiple times if necessary
			attempts: for (let attempt = 1; ; attempt++) {
				try {
					const ret = await this.executeSerialAPICommand(
						msg,
						transactionSource,
					);
					result.resolve(ret);
				} catch (e) {
					if (
						isZWaveError(e)
						&& e.code === ZWaveErrorCodes.Controller_MessageDropped
						&& e.context === "CAN"
						&& attempt < 3
					) {
						// Retry up to 3 times if there are serial collisions
						await wait(100);
						continue;
					}

					// In all other cases, reject the transaction
					result.reject(e as Error);
				} finally {
					this._currentSerialAPICommandPromise = undefined;
				}
				break attempts;
			}
		}
	}

	private triggerQueues(): void {
		// The queues might not have been initialized yet
		for (const queue of this.queues) {
			if (!queue) return;
		}

		for (const queue of this.queues) {
			queue.trigger();
		}
	}

	/** Puts a message on the serial API queue and returns or throws the command result */
	private queueSerialAPICommand(
		msg: Message,
		transactionSource?: string,
	): Promise<Message | undefined> {
		const result = createDeferredPromise<Message | undefined>();
		this.serialAPIQueue.add({
			msg,
			transactionSource,
			result,
			[Symbol.dispose]: () => {
				// Is called when the queue is aborted. Must not use a code that
				// isTransmissionError() accepts, or callers will retry against a
				// queue that no longer accepts commands.
				result.reject(
					new ZWaveError(
						"The message has been removed from the queue",
						ZWaveErrorCodes.Driver_TaskRemoved,
						undefined,
						transactionSource,
					),
				);
			},
		});

		return result;
	}

	private mayRetrySerialAPICommand(
		msg: Message,
		attemptNumber: number,
		error: ZWaveError,
	): boolean {
		// Only retry Send Data, nothing else
		if (!isSendData(msg)) return false;

		// Don't try to resend SendData commands when the response times out
		if (
			error.code === ZWaveErrorCodes.Controller_Timeout
			&& error.context === "response"
		) {
			return false;
		}

		// Don't try to resend multicast messages if they were already transmitted.
		// One or more nodes might have already reacted
		if (
			(msg instanceof SendDataMulticastRequest
				|| msg instanceof SendDataMulticastBridgeRequest)
			&& error.code === ZWaveErrorCodes.Controller_CallbackNOK
		) {
			return false;
		}

		return attemptNumber < msg.maxSendAttempts;
	}

	/**
	 * Executes a Serial API command and returns or throws the result.
	 * This method should not be called outside of {@link drainSerialAPIQueue}.
	 */
	private async executeSerialAPICommand(
		msg: Message,
		transactionSource?: string,
	): Promise<Message | undefined> {
		// Give the command a callback ID if it needs one
		if (msg.needsCallbackId() && !msg.hasCallbackId()) {
			msg.callbackId = this.getNextCallbackId();
		}

		// Work around an issue in the 700 series firmware where the ACK after a soft-reset has a random high nibble.
		// This was broken in 7.19, not fixed so far
		if (
			msg.functionType === FunctionType.SoftReset
			&& this.controller.sdkVersionGte("7.19.0")
		) {
			this.serial?.ignoreAckHighNibbleOnce();
		}

		const machine = createSerialAPICommandMachine(msg);
		this.abortSerialAPICommand = createDeferredPromise();
		// Avoid an unhandled rejection when destroying the driver while not actively waiting
		this.abortSerialAPICommand.catch(() => {});
		const abortController = new AbortController();

		let nextInput: SerialAPICommandMachineInput<Message> | undefined = {
			value: "start",
		};

		try {
			while (!machine.done) {
				if (nextInput == undefined) {
					// We should not be in a situation where we have no input for the state machine
					throw new Error(
						"Serial API Command machine is in an invalid state: no input provided",
					);
				}
				const transition = machine.next(nextInput);
				if (transition == undefined) {
					// We should not be in a situation where the state machine does not transition
					throw new Error(
						"Serial API Command machine is in an invalid state: no transition taken",
					);
				}

				// The input was used
				nextInput = undefined;

				// Transition to the new state
				machine.transition(transition.newState);

				// Now check what needs to be done in the new state
				switch (machine.state.value) {
					case "initial":
						// This should never happen
						throw new Error(
							"Serial API Command machine is in an invalid state: transitioned to initial state",
						);

					case "sending": {
						this.driverLog.logMessage(msg, {
							direction: "outbound",
						});

						// Mark the message as sent immediately before actually sending
						msg.markAsSent();
						const data = await msg.serialize(
							this.getEncodingContext(),
						);
						await this.writeSerial(data);
						nextInput = { value: "message sent" };
						break;
					}

					case "waitingForACK": {
						const controlFlow = await Promise.race([
							this.abortSerialAPICommand?.catch(
								(e) => e as Error,
							),
							this.waitForMessageHeader(
								() => true,
								this.options.timeouts.ack,
								abortController.signal,
							).catch(() => "timeout" as const),
						]);

						if (controlFlow instanceof Error) {
							// The command was aborted from the outside
							// Remove the pending wait entry
							abortController.abort();
							throw controlFlow;
						}

						if (controlFlow === "timeout") {
							nextInput = { value: "timeout" };
						} else if (controlFlow === MessageHeaders.ACK) {
							nextInput = { value: "ACK" };
						} else if (controlFlow === MessageHeaders.CAN) {
							nextInput = { value: "CAN" };
						} else if (controlFlow === MessageHeaders.NAK) {
							nextInput = { value: "NAK" };
						}

						break;
					}

					case "waitingForResponse": {
						const response = await Promise.race([
							this.abortSerialAPICommand?.catch(
								(e) => e as Error,
							),
							this.waitForMessage(
								(resp) => msg.isExpectedResponse(resp),
								msg.getResponseTimeout()
									?? this.options.timeouts.response,
								undefined,
								abortController.signal,
							).catch(() => "timeout" as const),
						]);

						if (response instanceof Error) {
							// The command was aborted from the outside
							// Remove the pending wait entry
							abortController.abort();
							throw response;
						}

						if (response === "timeout") {
							if (isSendData(msg)) {
								// Timed out SendData commands must be aborted
								void this.abortSendData();
							}

							nextInput = { value: "timeout" };
						} else if (
							isSuccessIndicator(response)
							&& !response.isOK()
						) {
							nextInput = { value: "response NOK", response };
						} else {
							nextInput = { value: "response", response };
						}

						break;
					}

					case "waitingForCallback": {
						let sendDataAbortTimeout: Timer | undefined;
						if (isSendData(msg)) {
							// We abort timed out SendData commands before the callback times out
							sendDataAbortTimeout = setTimer(() => {
								void this.abortSendData();
							}, this.options.timeouts.sendDataAbort).unref();
						}

						const callback = await Promise.race([
							this.abortSerialAPICommand?.catch(
								(e) => e as Error,
							),
							this.waitForMessage(
								(resp) => msg.isExpectedCallback(resp),
								msg.getCallbackTimeout()
									?? this.options.timeouts.sendDataCallback,
								undefined,
								abortController.signal,
							).catch(() => "timeout" as const),
						]);

						sendDataAbortTimeout?.clear();

						if (callback instanceof Error) {
							// The command was aborted from the outside
							// Remove the pending wait entry
							abortController.abort();
							throw callback;
						}

						if (callback === "timeout") {
							nextInput = { value: "timeout" };
						} else if (
							isSuccessIndicator(callback)
							&& !callback.isOK()
						) {
							nextInput = { value: "callback NOK", callback };
						} else {
							nextInput = { value: "callback", callback };
						}

						break;
					}

					case "success": {
						return machine.state.result;
					}

					case "failure": {
						const { reason, result } = machine.state;
						if (
							reason === "callback NOK"
							&& (isSendData(msg) || isTransmitReport(result))
						) {
							// For messages that were sent to a node, a NOK callback still contains useful info we need to evaluate
							// ... so we treat it as a result
							return result;
						} else {
							throw serialAPICommandErrorToZWaveError(
								reason,
								msg,
								result,
								transactionSource,
							);
						}
					}
				}
			}
		} finally {
			this.abortSerialAPICommand = undefined;
		}
	}

	private getQueueForTransaction(t: Transaction): TransactionQueue {
		if (
			t.priority === MessagePriority.Immediate
			|| t.priority === MessagePriority.ControllerImmediate
		) {
			return this.immediateQueue;
		} else {
			return this.queue;
		}
	}

	/**
	 * Checks whether two SendData transactions would be executed and handled
	 * the same way, so one of them may be deduplicated.
	 */
	private areTransactionsCompatible(
		first: Transaction,
		second: Transaction,
	): boolean {
		// Callers that request Supervision status updates each need their own
		// Supervision session
		if (first.requestStatusUpdates || second.requestStatusUpdates) {
			return false;
		}

		// The driver must handle both transactions the same way
		if (
			first.changeNodeStatusOnTimeout !== second.changeNodeStatusOnTimeout
			|| first.pauseSendThread !== second.pauseSendThread
			|| first.requestWakeUpOnDemand !== second.requestWakeUpOnDemand
			|| first.tag !== second.tag
		) {
			return false;
		}

		// Both must use the same kind of SendData message
		if (
			first.message.constructor !== second.message.constructor
			|| !isSendData(first.message)
			|| !isSendData(second.message)
		) {
			return false;
		}

		// The controller must transmit and follow up on both the same way
		if (
			first.message.transmitOptions !== second.message.transmitOptions
			|| first.message.maxSendAttempts !== second.message.maxSendAttempts
			|| first.message.nodeUpdateTimeout
				!== second.message.nodeUpdateTimeout
			|| first.message.ignoreNodeUpdate
				!== second.message.ignoreNodeUpdate
		) {
			return false;
		}

		// Bridge commands must be sent from the same source node
		if (
			(first.message instanceof SendDataBridgeRequest
				&& second.message instanceof SendDataBridgeRequest
				&& first.message.sourceNodeId !== second.message.sourceNodeId)
			|| (first.message instanceof SendDataMulticastBridgeRequest
				&& second.message instanceof SendDataMulticastBridgeRequest
				&& first.message.sourceNodeId !== second.message.sourceNodeId)
		) {
			return false;
		}

		return true;
	}

	/**
	 * Determines how a new transaction relates to an existing one, so redundant
	 * commands can be deduplicated and superseded ones dropped.
	 * Returns `Unrelated` unless both transactions contain a CC and would be
	 * executed the same way.
	 */
	private getTransactionRelation(
		newer: Transaction,
		newerMessage: SendDataMessage & ContainsCC,
		older: Transaction,
	): CommandRelation {
		if (
			!older.hasAttachments
			|| older.isSettled
			|| !this.areTransactionsCompatible(newer, older)
			|| !isSendData(older.message)
			|| !containsCC(older.message)
		) {
			return CommandRelation.Unrelated;
		}
		return getCommandRelation(newerMessage.command, older.message.command);
	}

	/**
	 * Adds a transaction to the queue it belongs to, deduplicating it against
	 * related commands in that queue:
	 * - A redundant command shares the older command's transmission.
	 * - A superseding command replaces queued older commands, failing their callers.
	 *
	 * `preventDeduplication` opts a command out of both: it always transmits
	 * itself and is never dropped in favor of a newer command. It does absorb
	 * the callers of unprotected duplicates it replaces in the queue.
	 */
	private enqueueTransaction(transaction: Transaction): void {
		const queue = this.getQueueForTransaction(transaction);
		// The queue must not start a transaction while it is being modified
		queue.pause();
		try {
			let activeRedundant: Transaction | undefined;
			let deferredRedundant: Transaction | undefined;
			const queuedRedundant: Transaction[] = [];
			const queuedSuperseded: Transaction[] = [];
			const deferredSuperseded: Transaction[] = [];

			const newerMessage = transaction.message;
			if (isSendData(newerMessage) && containsCC(newerMessage)) {
				if (
					queue.currentTransaction
					// Protected commands must transmit themselves, so they ignore the active transmission
					&& !transaction.preventDeduplication
					&& this.getTransactionRelation(
						transaction,
						newerMessage,
						queue.currentTransaction,
					) === CommandRelation.Redundant
				) {
					activeRedundant = queue.currentTransaction;
				}

				for (const older of queue.transactions) {
					switch (
						this.getTransactionRelation(
							transaction,
							newerMessage,
							older,
						)
					) {
						case CommandRelation.Supersedes:
							// Protected commands must not be dropped for a newer command
							if (!older.preventDeduplication) {
								queuedSuperseded.push(older);
							}
							break;
						case CommandRelation.Redundant:
							// Two protected commands transmit separately
							if (
								!transaction.preventDeduplication
								|| !older.preventDeduplication
							) {
								queuedRedundant.push(older);
							}
							break;
					}
				}

				// Also look at transactions that wait for a delayed requeue,
				// see delayTransactionsForNode
				for (const [nodeId, batches] of this.requeueTimers) {
					for (const batch of batches) {
						batch.transactions = batch.transactions.filter(
							(older) => {
								switch (
									this.getTransactionRelation(
										transaction,
										newerMessage,
										older,
									)
								) {
									case CommandRelation.Supersedes:
										// Cancel the stale command before its requeue timer fires
										if (!older.preventDeduplication) {
											deferredSuperseded.push(older);
											return false;
										}
										break;
									case CommandRelation.Redundant:
										// The node cannot handle this command right now, so a
										// duplicate waits for the delayed command
										if (!transaction.preventDeduplication) {
											deferredRedundant ??= older;
										}
										break;
								}
								return true;
							},
						);
						if (batch.transactions.length === 0) {
							batch.timer.clear();
							batches.delete(batch);
						}
					}
					if (batches.size === 0) this.requeueTimers.delete(nodeId);
				}
			}

			// Remove superseded transactions before rejecting them. Rejecting
			// runs synchronous caller listeners that may re-enter this method.
			queue.remove(...queuedSuperseded);
			for (const older of [...queuedSuperseded, ...deferredSuperseded]) {
				this.rejectTransaction(
					older,
					new ZWaveError(
						"The message was superseded by a newer command",
						ZWaveErrorCodes.Controller_MessageSuperseded,
						undefined,
						older.stack,
					),
				);
			}

			if (transaction.preventDeduplication) {
				// The protected command replaces its unprotected duplicates in the queue
				for (const older of queuedRedundant) {
					// Inherit the highest priority (lower value)
					transaction.priority = Math.min(
						transaction.priority,
						older.priority,
					);
					// Inherit the earliest creation time so it keeps its spot in the queue
					transaction.creationTimestamp = Math.min(
						transaction.creationTimestamp,
						older.creationTimestamp,
					);
					// The duplicate never transmits.
					// Its callers get their result from the protected command.
					queue.remove(older);
					transaction.adoptCallersFrom(older);
				}
				queue.add(transaction);
			} else {
				// Attach the new command's callers to the first matching command found.
				// Multiple queued matches are all protected, so any of them works.
				const redundant =
					activeRedundant ?? queuedRedundant[0] ?? deferredRedundant;
				if (redundant) {
					redundant.adoptCallersFrom(transaction);
					// Re-add the transaction to the queue if its priority changed
					// to force a re-sort.
					if (
						redundant !== activeRedundant
						&& transaction.priority < redundant.priority
					) {
						if (redundant === deferredRedundant) {
							redundant.priority = transaction.priority;
						} else {
							// Re-add the queued command so the queue re-sorts it
							queue.remove(redundant);
							redundant.priority = transaction.priority;
							queue.add(redundant);
						}
					}
				} else {
					queue.add(transaction);
				}
			}
		} finally {
			// Rejections and progress updates run synchronous listeners which
			// may throw. The queue must not stay paused in that case.
			queue.unpause();
		}
	}

	/**
	 * Sends a message to the Z-Wave stick.
	 * @param msg The message to send
	 * @param options (optional) Options regarding the message transmission
	 */
	public async sendMessage<TResponse extends Message = Message>(
		msg: Message,
		options: SendMessageOptions = {},
	): Promise<TResponse> {
		this.ensureReady();

		let node: ZWaveNode | undefined;
		if (hasNodeId(msg) || containsCC(msg)) {
			node = this.tryGetNode(msg);
		}

		if (options.priority == undefined) {
			options.priority = getDefaultPriority(msg);
		}
		if (options.priority == undefined) {
			const className = msg.constructor.name;
			const msgTypeName = FunctionType[msg.functionType];
			throw new ZWaveError(
				`No default priority has been defined for ${className} (${msgTypeName}), so you have to provide one for your message`,
				ZWaveErrorCodes.Driver_NoPriority,
			);
		}

		if (options.supportCheck == undefined) options.supportCheck = true;
		if (
			options.supportCheck
			&& this._controller != undefined
			&& !this._controller.isFunctionSupported(msg.functionType)
		) {
			throw new ZWaveError(
				`Your hardware does not support the ${
					FunctionType[msg.functionType]
				} function`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}

		// When sending a message to a node that is known to be sleeping,
		// the priority must be WakeUp, so the message gets deprioritized
		// in comparison with messages to awake nodes.
		// However there are a few exceptions...
		if (
			!!node
			// Pings can be used to check if a node is really asleep, so they should be sent regardless
			&& !messageIsPing(msg)
			// Nodes that can sleep and support the Wake Up CC should have their messages queued for wakeup
			&& node.canSleep
			&& (node.supportsCC(CommandClasses["Wake Up"])
				// If we don't know the Wake Up support yet, also change the priority or RequestNodeInfoRequests will get stuck
				// in front of the queue
				|| node.interviewStage < InterviewStage.NodeInfo)
			// If we move multicasts to the wakeup queue, it is unlikely
			// that there is ever a points where all targets are awake
			&& !(msg instanceof SendDataMulticastRequest)
			&& !(msg instanceof SendDataMulticastBridgeRequest)
			// Nonces and responses to Supervision Get have to be sent immediately
			&& options.priority !== MessagePriority.Immediate
		) {
			options.priority = MessagePriority.WakeUp;
		}

		// Create the transaction
		let transaction: Transaction;
		const generator = createMessageGenerator(
			this,
			this.getEncodingContext(),
			msg,
			(msg, _result) => {
				this.handleSerialAPICommandResult(msg, options, _result);
				if (hasTXReport(_result)) {
					transaction.reportTXReport(_result.txReport);
				}
			},
		);
		transaction = new Transaction(this, {
			message: msg,
			priority: options.priority,
			parts: generator,
			preventDeduplication:
				"preventDeduplication" in options
				&& options.preventDeduplication === true,
			onSettled: (result) => {
				if (
					result.status === "rejected"
					&& isZWaveError(result.reason)
					&& result.reason.code
						=== ZWaveErrorCodes.Controller_NodeTimeout
				) {
					// Count each physical timeout once per actual transaction
					node?.incrementStatistics("timeoutResponse");
				}
			},
		});
		const callerPromise = createDeferredPromise<Message | void>();
		const attachment = transaction.attach(
			callerPromise,
			options.onProgress,
			options.onTXReport,
		);

		// Configure its options
		if (options.changeNodeStatusOnMissingACK != undefined) {
			transaction.changeNodeStatusOnTimeout =
				options.changeNodeStatusOnMissingACK;
		}
		if (options.pauseSendThread === true) {
			transaction.pauseSendThread = true;
		}
		transaction.requestWakeUpOnDemand = !!options.requestWakeUpOnDemand;
		transaction.requestStatusUpdates =
			"requestStatusUpdates" in options
			&& options.requestStatusUpdates === true;
		transaction.tag = options.tag;

		// Notify callers that the command was queued. If enqueueTransaction() ands up
		// attaching the command to an active transaction, the callers will immediately
		// receive the `Active` progress update.
		transaction.setProgress({ state: TransactionState.Queued });
		this.enqueueTransaction(transaction);

		// If the transaction should expire, start the timeout
		let expirationTimeout: Timer | undefined;
		if (options.expire) {
			expirationTimeout = setTimer(() => {
				const error = new ZWaveError(
					"The message has expired",
					ZWaveErrorCodes.Controller_MessageExpired,
					undefined,
					transaction.stack,
				);
				if (attachment.detach(error)) {
					// Nobody waits for the transmission anymore, cancel it
					void this.reduceQueues((t, _source) => {
						if (!attachment.sharesLifecycleWith(t)) {
							return { type: "keep" };
						}
						return {
							type: "reject",
							message: error.message,
							code: ZWaveErrorCodes.Controller_MessageExpired,
						};
					});
				}
			}, options.expire).unref();
		}

		try {
			const result = (await callerPromise) as TResponse;

			// If this was a successful non-nonce message to a sleeping node, make sure it goes to sleep again
			let maybeSendToSleep: boolean;
			if (isSendData(msg)) {
				// For SendData messages, make sure the message is not a nonce
				maybeSendToSleep =
					options.priority !== MessagePriority.Immediate
					// And that the result is either a response from the node
					// or a transmit report indicating success
					&& result
					&& (result.functionType
						=== FunctionType.BridgeApplicationCommand
						|| result.functionType
							=== FunctionType.ApplicationCommand
						|| (isSendDataTransmitReport(result) && result.isOK()));
			} else {
				// For other messages to the node, just check for successful completion. If the callback is not OK,
				// we might not be able to communicate with the node. Sending another message is not a good idea.
				maybeSendToSleep =
					hasNodeId(msg)
					&& result
					&& isSuccessIndicator(result)
					&& result.isOK();
			}

			if (maybeSendToSleep && node && node.canSleep && !node.keepAwake) {
				setImmediate(() => this.debounceSendNodeToSleep(node));
			}

			return result;
		} catch (e) {
			if (isZWaveError(e)) {
				if (
					// If a controller command failed (that is not SendData), pass the response/callback through
					(e.code === ZWaveErrorCodes.Controller_ResponseNOK
						|| e.code === ZWaveErrorCodes.Controller_CallbackNOK)
					&& e.context instanceof Message
					// We need to check the function type here because context can be the transmit reports
					&& e.context.functionType !== FunctionType.SendData
					&& e.context.functionType !== FunctionType.SendDataMulticast
					&& e.context.functionType !== FunctionType.SendDataBridge
					&& e.context.functionType
						!== FunctionType.SendDataMulticastBridge
				) {
					this._controller?.incrementStatistics("messagesDroppedTX");
					return e.context as TResponse;
				}
				// Enrich errors with the transaction's stack instead of the internal stack
				if (!e.transactionSource) {
					throw new ZWaveError(
						e.message,
						e.code,
						e.context,
						transaction.stack,
					);
				}
			}
			throw e;
		} finally {
			// The transaction was handled, so it can no longer expire
			expirationTimeout?.clear();
		}
	}

	/** Wraps a CC in the correct SendData message to use for sending */
	public createSendDataMessage(
		command: CommandClass,
		options: Omit<SendCommandOptions, keyof SendMessageOptions> = {},
	): SendDataMessage & ContainsCC {
		// Automatically encapsulate commands before sending
		if (options.autoEncapsulate !== false) {
			command = this.encapsulateCommands(command, options);
		}

		let msg: SendDataMessage;
		if (command.isSinglecast() || command.isBroadcast()) {
			if (
				this.controller.isFunctionSupported(FunctionType.SendDataBridge)
			) {
				// Prioritize Bridge commands when they are supported
				msg = new SendDataBridgeRequest({
					sourceNodeId: this.ownNodeId,
					command,
					maxSendAttempts: this._options.attempts.sendData,
				});
			} else {
				msg = new SendDataRequest({
					command,
					maxSendAttempts: this._options.attempts.sendData,
				});
			}
		} else if (command.isMulticast()) {
			if (
				this.controller.isFunctionSupported(
					FunctionType.SendDataMulticastBridge,
				)
			) {
				// Prioritize Bridge commands when they are supported
				msg = new SendDataMulticastBridgeRequest({
					sourceNodeId: this.ownNodeId,
					command,
					maxSendAttempts: this._options.attempts.sendData,
				});
			} else {
				msg = new SendDataMulticastRequest({
					command,
					maxSendAttempts: this._options.attempts.sendData,
				});
			}
		} else {
			throw new ZWaveError(
				`A CC must either be singlecast or multicast`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		// Specify the number of send attempts for the request
		if (options.maxSendAttempts != undefined) {
			msg.maxSendAttempts = options.maxSendAttempts;
		}

		// Specify transmit options for the request
		if (options.transmitOptions != undefined) {
			msg.transmitOptions = options.transmitOptions;
		}

		if (!!options.reportTimeoutMs) {
			msg.nodeUpdateTimeout = options.reportTimeoutMs;
		}

		if (options.ignoreNodeUpdate) {
			msg.ignoreNodeUpdate = true;
		}

		return msg as SendDataMessage & ContainsCC;
	}

	/**
	 * Sends a command to a Z-Wave node. If the node returns a command in response, that command will be the return value.
	 * If the command expects no response **or** the response times out, nothing will be returned
	 * @param command The command to send. It will be encapsulated in a SendData[Multicast]Request.
	 * @param options (optional) Options regarding the message transmission
	 */
	private async sendCommandInternal<TResponse extends CCId = CCId>(
		command: CommandClass,
		options: Omit<
			SendCommandOptions,
			"requestStatusUpdates" | "onUpdate"
		> = {},
	): Promise<TResponse | undefined> {
		const msg = this.createSendDataMessage(command, options);
		try {
			const resp = await this.sendMessage(msg, options);

			// And unwrap the response if there was any
			if (containsCC(resp)) {
				this.unwrapCommands(resp);
				return resp.command as unknown as TResponse;
			}
		} catch (e) {
			// A timeout always has to be expected. In this case return nothing.
			if (
				isZWaveError(e)
				&& e.code === ZWaveErrorCodes.Controller_NodeTimeout
			) {
				if (command.isSinglecast()) {
					this.controllerLog.logNode(
						command.nodeId,
						e.message,
						"warn",
					);
				}
			} else {
				// We don't want to swallow any other errors
				throw e;
			}
		}
	}

	/**
	 * Sends a supervised command to a Z-Wave node. When status updates are requested, the passed callback will be executed for every non-final update.
	 * @param command The command to send
	 * @param options (optional) Options regarding the message transmission
	 */
	private async sendSupervisedCommand(
		command: SinglecastCC<CommandClass>,
		options: SendCommandOptions & { useSupervision?: "auto" } = {
			requestStatusUpdates: false,
		},
	): Promise<SupervisionResult | undefined> {
		// Create the encapsulating CC so we have a session ID
		const sessionId = this.getNextSupervisionSessionId(command.nodeId);
		command = SupervisionCC.encapsulate(
			command,
			sessionId,
			options.requestStatusUpdates,
		);

		const resp = await this.sendCommandInternal<SupervisionCCReport>(
			command,
			options,
		);
		if (!resp) return;

		// If future updates are expected, listen for them
		if (options.requestStatusUpdates && resp.moreUpdatesFollow) {
			this.ensureNodeSessions(command.nodeId).supervision.set(
				(command as SupervisionCCGet).sessionId,
				options.onUpdate,
			);
		}
		// In any case, return the status
		return resp.toSupervisionResult();
	}

	/**
	 * Sends a command to a Z-Wave node. The return value depends on several factors:
	 * * If the node returns a command in response, that command will be the return value.
	 * * If the command is a SET-type command and Supervision CC can and should be used, a {@link SupervisionResult} will be returned.
	 * * If the command expects no response **or** the response times out, nothing will be returned.
	 *
	 * @param command The command to send. It will be encapsulated in a SendData[Multicast]Request.
	 * @param options (optional) Options regarding the message transmission
	 */
	public async sendCommand<TResponse extends CCId | undefined = undefined>(
		command: CommandClass,
		options?: SendCommandOptions,
	): Promise<SendCommandReturnType<TResponse>> {
		if (options?.encapsulationFlags != undefined) {
			command.encapsulationFlags = options.encapsulationFlags;
		}

		// Use security encapsulation for CCs that are only supported securely, and multicast commands
		if (
			this.isCCSecure(
				command.ccId,
				command.nodeId as number,
				command.endpointIndex,
			)
			|| options?.s2MulticastGroupId != undefined
		) {
			command.toggleEncapsulationFlag(EncapsulationFlags.Security, true);
		}

		// Only use supervision if...
		if (
			// ... not disabled
			options?.useSupervision !== false
			// ... and it is legal for the command
			&& SupervisionCC.mayUseSupervision(this, command)
		) {
			const result = await this.sendSupervisedCommand(command, options);
			if (result?.status !== SupervisionStatus.NoSupport) {
				// @ts-expect-error TS doesn't know we've narrowed the return type to match
				return result;
			}

			// The node should support supervision but it doesn't for this command. Remember this
			SupervisionCC.setCCSupportedWithSupervision(
				this,
				command.getEndpoint(this)!,
				command.ccId,
				false,
			);
			// And retry the command without supervision
		}

		// Fall back to non-supervised commands
		const result = await this.sendCommandInternal(command, options);

		// ApplicationStatusCCRejectedRequest is treated like a SupervisionReport with Fail status
		if (result instanceof ApplicationStatusCCRejectedRequest) {
			// @ts-expect-error TS doesn't know we've narrowed the return type to match
			return {
				status: SupervisionStatus.Fail,
				remainingDuration: undefined,
			};
		}

		// When sending S2 multicast commands to supporting nodes, the singlecast followups
		// may use supervision. In this case, the multicast message generator returns a
		// synthetic SupervisionCCReport.
		// sendCommand is supposed to return a SupervisionResult though.
		if (
			options?.s2MulticastGroupId != undefined
			&& result instanceof SupervisionCCReport
		) {
			// @ts-expect-error TS doesn't know we've narrowed the return type to match
			return result.toSupervisionResult();
		}

		// @ts-expect-error TS doesn't know we've narrowed the return type to match
		return result;
	}

	/** @internal */
	public async sendZWaveProtocolCC(
		command: ZWaveProtocolCC,
		options: Pick<
			SendCommandOptions,
			"changeNodeStatusOnMissingACK" | "maxSendAttempts"
		> = {},
	): Promise<void> {
		await this.sendCommandInternal(command, {
			priority: MessagePriority.Controller,
			// No shenanigans, just send the raw command
			autoEncapsulate: false,
			useSupervision: false,
			changeNodeStatusOnMissingACK:
				options.changeNodeStatusOnMissingACK ?? false,
			maxSendAttempts: options.maxSendAttempts || 1,
			transmitOptions: TransmitOptions.AutoRoute | TransmitOptions.ACK,
		});
	}

	private async abortSendData(): Promise<void> {
		try {
			const abort = new SendDataAbort();
			await this.writeSerial(
				await abort.serialize(this.getEncodingContext()),
			);
			this.driverLog.logMessage(abort, {
				direction: "outbound",
			});

			// We're bypassing the serial API machine, so we need to wait for the ACK ourselves
			// This could also cause a NAK or CAN, but we don't really care
			await this.waitForMessageHeader(() => true, 500).catch(noop);
		} catch {
			// ignore
		}
	}

	/**
	 * Sends a low-level message like ACK, NAK or CAN immediately
	 * @param header The low-level message to send
	 */
	private writeHeader(header: MessageHeaders): Promise<void> {
		// ACK, CAN, NAK
		return this.writeSerial(Uint8Array.from([header]));
	}

	/** Sends a raw datagram to the serialport (if that is open) */
	private async writeSerial(data: BytesView): Promise<void> {
		return this.serial?.writeAsync(data);
	}

	public waitForMessageHeader<T extends MessageHeaders>(
		predicate: (header: MessageHeaders) => header is T,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<T>;

	public waitForMessageHeader(
		predicate: (header: MessageHeaders) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<MessageHeaders>;

	/**
	 * Waits until a matching message header is received or an optional timeout has elapsed. Returns the received message.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param predicate A predicate function to test all incoming message headers.
	 */
	public waitForMessageHeader(
		predicate: (header: MessageHeaders) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<MessageHeaders> {
		return new Promise<MessageHeaders>((resolve, reject) => {
			const promise = createDeferredPromise<MessageHeaders>();
			const entry: AwaitedMessageHeader = {
				predicate,
				handler: (msg) => promise.resolve(msg),
				timeout: undefined,
			};
			this.awaitedMessageHeaders.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedMessageHeaders.indexOf(entry);
				if (index !== -1) this.awaitedMessageHeaders.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`Received no matching serial frame within the provided timeout!`,
							ZWaveErrorCodes.Controller_Timeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((cc) => {
				removeEntry();
				resolve(cc);
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	public waitForMessage<T extends Message>(
		predicate: (msg: Message) => msg is T,
		timeout?: number,
		refreshPredicate?: (msg: Message) => boolean,
		abortSignal?: AbortSignal,
	): Promise<T>;

	public waitForMessage<T extends Message>(
		predicate: (msg: Message) => boolean,
		timeout?: number,
		refreshPredicate?: (msg: Message) => boolean,
		abortSignal?: AbortSignal,
	): Promise<T>;

	/**
	 * Waits until an unsolicited serial message is received or an optional timeout has elapsed. Returns the received message.
	 *
	 * **Note:** To wait for a certain CommandClass, better use {@link waitForCommand}.
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected.
	 * @param predicate A predicate function to test all incoming messages.
	 * @param refreshPredicate A predicate function to test partial messages. If this returns `true` for a message, the timer will be restarted.
	 */
	public waitForMessage<T extends Message>(
		predicate: (msg: Message) => boolean,
		timeout?: number,
		refreshPredicate?: (msg: Message) => boolean,
		abortSignal?: AbortSignal,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const promise = createDeferredPromise<Message>();
			const entry: AwaitedMessageEntry = {
				predicate,
				refreshPredicate,
				handler: (msg) => promise.resolve(msg),
				timeout: undefined,
			};
			this.awaitedMessages.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedMessages.indexOf(entry);
				if (index !== -1) this.awaitedMessages.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`Received no matching message within the provided timeout!`,
							ZWaveErrorCodes.Controller_Timeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((cc) => {
				removeEntry();
				resolve(cc as T);
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	public waitForCommand<T extends CCId, U extends T>(
		predicate: (cc: CCId) => cc is U,
		timeout?: number,
		abortSignal?: AbortSignal,
		options?: WaitForCommandOptions,
	): Promise<U>;

	public waitForCommand<T extends CCId>(
		predicate: (cc: CCId) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
		options?: WaitForCommandOptions,
	): Promise<T>;

	/**
	 * Waits until a CommandClass is received or an optional timeout has elapsed. Returns the received command.
	 * @param predicate A predicate function to test all incoming command classes
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param abortSignal An optional abort signal to cancel the wait
	 */
	public waitForCommand<T extends CCId>(
		predicate: (cc: CCId) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
		options?: WaitForCommandOptions,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const promise = createDeferredPromise<CCId>();
			const entry: AwaitedCommandEntry = {
				predicate,
				handler: (cc) => promise.resolve(cc),
				timeout: undefined,
				consume: options?.consume,
			};
			this.awaitedCommands.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedCommands.indexOf(entry);
				if (index !== -1) this.awaitedCommands.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`Received no matching command within the provided timeout!`,
							ZWaveErrorCodes.Controller_NodeTimeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((cc) => {
				removeEntry();
				resolve(cc as T);
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	/**
	 * Waits until the driver queues become idle or an optional timeout has elapsed.
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param abortSignal An optional abort signal to cancel the wait
	 */
	public waitForIdle(
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// If the queues are already idle, resolve immediately
			if (this.queueIdle) {
				resolve();
				return;
			}

			const promise = createDeferredPromise<void>();
			const entry: AwaitedIdleEntry = {
				handler: () => promise.resolve(),
				timeout: undefined,
			};
			this.awaitedIdle.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedIdle.indexOf(entry);
				if (index !== -1) this.awaitedIdle.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`The queues did not become idle within the provided timeout!`,
							ZWaveErrorCodes.Controller_NodeTimeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then(() => {
				removeEntry();
				resolve();
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	/**
	 * Calls the given handler function every time a CommandClass is received that matches the given predicate.
	 * @param predicate A predicate function to test all incoming command classes
	 */
	public registerCommandHandler(
		predicate: (cc: CCId) => boolean,
		handler: (cc: CCId) => void,
	): {
		unregister: () => void;
	} {
		const entry: AwaitedCommandEntry = {
			predicate,
			handler: (cc) => handler(cc),
			timeout: undefined,
		};
		this.awaitedCommands.push(entry);
		const removeEntry = () => {
			entry.timeout?.clear();
			const index = this.awaitedCommands.indexOf(entry);
			if (index !== -1) this.awaitedCommands.splice(index, 1);
		};

		return {
			unregister: removeEntry,
		};
	}

	private handleFailedTransaction(
		transaction: Transaction,
		error: ZWaveError,
	): void {
		// If a node failed to respond in time, it might be sleeping
		if (this.isMissingNodeACK(transaction, error)) {
			if (this.handleMissingNodeACK(transaction as any, error)) return;
		} else if (isMissingControllerACK(error)) {
			if (this.handleMissingControllerACK(transaction, error)) return;
		} else if (
			// 700/800 series controllers can be jammed due to a bug,
			// which a soft-reset is supposed to work around
			isSendData(transaction.message)
			&& this.controller.status === ControllerStatus.Jammed
		) {
			if (this.handleJammedController(transaction, error)) return;
		} else if (
			isSendData(transaction.message)
			&& (isMissingControllerResponse(error)
				|| isMissingControllerCallback(error))
		) {
			if (
				this.handleMissingSendDataResponseOrCallback(transaction, error)
			)
				return;
		} else if (isNodeBusyError(error)) {
			if (this.handleNodeBusy(transaction, error.context)) return;
		} else if (wasControllerReset(error)) {
			// The controller was reset in the middle of a transaction.
			// Re-queue the transaction, so it can get handled again
			// Its message generator may have finished, so reset that too.
			transaction.reset();
			this.getQueueForTransaction(transaction).add(transaction.clone());
			return;
		}

		this.rejectTransaction(transaction, error);
	}

	private handleNodeBusy(
		transaction: Transaction,
		command: ApplicationStatusCCBusy,
	): boolean {
		transaction.busyAttempts++;
		if (transaction.busyAttempts >= this.options.attempts.sendData) {
			return false;
		}
		const node = this.tryGetNode(transaction.message);
		if (!node) return false;

		void handleApplicationBusy(this, this, node, command, transaction);
		return true;
	}

	private rejectTransaction(
		transaction: Transaction,
		error: ZWaveError,
	): void {
		transaction.abort(error);
	}

	private resolveTransaction(
		transaction: Transaction,
		result?: Message,
	): void {
		transaction.abort(result);
	}

	/** Checks if a message is allowed to go into the wakeup queue */
	private mayMoveToWakeupQueue(transaction: Transaction): boolean {
		const msg = transaction.message;
		switch (true) {
			// Pings, nonces and Supervision Reports will block the send queue until wakeup, so they must be dropped
			case messageIsPing(msg):
			case transaction.priority === MessagePriority.Immediate:
			// We also don't want to immediately send the node to sleep when it wakes up
			case containsCC(msg)
				&& msg.command instanceof WakeUpCCNoMoreInformation:
			// compat queries because they will be recreated when the node wakes up
			case transaction.tag === "compat":
				return false;
		}

		return true;
	}

	/** Moves all messages for a given node into the wakeup queue */
	private moveMessagesToWakeupQueue(nodeId: number): void {
		const reject: TransactionReducerResult = {
			type: "reject",
			message: `The node is asleep`,
			code: ZWaveErrorCodes.Controller_MessageDropped,
		};
		const requeue: TransactionReducerResult = {
			type: "requeue",
			priority: MessagePriority.WakeUp,
			// Reset the transaction so it doesn't simply resolve to `undefined` when we attempt to continue it
			reset: true,
		};
		void this.reduceQueues((transaction, _source) => {
			const msg = transaction.message;
			if (msg.getNodeId() !== nodeId) return { type: "keep" };
			// Drop all messages that are not allowed in the wakeup queue
			// For all other messages, change the priority to wakeup
			return this.mayMoveToWakeupQueue(transaction) ? requeue : reject;
		});
	}

	/**
	 * @internal
	 * Rejects all pending transactions that match a predicate and removes them from the send queue
	 */
	public rejectTransactions(
		predicate: (t: Transaction) => boolean,
		errorMsg: string = `The message has been removed from the queue`,
		errorCode: ZWaveErrorCodes = ZWaveErrorCodes.Controller_MessageDropped,
	): Promise<void> {
		return this.reduceQueues((transaction, _source) => {
			if (predicate(transaction)) {
				return {
					type: "reject",
					message: errorMsg,
					code: errorCode,
				};
			} else {
				return { type: "keep" };
			}
		});
	}

	/**
	 * @internal
	 * Rejects all pending transactions for a node and removes them from the send queue
	 */
	public rejectAllTransactionsForNode(
		nodeId: number,
		errorMsg: string = `The node is dead`,
		errorCode: ZWaveErrorCodes = ZWaveErrorCodes.Controller_MessageDropped,
	): Promise<void> {
		return this.rejectTransactions(
			(t) => t.message.getNodeId() === nodeId,
			errorMsg,
			errorCode,
		);
	}

	/**
	 * @internal
	 * Re-queues all pending transactions for a node after a delay
	 * @param failedTransaction A finished transaction to re-queue first
	 */
	public async delayTransactionsForNode(
		nodeId: number,
		delaySeconds: number,
		failedTransaction?: Transaction,
	): Promise<void> {
		const requeue: Transaction[] = [];
		if (failedTransaction) requeue.push(failedTransaction);

		await this.reduceQueues((transaction, source) => {
			// Only handle transactions for this node that are still queued (not currently active)
			if (
				transaction.message.getNodeId() === nodeId
				&& source === "queue"
			) {
				requeue.push(transaction);
				return { type: "defer" };
			}
			return { type: "keep" };
		});

		if (requeue.length > 0) {
			if (!this.requeueTimers.has(nodeId)) {
				this.requeueTimers.set(nodeId, new Set());
			}
			const timerSet = this.requeueTimers.get(nodeId)!;
			let batch: DeferredTransactionBatch;
			const timer = setTimer(() => {
				timerSet.delete(batch);
				if (timerSet.size === 0) {
					this.requeueTimers.delete(nodeId);
				}
				// Clone the transactions immediately before queuing them.
				// A newer superseding command may have removed some transactions in the meantime.
				const requeued = batch.transactions.map((t) => t.clone());
				for (const t of requeued) {
					this.getQueueForTransaction(t).add(t);
				}
			}, delaySeconds * 1000).unref();
			batch = { timer, transactions: requeue };
			timerSet.add(batch);
		}
	}

	private clearDeferredTransactions(
		nodeId: number | undefined,
		reason: string,
		errorCode: ZWaveErrorCodes,
	): void {
		const entries =
			nodeId == undefined
				? [...this.requeueTimers.entries()]
				: [[nodeId, this.requeueTimers.get(nodeId)] as const];
		for (const [entryNodeId, batches] of entries) {
			if (!batches) continue;
			for (const batch of batches) {
				batch.timer.clear();
				for (const transaction of batch.transactions) {
					this.rejectTransaction(
						transaction,
						new ZWaveError(
							reason,
							errorCode,
							undefined,
							transaction.stack,
						),
					);
				}
			}
			this.requeueTimers.delete(entryNodeId);
		}
	}

	/**
	 * Pauses the send queue, avoiding commands to be sent to the controller
	 */
	private pauseSendQueue(): void {
		this.queuePaused = true;
	}

	/**
	 * Unpauses the send queue, allowing commands to be sent to the controller again
	 */
	private unpauseSendQueue(): void {
		this.queuePaused = false;
		this.triggerQueues();
	}

	private reduceQueues(reducer: TransactionReducer): Promise<void> {
		// This function MUST not be async, because this can introduce a
		// race condition caused by the microtick delay
		return Promise.all(
			this.queues.map((queue) => this.reduceQueue(queue, reducer)),
		).then(noop);
	}

	private reduceQueue(
		queue: TransactionQueue,
		reducer: TransactionReducer,
	): Promise<void> {
		const dropQueued: Transaction[] = [];
		let stopActive: Transaction | undefined;
		const requeue: Transaction[] = [];

		const reduceTransaction: (
			...args: Parameters<TransactionReducer>
		) => void = (transaction, source) => {
			const reducerResult = reducer(transaction, source);
			switch (reducerResult.type) {
				case "defer":
					if (source === "queue") {
						dropQueued.push(transaction);
					} else {
						stopActive = transaction;
					}
					break;
				case "requeue":
					if (reducerResult.priority != undefined) {
						transaction.priority = reducerResult.priority;
					}
					if (reducerResult.tag != undefined) {
						transaction.tag = reducerResult.tag;
					}
					if (reducerResult.reset) {
						transaction.reset();
					}
					if (source === "active") stopActive = transaction;
					requeue.push(transaction);
					break;
				case "resolve":
					this.resolveTransaction(transaction, reducerResult.message);
					if (source === "queue") {
						dropQueued.push(transaction);
					} else {
						stopActive = transaction;
					}
					break;
				case "reject":
					this.rejectTransaction(
						transaction,
						new ZWaveError(
							reducerResult.message,
							reducerResult.code,
							undefined,
							transaction.stack,
						),
					);
					if (source === "queue") {
						dropQueued.push(transaction);
					} else {
						stopActive = transaction;
					}
					break;
			}
		};

		for (const transaction of queue.transactions) {
			reduceTransaction(transaction, "queue");
		}

		if (queue.currentTransaction) {
			reduceTransaction(queue.currentTransaction, "active");
		}

		// Now we know what to do with the transactions
		queue.remove(...dropQueued, ...requeue);
		const requeued = requeue.map((t) => t.clone());
		queue.add(...requeued);

		// Notify listeners about re-queued transactions
		for (const t of requeued) {
			t.setProgress({ state: TransactionState.Queued });
		}

		// Abort ongoing SendData messages that should be dropped
		if (isSendData(stopActive?.message)) {
			return this.abortSendData();
		}
		return Promise.resolve();
	}

	/** @internal */
	public resolvePendingPings(nodeId: number): void {
		// When a previously sleeping node sends a NIF after a ping was sent to it, but not acknowledged yet,
		// the node is awake, but the ping would fail. Resolve pending pings, so communication can continue.
		for (const { currentTransaction } of this.queues) {
			if (!currentTransaction) continue;
			const msg = currentTransaction.parts.current;
			if (!!msg && messageIsPing(msg) && msg.getNodeId() === nodeId) {
				// The pending transaction is a ping. Short-circuit its message generator by throwing something that's not an error
				currentTransaction.abort(undefined);
			}
		}
	}

	/**
	 * @internal
	 * Helper function to read and convert potentially existing values from the network cache
	 */
	public cacheGet<T>(
		cacheKey: string,
		options?: {
			reviver?: (value: any) => T;
		},
	): T | undefined {
		let ret = this.networkCache.get(cacheKey);
		if (ret !== undefined && typeof options?.reviver === "function") {
			try {
				ret = options.reviver(ret);
			} catch {
				// ignore, invalid entry
			}
		}
		return ret;
	}

	/**
	 * @internal
	 * Helper function to convert values and write them to the network cache
	 */
	public cacheSet<T>(
		cacheKey: string,
		value: T | undefined,
		options?: {
			serializer?: (value: T) => any;
		},
	): void {
		if (value !== undefined && typeof options?.serializer === "function") {
			value = options.serializer(value);
		}

		if (value === undefined) {
			this.networkCache.delete(cacheKey);
		} else {
			this.networkCache.set(cacheKey, value);
		}
	}

	/**
	 * @internal
	 * Helper function to find multiple existing values from the network cache
	 */
	public cacheList<T>(
		prefix: string,
		options?: {
			reviver?: (value: any) => T;
		},
	): Record<string, T> {
		const ret: Record<string, T> = {};
		for (const entry of this.networkCache.entries()) {
			const key = entry[0];
			if (!key.startsWith(prefix)) continue;
			let value = entry[1];
			if (value === undefined) continue;
			if (typeof options?.reviver === "function") {
				try {
					value = options.reviver(value);
				} catch {
					// invalid entry
					continue;
				}
			}
			ret[key] = value;
		}
		return ret;
	}

	private cachePurge(
		prefix: string,
		except?: (key: string) => boolean,
	): void {
		for (const key of this.networkCache.keys()) {
			if (key.startsWith(prefix) && !except?.(key)) {
				this.networkCache.delete(key);
			}
		}
	}

	/**
	 * Restores a previously stored Z-Wave network state from cache to speed up the startup process
	 */
	public async restoreNetworkStructureFromCache(): Promise<void> {
		if (
			!this._controller
			|| !this.controller.homeId
			|| !this._networkCache
		) {
			return;
		}

		if (this._networkCache.size <= 1) {
			// If the size is 0 or 1, the cache is empty, so we cannot restore it
			return;
		}

		try {
			this.driverLog.print(
				`Cache file for homeId ${num2hex(
					this.controller.homeId,
				)} found, attempting to restore the network from cache...`,
			);
			await this.controller.deserialize();
			this.driverLog.print(
				`Restoring the network from cache was successful!`,
			);
		} catch (e) {
			const message = `Restoring the network from cache failed: ${getErrorMessage(
				e,
				true,
			)}`;
			this.emit(
				"error",
				new ZWaveError(message, ZWaveErrorCodes.Driver_InvalidCache),
			);
			this.driverLog.print(message, "error");
		}
	}

	private sendNodeToSleepTimers = new Map<number, Timer>();
	/**
	 * @internal
	 * Marks a node for a later sleep command. Every call refreshes the period until the node actually goes to sleep
	 */
	public debounceSendNodeToSleep(
		node: ZWaveNodeBase & NodeSchedulePoll & NodeValues & NodeWakeup,
	): void {
		// TODO: This should be a single command to the send thread
		// Delete old timers if any exist
		if (this.sendNodeToSleepTimers.has(node.id)) {
			this.sendNodeToSleepTimers.get(node.id)?.clear();
		}

		// Sends a node to sleep if it has no more messages.
		const sendNodeToSleep = (
			node: ZWaveNodeBase & NodeSchedulePoll & NodeValues & NodeWakeup,
		): void => {
			this.sendNodeToSleepTimers.delete(node.id);
			if (!this.hasPendingMessages(node)) {
				void node.sendNoMoreInformation().catch(() => {
					/* ignore errors */
				});
			} else {
				// There are still pending messages. Retry in a bit,
				// in case the remaining transactions don't trigger
				// debounceSendNodeToSleep when they complete.
				this.debounceSendNodeToSleep(node);
			}
		};

		// If a sleeping node supports the Wake Up CC, we may send it back to sleep
		if (node.supportsCC(CommandClasses["Wake Up"])) {
			const wakeUpInterval = node.getValue<number>(
				WakeUpCCValues.wakeUpInterval.id,
			);
			// GH#2179: when a device only wakes up manually, don't send it back to sleep
			// Best case, the user wanted to interact with it.
			// Worst case, the device won't ACK this and cause a delay
			if (wakeUpInterval !== 0) {
				this.sendNodeToSleepTimers.set(
					node.id,
					setTimer(
						() => sendNodeToSleep(node),
						this.options.timeouts.sendToSleep,
					).unref(),
				);
			}
		}
	}

	/** Computes the maximum net CC payload size for the given CC or SendDataRequest */
	public computeNetCCPayloadSize(
		commandOrMsg:
			| CommandClass
			| ((SendDataRequest | SendDataBridgeRequest) & ContainsCC),
		ignoreEncapsulation: boolean = false,
	): number {
		// Recreate the correct encapsulation structure
		let msg: (SendDataRequest | SendDataBridgeRequest) & ContainsCC;
		if (isSendDataSinglecast(commandOrMsg)) {
			msg = commandOrMsg;
		} else {
			const SendDataConstructor = this.getSendDataSinglecastConstructor();
			msg = new SendDataConstructor({
				sourceNodeId: this.ownNodeId,
				command: commandOrMsg,
			}) as (SendDataRequest | SendDataBridgeRequest) & ContainsCC;
		}
		if (!ignoreEncapsulation) {
			msg.command = this.encapsulateCommands(
				msg.command,
			) as SinglecastCC<CommandClass>;
		}
		return msg.command.getMaxPayloadLength(this.getMaxPayloadLength(msg));
	}

	/** Computes the maximum payload size that can be transmitted with the given message */
	public getMaxPayloadLength(msg: SendDataMessage): number {
		const nodeId = msg.getNodeId();

		// For ZWLR, the result is simply the maximum payload size
		if (
			nodeId != undefined
			&& isLongRangeNodeId(nodeId)
			&& this._controller?.maxPayloadSizeLR
		) {
			return this._controller.maxPayloadSizeLR;
		}

		// For ZW Classic, it depends on the frame type and transmit options
		const maxExplorerPayloadSinglecast =
			this._controller?.maxPayloadSize ?? 46;
		if (isSendDataSinglecast(msg)) {
			// From INS13954-7, chapter 4.3.3.1.5
			if (msg.transmitOptions & TransmitOptions.Explore) {
				return maxExplorerPayloadSinglecast;
			}
			if (msg.transmitOptions & TransmitOptions.AutoRoute) {
				return maxExplorerPayloadSinglecast + 2;
			}
			return maxExplorerPayloadSinglecast + 8;
		} else {
			// Multicast needs space for the nodes bitmask
			const maxExplorerPayloadMulticast =
				maxExplorerPayloadSinglecast - NUM_NODEMASK_BYTES;

			// From INS13954-13, chapter 4.3.3.6
			if (msg.transmitOptions & TransmitOptions.ACK) {
				if (msg.transmitOptions & TransmitOptions.Explore) {
					return maxExplorerPayloadMulticast;
				}
				if (msg.transmitOptions & TransmitOptions.AutoRoute) {
					return maxExplorerPayloadMulticast + 2;
				}
			}
			return maxExplorerPayloadMulticast + 8;
		}
	}

	public async exceedsMaxPayloadLength(
		msg: SendDataMessage,
	): Promise<boolean> {
		const serializedCC = await msg.serializeCC(this.getEncodingContext());
		return serializedCC.length > this.getMaxPayloadLength(msg);
	}

	/** Determines time in milliseconds to wait for a report from a node */
	public getReportTimeout(msg: Message): number {
		const node = this.tryGetNode(msg);

		return (
			// If there's a message-specific timeout, use that
			msg.nodeUpdateTimeout
			// If the node has a compat flag to override the timeout, use that
			?? node?.deviceConfig?.compat?.reportTimeout
			// otherwise use the driver option
			?? this._options.timeouts.report
		);
	}

	/** Returns the preferred constructor to use for singlecast SendData commands */
	public getSendDataSinglecastConstructor():
		| typeof SendDataRequest
		| typeof SendDataBridgeRequest {
		return this._controller?.isFunctionSupported(
			FunctionType.SendDataBridge,
		)
			? SendDataBridgeRequest
			: SendDataRequest;
	}

	/** Returns the preferred constructor to use for multicast SendData commands */
	public getSendDataMulticastConstructor():
		| typeof SendDataMulticastRequest
		| typeof SendDataMulticastBridgeRequest {
		return this._controller?.isFunctionSupported(
			FunctionType.SendDataMulticastBridge,
		)
			? SendDataMulticastBridgeRequest
			: SendDataMulticastRequest;
	}

	/**
	 * Checks whether there is a compatible update for the currently installed config package.
	 * Returns the new version if there is an update, `undefined` otherwise.
	 */
	public async checkForConfigUpdates(
		silent: boolean = false,
	): Promise<string | undefined> {
		this.ensureReady();

		try {
			if (!silent) {
				this.driverLog.print("Checking for configuration updates...");
			}
			const ret = await checkForConfigUpdates(this.configVersion);
			if (ret) {
				if (!silent) {
					this.driverLog.print(
						`Configuration update available: ${ret}`,
					);
				}
			} else {
				if (!silent) {
					this.driverLog.print(
						"No configuration update available...",
					);
				}
			}
			return ret;
		} catch (e) {
			this.driverLog.print(getErrorMessage(e), "error");
		}
	}

	private _installConfigUpdatePromise: Promise<boolean> | undefined;

	/**
	 * Installs an update for the embedded configuration DB if there is a compatible one.
	 * Returns `true` when an update was installed, `false` otherwise.
	 *
	 * **Note:** Bugfixes and changes to device configuration generally require a restart or re-interview to take effect.
	 */
	public async installConfigUpdate(): Promise<boolean> {
		this.ensureReady();

		if (this._installConfigUpdatePromise) {
			return this._installConfigUpdatePromise;
		}
		this._installConfigUpdatePromise = this.installConfigUpdateInternal();

		try {
			return await this._installConfigUpdatePromise;
		} finally {
			this._installConfigUpdatePromise = undefined;
		}
	}

	private async installConfigUpdateInternal(): Promise<boolean> {
		const newVersion = await this.checkForConfigUpdates(true);
		if (!newVersion) return false;

		const extConfigDir = this.configManager.externalConfigDir;
		if (!this.configManager.useExternalConfig || !extConfigDir) {
			this.driverLog.print(
				`Cannot update configuration DB update - external config directory is not set`,
				"error",
			);
			return false;
		}

		this.driverLog.print(
			`Installing version ${newVersion} of configuration DB...`,
		);
		try {
			await installConfigUpdate(this.bindings.fs, newVersion, {
				configDir: extConfigDir,
			});
		} catch (e) {
			this.driverLog.print(getErrorMessage(e), "error");
			return false;
		}
		this.driverLog.print(
			`Configuration DB updated to version ${newVersion}, activating...`,
		);

		// Reload the config files
		await this.configManager.loadAll();

		// Now try to apply them to all known devices
		if (this._controller) {
			for (const node of this._controller.nodes.values()) {
				if (node.ready) await node["loadDeviceConfig"]();
			}
		}

		return true;
	}

	// region OTW Firmware Updates

	/**
	 * Returns whether a firmware update is in progress for the Z-Wave module.
	 */
	public isOTWFirmwareUpdateInProgress(): boolean {
		return !!this._scheduler.findTask(
			(t) => t.tag?.id === "firmware-update-otw",
		);
	}

	/**
	 * Updates the firmware of the controller using the given firmware file.
	 * The file can be provided as binary data or as a {@link FirmwareUpdateInfo} object as returned
	 * from the firmware update service. The latter will be downloaded automatically.
	 *
	 * The return value indicates whether the update was successful.
	 * **WARNING:** After a successful update, the Z-Wave driver will destroy itself so it can be restarted.
	 *
	 * **WARNING:** A failure during this process may put your controller in recovery mode, rendering it unusable until a correct firmware image is uploaded. Use at your own risk!
	 */
	public async firmwareUpdateOTW(
		data: BytesView | FirmwareUpdateInfo,
	): Promise<OTWFirmwareUpdateResult> {
		// If the data is provided as a FirmwareUpdateInfo, we need to download the firmware first.
		// This must happen before the busy checks, so no concurrent update can slip in between them
		// and queueing the task.
		if (isFirmwareUpdateInfo(data)) {
			data = await this.extractOTWUpdateInfo(data);
		}

		// Don't interrupt ongoing OTA firmware updates
		if (this._controller?.isAnyOTAFirmwareUpdateInProgress()) {
			const message = `Failed to start the update: A firmware update is already in progress on this network!`;
			this.controllerLog.print(message, "error");
			throw new ZWaveError(message, ZWaveErrorCodes.OTW_Update_Busy);
		}

		// Don't allow updating firmware when the controller is currently updating its own firmware
		if (this.isOTWFirmwareUpdateInProgress()) {
			const message = `Failed to start the update: The controller is currently being updated!`;
			this.controllerLog.print(message, "error");
			throw new ZWaveError(message, ZWaveErrorCodes.OTW_Update_Busy);
		}

		return this._scheduler.queueTask(this.getFirmwareUpdateOTWTask(data));
	}

	private getFirmwareUpdateOTWTask(
		data: BytesView,
	): TaskBuilder<OTWFirmwareUpdateResult> {
		const self = this;

		return {
			priority: TaskPriority.Normal,
			tag: { id: "firmware-update-otw" },
			group: { id: "controller-exclusive" },
			// An interrupted update may leave the controller in recovery mode
			interrupt: TaskInterruptBehavior.Forbidden,
			task: async function* firmwareUpdateOTWTask(thisTask) {
				// When in bootloader mode, we can use the 700 series update method
				if (self.mode === DriverMode.Bootloader) {
					return yield* self.firmwareUpdateOTW700(data);
				} else if (self.mode === DriverMode.SerialAPI) {
					if (self.controller.sdkVersionGte("7.0")) {
						// This is at least a 700 series controller, so we can use the 700 series update method
						return yield* self.firmwareUpdateOTW700(data);
					} else if (
						self.controller.sdkVersionGte("6.50.0")
						&& self.controller.supportedFunctionTypes?.includes(
							FunctionType.FirmwareUpdateNVM,
						)
					) {
						// This is a 500 series controller, use the 500 series update method
						const wasUpdated = yield* waitFor(
							self.firmwareUpdateOTW500(data),
						);
						if (wasUpdated.success) {
							// After updating the firmware on 500 series sticks, we MUST soft-reset them
							self.driverLog.print(
								"Activating new firmware and restarting driver...",
							);
							yield* waitFor(self.softResetAndRestart(thisTask));
						}
						return wasUpdated;
					}
				} else if (self.mode === DriverMode.CLI) {
					// If the CLI has an option to enter bootloader, we can use the 700 series update method,
					// since it tries to execute that.
					return yield* self.firmwareUpdateOTW700(data);
				}

				throw new ZWaveError(
					`Firmware updates are not supported on this Z-Wave module`,
					ZWaveErrorCodes.Controller_NotSupported,
				);
			},
		};
	}

	/**
	 * Downloads the desired firmware update from the Z-Wave JS firmware update service and extracts the firmware data.
	 * @param updateInfo The desired entry from the updates array that was returned by {@link getAvailableFirmwareUpdates}.
	 * Before applying the update, Z-Wave JS will check whether the device IDs, firmware version and region match.
	 */
	private async extractOTWUpdateInfo(
		updateInfo: FirmwareUpdateInfo,
	): Promise<BytesView> {
		// Controller updates must have exactly one file
		if (updateInfo.files?.length !== 1) {
			throw new ZWaveError(
				`Invalid number of update files for OTW firmware updates.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		const update = updateInfo.files[0];

		// The controller must also not be downgraded this way
		if (updateInfo.downgrade) {
			throw new ZWaveError(
				`Invalid update file: Downgrades are not supported!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Make sure we're not applying the update to the wrong device
		if (
			updateInfo.device.manufacturerId !== this.controller.manufacturerId
			|| updateInfo.device.productType !== this.controller.productType
			|| updateInfo.device.productId !== this.controller.productId
		) {
			throw new ZWaveError(
				`Cannot update controller firmware: The firmware update is for a different device!`,
				ZWaveErrorCodes.FWUpdateService_DeviceMismatch,
			);
		} else if (
			updateInfo.device.firmwareVersion
			!== this.controller.firmwareVersion
		) {
			throw new ZWaveError(
				`Cannot update controller firmware: The update is for a different original firmware version!`,
				ZWaveErrorCodes.FWUpdateService_DeviceMismatch,
			);
		}

		const loglevel = this.getLogConfig().level;

		const logMessage = "Downloading OTW firmware update...";
		this.controllerLog.print(
			loglevel === "silly"
				? logText(logMessage, {
						nested: logDict({
							URL: update.url,
							integrity: update.integrity,
						}),
					})
				: logMessage,
		);

		let firmware: Firmware;
		try {
			firmware = await downloadFirmwareUpdate(update);
		} catch (e: any) {
			let message = `Downloading the OTW firmware update failed:\n`;
			if (isZWaveError(e)) {
				// Pass "real" Z-Wave errors through
				throw new ZWaveError(message + e.message, e.code);
			} else if (e.response) {
				// And construct a better error message for HTTP errors
				if (
					isObject(e.response.data)
					&& typeof e.response.data.message === "string"
				) {
					message += `${e.response.data.message} `;
				}
				message += `[${e.response.status} ${e.response.statusText}]`;
			} else if (typeof e.message === "string") {
				message += e.message;
			} else {
				message += `Failed to download firmware update!`;
			}

			throw new ZWaveError(
				message,
				ZWaveErrorCodes.FWUpdateService_RequestError,
			);
		}

		return firmware.data;
	}

	private async firmwareUpdateOTW500(
		data: BytesView,
	): Promise<OTWFirmwareUpdateResult> {
		let turnedRadioOff = false;
		try {
			this.controllerLog.print("Beginning firmware update");

			const canUpdate = await this.controller.firmwareUpdateNVMInit();
			if (!canUpdate) {
				this.controllerLog.print(
					"OTW update failed: This controller does not support firmware updates",
					"error",
				);

				const result: OTWFirmwareUpdateResult = {
					success: false,
					status: OTWFirmwareUpdateStatus.Error_NotSupported,
				};
				this.emit("firmware update finished", result);
				return result;
			}

			// Avoid interruption by incoming messages
			await this.controller.toggleRF(false);
			turnedRadioOff = true;

			// Upload the firmware data
			const BLOCK_SIZE = 64;
			const numFragments = Math.ceil(data.length / BLOCK_SIZE);
			for (let fragment = 0; fragment < numFragments; fragment++) {
				const fragmentData = data.subarray(
					fragment * BLOCK_SIZE,
					(fragment + 1) * BLOCK_SIZE,
				);
				await this.controller.firmwareUpdateNVMWrite(
					fragment * BLOCK_SIZE,
					fragmentData,
				);

				// This progress is technically too low, but we can keep 100% for after CRC checking this way
				const progress: OTWFirmwareUpdateProgress = {
					sentFragments: fragment,
					totalFragments: numFragments,
					progress: roundTo((fragment / numFragments) * 100, 2),
				};
				this.emit("firmware update progress", progress);
			}

			// Check if a valid image was written
			const isValidCRC =
				await this.controller.firmwareUpdateNVMIsValidCRC16();
			if (!isValidCRC) {
				this.controllerLog.print(
					"OTW update failed: The firmware image is invalid",
					"error",
				);

				const result: OTWFirmwareUpdateResult = {
					success: false,
					status: OTWFirmwareUpdateStatus.Error_Aborted,
				};
				this.emit("firmware update finished", result);
				return result;
			}

			this.emit("firmware update progress", {
				sentFragments: numFragments,
				totalFragments: numFragments,
				progress: 100,
			});

			// Enable the image
			await this.controller.firmwareUpdateNVMSetNewImage();

			this.controllerLog.print("Firmware update succeeded");

			const result: OTWFirmwareUpdateResult = {
				success: true,
				status: OTWFirmwareUpdateStatus.OK,
			};
			this.emit("firmware update finished", result);
			return result;
		} finally {
			if (turnedRadioOff) await this.controller.toggleRF(true);
		}
	}

	private async *firmwareUpdateOTW700(
		data: BytesView,
	): AsyncGenerator<
		(() => Promise<unknown>) | undefined,
		OTWFirmwareUpdateResult
	> {
		const maxAttempts = this.options.attempts.firmwareUpdateOTW;
		let result!: OTWFirmwareUpdateResult;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			result = yield* waitFor(this.firmwareUpdateOTW700Internal(data));
			if (result.success) break;

			// If this was an aborted update, check if it's an XMODEM communication error
			if (
				result.status === OTWFirmwareUpdateStatus.Error_Aborted
				&& result.errorCode != undefined
				&& (result.errorCode & 0xf0) === 0x20
			) {
				if (attempt < maxAttempts) {
					this.controllerLog.print(
						`Retrying firmware update after XMODEM communication error ${num2hex(
							result.errorCode,
						)}, attempt ${attempt}/${maxAttempts}...`,
						"warn",
					);
					yield* waitFor(wait(250));
					continue;
				}

				this.controllerLog.print(
					"Maximum firmware update attempts reached, giving up.",
					"error",
				);
			}

			// For any other error type or when we've exhausted retries, break and return
			break;
		}

		// If we get here, all attempts failed - use the last result or create a default one
		this.emit("firmware update finished", result);
		return result;
	}

	private async firmwareUpdateOTW700Internal(
		data: BytesView,
	): Promise<OTWFirmwareUpdateResult> {
		try {
			await this.enterBootloader();

			// Start the update process
			this.controllerLog.print("Beginning firmware upload");
			await this.bootloader.beginUpload();

			// Wait for the bootloader to accept fragments
			try {
				await this.waitForBootloaderChunk(
					(c) =>
						c.type === BootloaderChunkType.Message
						&& c.message === "begin upload",
					5000,
				);
				await this.waitForBootloaderChunk(
					(c) =>
						c.type === BootloaderChunkType.FlowControl
						&& c.command === XModemMessageHeaders.C,
					1000,
				);
			} catch {
				this.controllerLog.print(
					"OTW update failed: Expected response not received from the bootloader",
					"error",
				);
				const result: OTWFirmwareUpdateResult = {
					success: false,
					status: OTWFirmwareUpdateStatus.Error_Timeout,
				};
				return result;
			}

			const BLOCK_SIZE = 128;
			if (data.length % BLOCK_SIZE !== 0) {
				// Pad the data to a multiple of BLOCK_SIZE
				data = Bytes.concat([
					data,
					new Bytes(BLOCK_SIZE - (data.length % BLOCK_SIZE)).fill(
						0xff,
					),
				]);
			}
			const numFragments = Math.ceil(data.length / BLOCK_SIZE);

			let aborted = false;

			transfer: for (
				let fragment = 1;
				fragment <= numFragments;
				fragment++
			) {
				const fragmentData = data.subarray(
					(fragment - 1) * BLOCK_SIZE,
					fragment * BLOCK_SIZE,
				);

				retry: for (let retry = 0; retry < 3; retry++) {
					await this.bootloader.uploadFragment(
						fragment,
						fragmentData,
					);
					let result: BootloaderChunk & {
						type: BootloaderChunkType.FlowControl;
					};
					try {
						result = await this.waitForBootloaderChunk(
							(c) => c.type === BootloaderChunkType.FlowControl,
							1000,
						);
					} catch {
						this.controllerLog.print(
							"OTW update failed: The bootloader did not acknowledge the start of transfer.",
							"error",
						);

						const result: OTWFirmwareUpdateResult = {
							success: false,
							status: OTWFirmwareUpdateStatus.Error_Timeout,
						};
						return result;
					}

					switch (result.command) {
						case XModemMessageHeaders.ACK: {
							// The fragment was accepted
							const progress: OTWFirmwareUpdateProgress = {
								sentFragments: fragment,
								totalFragments: numFragments,
								progress: roundTo(
									(fragment / numFragments) * 100,
									2,
								),
							};
							this.emit("firmware update progress", progress);
							continue transfer;
						}
						case XModemMessageHeaders.NAK:
							// The fragment was rejected, try again
							continue retry;
						case XModemMessageHeaders.CAN:
							// The bootloader aborted the update. We'll receive the reason afterwards as a message
							aborted = true;
							break transfer;
					}
				}

				this.controllerLog.print(
					"OTW update failed: Maximum retry attempts reached",
					"error",
				);
				const result: OTWFirmwareUpdateResult = {
					success: false,
					status: OTWFirmwareUpdateStatus.Error_RetryLimitReached,
				};
				return result;
			}

			if (aborted) {
				// wait for the reason to craft a good error message
				const error = await this.waitForBootloaderChunk<
					BootloaderChunk & { type: BootloaderChunkType.Message }
				>(
					(c) =>
						c.type === BootloaderChunkType.Message
						&& c.message.includes("error 0x"),
					1000,
				).catch(() => undefined);

				// wait for the menu screen so it doesn't show up in logs
				await this.waitForBootloaderChunk(
					(c) => c.type === BootloaderChunkType.Menu,
					1000,
				).catch(() => undefined);

				let message = `OTW update was aborted by the bootloader.`;
				let errorCode: number | undefined;
				if (error) {
					message += ` ${error.message}`;
					// Parse error code from the message
					const errorMatch = error.message.match(
						/error 0x([0-9a-fA-F]+)/,
					);
					if (errorMatch) {
						const errorCodeStr = errorMatch[1];
						errorCode = parseInt(errorCodeStr, 16);
					}
				}
				this.controllerLog.print(message, "error");

				const result: OTWFirmwareUpdateResult = {
					success: false,
					status: OTWFirmwareUpdateStatus.Error_Aborted,
					errorCode,
				};
				return result;
			} else {
				// We're done, send EOT and wait for the menu screen
				await this.bootloader.finishUpload();
				try {
					// The bootloader sends the confirmation and the menu screen very quickly.
					// Waiting for them separately can cause us to miss the menu screen and
					// incorrectly assume the update timed out.

					await Promise.all([
						this.waitForBootloaderChunk(
							(c) =>
								c.type === BootloaderChunkType.Message
								&& c.message.includes("upload complete"),
							1000,
						),

						this.waitForBootloaderChunk(
							(c) => c.type === BootloaderChunkType.Menu,
							1000,
						),
					]);
				} catch {
					this.controllerLog.print(
						"OTW update failed: The bootloader did not acknowledge the end of transfer.",
						"error",
					);
					const result: OTWFirmwareUpdateResult = {
						success: false,
						status: OTWFirmwareUpdateStatus.Error_Timeout,
					};
					return result;
				}
			}

			this.controllerLog.print("Firmware update succeeded");

			const result: OTWFirmwareUpdateResult = {
				success: true,
				status: OTWFirmwareUpdateStatus.OK,
			};
			return result;
		} finally {
			if (this._options.bootloaderMode !== "stay") {
				await this.leaveBootloader();
			}
		}
	}

	// region Bootloader

	private _enteringBootloader: boolean = false;
	private _enterBootloaderPromise: DeferredPromise<void> | undefined;

	public async enterBootloader(): Promise<void> {
		if (this._bootloader) return;

		this.controllerLog.print("Entering bootloader...");
		this._enteringBootloader = true;
		try {
			if (this.mode === DriverMode.SerialAPI) {
				await this.enterBootloaderFromSerialAPI();
			} else if (this.mode === DriverMode.CLI) {
				await this.enterBootloaderFromCLI();
			}

			// Wait if the menu shows up
			this._enterBootloaderPromise = createDeferredPromise();
			const success = await Promise.race([
				this._enterBootloaderPromise.then(() => true),
				wait(5000, true).then(() => false),
			]);
			if (success) {
				this.controllerLog.print("Entered bootloader");
			} else {
				throw new ZWaveError(
					"Failed to enter bootloader",
					ZWaveErrorCodes.Controller_Timeout,
				);
			}
		} finally {
			this._enteringBootloader = false;
		}
	}

	private async enterBootloaderFromSerialAPI(): Promise<void> {
		// Get the encoding context before destroying the controller
		const ctx = this.getEncodingContext();

		// If this was triggered by an OTW firmware update, we need to
		// keep that task alive.
		await this.destroyController(
			(task) => task.tag?.id === "firmware-update-otw",
		);

		// It would be nicer to not hardcode the command here, but since we're switching stream parsers
		// mid-command - thus ignoring the ACK, we can't really use the existing communication machinery
		const msg = new EnterBootloaderRequest();
		const promise = this.writeSerial(await msg.serialize(ctx));
		this.serial!.mode = ZWaveSerialMode.Bootloader;
		await promise;
	}

	private async enterBootloaderFromCLI(): Promise<void> {
		// The CLI first responds with a success message, so we have to reset the
		await this.cli.executeCommand("bootloader");
		// serial mode after the command is complete
		this.serial!.mode = undefined;
	}

	private leaveBootloaderInternal(): Promise<void> {
		const promise = this.bootloader.runApplication();
		// Reset the known serial mode.
		// We might end up in serial API, CLI or bootloader mode afterwards.
		this.serial!.mode = undefined;
		this._bootloader = undefined;
		return promise;
	}

	/**
	 * Leaves the bootloader by running the application.
	 */
	public async leaveBootloader(): Promise<void> {
		this.controllerLog.print("Leaving bootloader...");
		await this.leaveBootloaderInternal();

		// We may end up in a Serial API or CLI application. CLI is detected
		// automatically, Serial API should send a SerialAPIStartedRequest.
		// Give both a second to respond.
		const isSerialAPI = await this.waitForMessage<SerialAPIStartedRequest>(
			(msg) => msg.functionType === FunctionType.SerialAPIStarted,
			1000,
		)
			.then(() => true as const)
			.catch(() => false as const);

		if (isSerialAPI) {
			// Re-initialize the controller
			await this.initializeControllerAndNodes();
			return;
		} else if (this.mode === DriverMode.CLI) {
			await this.ensureCLIReady();
			return;
		} else if (this._bootloader) {
			// We're still in bootloader mode - this likely means that the
			// application failed to start
			return;
		}

		// FIXME: Do we need the pause thing still?
		this.unpauseSendQueue();

		await this.ensureSerialAPI();
	}

	private serialport_onBootloaderData(data: BootloaderChunk): void {
		switch (data.type) {
			case BootloaderChunkType.Message: {
				this.controllerLog.print(
					`[BOOTLOADER] ${data.message}`,
					"verbose",
				);
				break;
			}
			case BootloaderChunkType.FlowControl: {
				if (data.command === XModemMessageHeaders.C) {
					this.controllerLog.print(
						`[BOOTLOADER] awaiting input...`,
						"verbose",
					);
				}
				break;
			}
		}

		// Check if there is a handler waiting for this chunk
		for (const entry of this.awaitedBootloaderChunks) {
			if (entry.predicate(data)) {
				// there is!
				entry.handler(data);
				return;
			}
		}

		if (!this._bootloader && data.type === BootloaderChunkType.Menu) {
			// We just entered the bootloader
			this._controller?.destroy();
			this._controller = undefined;
			this._controllerInterviewed = false;
			this._nodesReady.clear();
			this._nodesReadyEventEmitted = false;
			this._cli = undefined;

			this.controllerLog.print(
				`[BOOTLOADER] version ${data.version}`,
				"verbose",
			);

			this._bootloader = new Bootloader(
				this.writeSerial.bind(this),
				data.version,
				data.options,
			);
			if (this._enterBootloaderPromise) {
				this._enterBootloaderPromise.resolve();
				this._enterBootloaderPromise = undefined;
			}
		}
	}

	public waitForBootloaderChunk<T extends BootloaderChunk>(
		predicate: (chunk: BootloaderChunk) => chunk is T,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<T>;

	public waitForBootloaderChunk<T extends BootloaderChunk>(
		predicate: (chunk: BootloaderChunk) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<T>;

	/**
	 * Waits until a specific chunk is received from the bootloader or an optional timeout has elapsed. Returns the received chunk.
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param predicate A predicate function to test all incoming chunks
	 */
	public waitForBootloaderChunk<T extends BootloaderChunk>(
		predicate: (chunk: BootloaderChunk) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const promise = createDeferredPromise<BootloaderChunk>();
			const entry: AwaitedBootloaderChunkEntry = {
				predicate,
				handler: (chunk) => promise.resolve(chunk),
				timeout: undefined,
			};
			this.awaitedBootloaderChunks.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedBootloaderChunks.indexOf(entry);
				if (index !== -1) this.awaitedBootloaderChunks.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`Received no matching chunk within the provided timeout!`,
							ZWaveErrorCodes.Controller_Timeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((chunk) => {
				removeEntry();
				resolve(chunk as T);
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	public waitForCLIChunk<T extends CLIChunk>(
		predicate: (chunk: CLIChunk) => chunk is T,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<T>;

	public waitForCLIChunk<T extends CLIChunk>(
		predicate: (chunk: CLIChunk) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<T>;

	/**
	 * Waits until a specific chunk is received from the end device CLI or an optional timeout has elapsed. Returns the received chunk.
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param predicate A predicate function to test all incoming chunks
	 */
	public waitForCLIChunk<T extends CLIChunk>(
		predicate: (chunk: CLIChunk) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const promise = createDeferredPromise<CLIChunk>();
			const entry: AwaitedCLIChunkEntry = {
				predicate,
				handler: (chunk) => promise.resolve(chunk),
				timeout: undefined,
			};
			this.awaitedCLIChunks.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedCLIChunks.indexOf(entry);
				if (index !== -1) this.awaitedCLIChunks.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`Received no matching chunk within the provided timeout!`,
							ZWaveErrorCodes.Controller_Timeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((chunk) => {
				removeEntry();
				resolve(chunk as T);
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	private async serialport_onCLIData(data: CLIChunk): Promise<void> {
		// Check if there is a handler waiting for this chunk
		for (const entry of this.awaitedCLIChunks) {
			if (entry.predicate(data)) {
				// there is!
				entry.handler(data);
				return;
			}
		}

		if (!this._cli && data.type === CLIChunkType.Prompt) {
			// We just detected the CLI
			this._controller?.destroy();
			this._controller = undefined;
			this._controllerInterviewed = false;
			this._nodesReady.clear();
			this._nodesReadyEventEmitted = false;
			this._bootloader = undefined;

			this._cli = new EndDeviceCLI(
				this.writeSerial.bind(this),
				(timeout) =>
					this.waitForCLIChunk(
						(c) => c.type === CLIChunkType.Message,
						timeout ?? 1000,
					)
						.then(
							(c) =>
								(c as CLIChunk & { type: CLIChunkType.Message })
									.message,
						)
						.catch(() => undefined),
			);

			if (!(await this.ensureCLIReady())) {
				throw new ZWaveError(
					"Failed to detect available CLI commands",
					ZWaveErrorCodes.Driver_Failed,
				);
			}
		}
	}

	private pollBackgroundRSSITimer: Timer | undefined;
	private lastBackgroundRSSITimestamp = 0;
	private hfBackgroundRSSIEndTimestamp = 0;

	private handleQueueIdleChange(idle: boolean): void {
		// Resolve all awaited idle promises when the queue becomes idle
		if (idle) {
			for (const entry of this.awaitedIdle) {
				entry.handler();
			}
		}

		if (!this.ready) return;
		if (
			this.controller.isFunctionSupported(FunctionType.GetBackgroundRSSI)
		) {
			// When the send thread stays idle for 5 seconds, poll the background RSSI, but at most every 30s
			if (idle) {
				this.setBackgroundRSSITimer();
			} else {
				this.clearBackgroundRSSITimer();
			}
		}
	}

	private setBackgroundRSSITimer(): void {
		let timeout: number;
		if (Date.now() < this.hfBackgroundRSSIEndTimestamp) {
			// During high-frequency measurement periods, poll every 2s
			timeout = Math.max(
				2000,
				2000 - (Date.now() - this.lastBackgroundRSSITimestamp),
			);
		} else {
			timeout = Math.max(
				// Wait at least 5s
				5000,
				// and up to 30s if we recently queried the RSSI
				30_000 - (Date.now() - this.lastBackgroundRSSITimestamp),
			);
		}
		this.pollBackgroundRSSITimer = setTimer(async () => {
			// Due to the timeout, the driver might have been destroyed in the meantime
			if (!this.ready) return;

			this.lastBackgroundRSSITimestamp = Date.now();
			try {
				await this.controller.getBackgroundRSSI();
			} catch {
				// ignore errors
			}
		}, timeout).unref();
	}

	private clearBackgroundRSSITimer(): void {
		this.pollBackgroundRSSITimer?.clear();
		this.pollBackgroundRSSITimer = undefined;
	}

	/** Enable frequent RSSI monitoring for the given amount of milliseconds. During this time, the background RSSI will be measured every 2 seconds. */
	public enableFrequentRSSIMonitoring(durationMs: number): void {
		if (durationMs < 10000 || durationMs > 3600 * 1000) {
			throw new ZWaveError(
				`The duration must be between 10 seconds and one hour!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.hfBackgroundRSSIEndTimestamp = Date.now() + durationMs;
		// Restart a running timer to poll as soon as possible
		if (this.pollBackgroundRSSITimer) {
			this.clearBackgroundRSSITimer();
			this.setBackgroundRSSITimer();
		}
	}

	/** Disable frequent RSSI monitoring */
	public disableFrequentRSSIMonitoring(): void {
		this.hfBackgroundRSSIEndTimestamp = 0;
		// Restart a running timer to lower the polling frequency
		if (this.pollBackgroundRSSITimer) {
			this.clearBackgroundRSSITimer();
			this.setBackgroundRSSITimer();
		}
	}

	public get isFrequentRSSIMonitoringEnabled(): boolean {
		return Date.now() < this.hfBackgroundRSSIEndTimestamp;
	}

	private _powerlevelTestNodeContext:
		| {
				testNodeId: number;
				timeout: NodeJS.Timeout | undefined;
				acknowledgedFrames: number;
		  }
		| undefined;

	/**
	 * @internal
	 * Begins a powerlevel test for the given node using NOP power frames
	 */
	public async sendNOPPowerFrames(
		testNodeId: number,
		powerlevel: Powerlevel,
		frameCount: number,
	): Promise<number> {
		if (this._powerlevelTestNodeContext) {
			// Cancel the previous test
			clearTimeout(this._powerlevelTestNodeContext.timeout);
			this._powerlevelTestNodeContext = undefined;
		}

		if (frameCount < 1) return 0;

		const ret = createDeferredPromise<number>();

		const context = {
			testNodeId,
			acknowledgedFrames: 0,
			// This is set below after defining sendFrame
			timeout: undefined as NodeJS.Timeout | undefined,
		};
		this._powerlevelTestNodeContext = context;

		// We're expected to send these pretty quickly (260 frames in 25s for the CTT test)
		const interval = 50;

		const sendFrame = async () => {
			const result = await this.sendTestFrame(testNodeId, powerlevel);
			if (result === TransmitStatus.OK) {
				context.acknowledgedFrames++;
			}
			frameCount--;

			if (frameCount > 0) {
				context.timeout = setTimeout(sendFrame, interval);
			} else {
				context.timeout = undefined;
				ret.resolve(context.acknowledgedFrames);
			}
		};

		context.timeout = setTimeout(sendFrame, interval);

		return ret;
	}

	/** Sends a NOP Power frame to the given node and returns the transmit status if the frame was sent */
	public async sendTestFrame(
		nodeId: number,
		powerlevel: Powerlevel,
	): Promise<TransmitStatus | undefined> {
		const result = await this.sendMessage<Message & SuccessIndicator>(
			new SendTestFrameRequest({
				testNodeId: nodeId,
				powerlevel,
			}),
		);

		if (result instanceof SendTestFrameTransmitReport) {
			return result.transmitStatus;
		}
	}

	/**
	 * @internal
	 * Returns the status of a potentially ongoing NOP power test
	 */
	public getNOPPowerTestStatus():
		| {
				testNodeId: number;
				inProgress: boolean;
				acknowledgedFrames: number;
		  }
		| undefined {
		if (this._powerlevelTestNodeContext) {
			return {
				inProgress: !!this._powerlevelTestNodeContext.timeout,
				testNodeId: this._powerlevelTestNodeContext.testNodeId,
				acknowledgedFrames:
					this._powerlevelTestNodeContext.acknowledgedFrames,
			};
		}
	}

	/**
	 * Resets the S2 singlecast encryption state (SPAN) for the given node, which forces
	 * a re-synchronization on the next communication attempt.
	 */
	public resetSPAN(nodeId: number): void {
		this.getSecurityManager2(nodeId)?.deleteNonce(nodeId);
	}

	/**
	 * Resets the S2 singlecast encryption state (SPAN) for all nodes, which forces
	 * a re-synchronization on the next communication attempt.
	 */
	public resetAllSPANs(): void {
		for (const nodeId of this.controller.nodes.keys()) {
			this.resetSPAN(nodeId);
		}
	}
}
