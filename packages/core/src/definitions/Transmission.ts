import type { CCId } from "../traits/CommandClasses.js";
import { type EncapsulationFlags } from "./EncapsulationFlags.js";
import { type MessagePriority } from "./MessagePriority.js";
import { type SecurityClass } from "./SecurityClass.js";
import {
	type SupervisionResult,
	type SupervisionUpdateHandler,
} from "./Supervision.js";
import { type TXReport } from "./TXReport.js";
import { type TransactionProgressListener } from "./Transactions.js";

export enum TransmitOptions {
	NotSet = 0,

	ACK = 1 << 0,
	LowPower = 1 << 1,
	AutoRoute = 1 << 2,

	NoRoute = 1 << 4,
	Explore = 1 << 5,

	DEFAULT = ACK | AutoRoute | Explore,
	DEFAULT_NOACK = DEFAULT & ~ACK,
}

export enum TransmitStatus {
	OK = 0x00,
	NoAck = 0x01,
	Fail = 0x02,
	NotIdle = 0x03,
	NoRoute = 0x04,
}

export interface SendMessageOptions {
	/** The priority of the message to send. If none is given, the defined default priority of the message class will be used. */
	priority?: MessagePriority;
	/** If an exception should be thrown when the message to send is not supported. Setting this to false is is useful if the capabilities haven't been determined yet. Default: true */
	supportCheck?: boolean;
	/**
	 * Whether the driver should update the node status to asleep or dead when a transaction is not acknowledged (repeatedly).
	 * Setting this to false will cause the simply transaction to be rejected on failure.
	 * Default: true
	 */
	changeNodeStatusOnMissingACK?: boolean;
	/** Sets the number of milliseconds after which a queued message expires. When the expiration timer elapses, the promise is rejected with the error code `Controller_MessageExpired`. */
	expire?: number;
	/**
	 * @internal
	 * Information used to identify or mark this transaction
	 */
	tag?: any;
	/**
	 * @internal
	 * Whether the send thread MUST be paused after this message was handled
	 */
	pauseSendThread?: boolean;
	/** If a Wake Up On Demand should be requested for the target node. */
	requestWakeUpOnDemand?: boolean;
	/**
	 * When a message sent to a node results in a TX report to be received, this callback will be called.
	 * For multi-stage messages, the callback may be called multiple times.
	 */
	onTXReport?: (report: TXReport) => void;

	/** Will be called when the transaction for this message progresses. */
	onProgress?: TransactionProgressListener;
}

export type SupervisionOptions =
	| (
		& {
			/** Whether supervision may be used. `false` disables supervision. Default: `"auto"`. */
			useSupervision?: "auto";
		}
		& (
			| {
				requestStatusUpdates?: false;
			}
			| {
				requestStatusUpdates: true;
				onUpdate: SupervisionUpdateHandler;
			}
		)
	)
	| {
		useSupervision: false;
	};

export type SendCommandSecurityS2Options = {
	/** Send the command using a different (lower) security class */
	s2OverrideSecurityClass?: SecurityClass;
	/** Whether delivery of non-supervised SET-type commands is verified by waiting for potential Nonce Reports. Default: true */
	s2VerifyDelivery?: boolean;
	/** Whether the MOS extension should be included in S2 message encapsulation. */
	s2MulticastOutOfSync?: boolean;
	/** The optional multicast group ID to use for S2 message encapsulation. */
	s2MulticastGroupId?: number;
};

export type SendCommandOptions =
	& SendMessageOptions
	& SupervisionOptions
	& SendCommandSecurityS2Options
	& {
		/** How many times the driver should try to send the message. Defaults to the configured Driver option */
		maxSendAttempts?: number;
		/** Whether the driver should automatically handle the encapsulation. Default: true */
		autoEncapsulate?: boolean;
		/** Used to send a response with the same encapsulation flags as the corresponding request. */
		encapsulationFlags?: EncapsulationFlags;
		/** Overwrite the default transmit options */
		transmitOptions?: TransmitOptions;
		/** Overwrite the default report timeout */
		reportTimeoutMs?: number;
	};

export type SendCommandReturnType<TResponse extends CCId | undefined> =
	undefined extends TResponse ? SupervisionResult | undefined
		: TResponse | undefined;
