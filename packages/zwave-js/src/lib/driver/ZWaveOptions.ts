import type { LogConfig } from "@zwave-js/core";
import type { FileSystem, ZWaveHostOptions } from "@zwave-js/host";
import type { ZWaveSerialPortBase } from "@zwave-js/serial";
import type { SerialPort } from "serialport";
import type { InclusionUserCallbacks } from "../controller/Inclusion";

export interface ZWaveOptions extends ZWaveHostOptions {
	/** Specify timeouts in milliseconds */
	timeouts: {
		/** how long to wait for an ACK */
		ack: number; // >=1, default: 1000 ms

		/** not sure */
		byte: number; // >=1, default: 150 ms

		/**
		 * How long to wait for a controller response. Usually this timeout should never elapse,
		 * so this is merely a safeguard against the driver stalling.
		 */
		response: number; // [500...20000], default: 10000 ms

		/** How long to wait for a callback from the host for a SendData[Multicast]Request */
		sendDataCallback: number; // >=10000, default: 65000 ms

		/** How much time a node gets to process a request and send a response */
		report: number; // [500...10000], default: 1000 ms

		/** How long generated nonces are valid */
		nonce: number; // [3000...20000], default: 5000 ms

		/**
		 * @internal
		 * How long to wait for a poll after setting a value without transition duration
		 */
		refreshValue: number;

		/**
		 * @internal
		 * How long to wait for a poll after setting a value with transition duration. This doubles as the "fast" delay.
		 */
		refreshValueAfterTransition: number;

		/**
		 * How long to wait for the Serial API Started command after a soft-reset before resorting
		 * to polling the API for the responsiveness check.
		 */
		serialAPIStarted: number; // [1000...30000], default: 5000 ms
	};

	attempts: {
		/**
		 * @internal
		 * How often to attempt opening the serial port
		 */
		openSerialPort: number;

		/** How often the driver should try communication with the controller before giving up */
		controller: number; // [1...3], default: 3

		/** How often the driver should try sending SendData commands before giving up */
		sendData: number; // [1...5], default: 3

		/**
		 * How many attempts should be made for each node interview before giving up
		 */
		nodeInterview: number; // [1...10], default: 5
	};

	/**
	 * Optional log configuration
	 */
	logConfig?: LogConfig;

	interview: {
		/**
		 * Whether all user code should be queried during the interview of the UserCode CC.
		 * Note that enabling this can cause a lot of traffic during the interview.
		 */
		queryAllUserCodes?: boolean;

		/**
		 * Disable the automatic node interview after successful inclusion.
		 * Note: When this is `true`, the interview must be started manually using
		 * ```ts
		 * driver.interviewNode(node: ZWaveNode)
		 * ```
		 *
		 * Default: `false` (automatic interviews enabled)
		 */
		disableOnNodeAdded?: boolean;
	};

	storage: {
		/** Allows you to replace the default file system driver used to store and read the cache */
		driver: FileSystem;
		/** Allows you to specify a different cache directory */
		cacheDir: string;
		/**
		 * Allows you to specify a different directory for the lockfiles than cacheDir.
		 * Can also be set with the ZWAVEJS_LOCK_DIRECTORY env variable.
		 */
		lockDir?: string;
		/**
		 * Allows you to specify a directory where device configuration files can be loaded from with higher priority than the included ones.
		 * This directory does not get indexed and should be used sparingly, e.g. for testing.
		 */
		deviceConfigPriorityDir?: string;

		/**
		 * How frequently the values and metadata should be written to the DB files. This is a compromise between data loss
		 * in cause of a crash and disk wear:
		 *
		 * * `"fast"` immediately writes every change to disk
		 * * `"slow"` writes at most every 5 minutes or after 500 changes - whichever happens first
		 * * `"normal"` is a compromise between the two options
		 */
		throttle: "fast" | "normal" | "slow";
	};

	/**
	 * Specify the security keys to use for encryption. Each one must be a Buffer of exactly 16 bytes.
	 */
	securityKeys?: {
		S2_Unauthenticated?: Buffer;
		S2_Authenticated?: Buffer;
		S2_AccessControl?: Buffer;
		S0_Legacy?: Buffer;
	};

	/**
	 * Defines the callbacks that are necessary to trigger user interaction during S2 inclusion.
	 * If not given, nodes won't be included using S2, unless matching provisioning entries exists.
	 */
	inclusionUserCallbacks?: InclusionUserCallbacks;

	/**
	 * Some Command Classes support reporting that a value is unknown.
	 * When this flag is `false`, unknown values are exposed as `undefined`.
	 * When it is `true`, unknown values are exposed as the literal string "unknown" (even if the value is normally numeric).
	 * Default: `false`
	 */
	preserveUnknownValues?: boolean;

	/**
	 * Some SET-type commands optimistically update the current value to match the target value
	 * when the device acknowledges the command.
	 *
	 * While this generally makes UIs feel more responsive, it is not necessary for devices which report their status
	 * on their own and can lead to confusing behavior when dealing with slow devices like blinds.
	 *
	 * To disable the optimistic update, set this option to `true`.
	 * Default: `false`
	 */
	disableOptimisticValueUpdate?: boolean;

	/**
	 * By default, the driver assumes to be talking to a single application. In this scenario a successful `setValue` call
	 * is enough for the application to know that the value was changed and update its own cache or UI.
	 *
	 * Therefore, the `"value updated"` event is not emitted after `setValue` unless the change was verified by the device.
	 * To get `"value updated"` events nonetheless, set this option to `true`.
	 *
	 * Default: `false`
	 */
	emitValueUpdateAfterSetValue?: boolean;

	/**
	 * Soft Reset is required after some commands like changing the RF region or restoring an NVM backup.
	 * Because it may be problematic in certain environments, we provide the user with an option to opt out.
	 * Default: `true,` except when ZWAVEJS_DISABLE_SOFT_RESET env variable is set.
	 */
	enableSoftReset?: boolean;

	preferences: {
		/**
		 * The preferred scales to use when querying sensors. The key is either:
		 * - the name of a named scale group, e.g. "temperature", which applies to every sensor type that uses this scale group.
		 * - or the numeric sensor type to specify the scale for a single sensor type
		 *
		 * Single-type preferences have a higher priority than named ones. For example, the following preference
		 * ```js
		 * {
		 *     temperature: "°F",
		 *     0x01: "°C",
		 * }
		 * ```
		 * will result in using the Fahrenheit scale for all temperature sensors, except the air temperature (0x01).
		 *
		 * The value must match what is defined in the sensor type config file and contain either:
		 * - the label (e.g. "Celsius", "Fahrenheit")
		 * - the unit (e.g. "°C", "°F")
		 * - or the numeric key of the scale (e.g. 0 or 1).
		 *
		 * Default:
		 * ```js
		 * {
		 *     temperature: "Celsius"
		 * }
		 * ```
		 */
		scales: Partial<Record<string | number, string | number>>;
	};

	apiKeys?: {
		/** API key for the Z-Wave JS Firmware Update Service (https://github.com/zwave-js/firmware-updates/) */
		firmwareUpdateService?: string;
	};

	/**
	 * Normally, the driver expects to start in Serial API mode and enter the bootloader on demand. If in bootloader,
	 * it will try to exit it and enter Serial API mode again.
	 *
	 * However there are situations where a controller may be stuck in bootloader mode and no Serial API is available.
	 * In this case, the driver startup will fail, unless this option is set to `true`.
	 *
	 * If it is, the driver instance will only be good for interacting with the bootloader, e.g. for flashing a new image.
	 * Commands attempting to talk to the serial API will fail.
	 */
	allowBootloaderOnly?: boolean;

	/**
	 * An object with application/module/component names and their versions.
	 * This will be used to build a user-agent string for requests to Z-Wave JS webservices.
	 */
	userAgent?: Record<string, string>;

	/** DO NOT USE! Used for testing internally */
	testingHooks?: {
		serialPortBinding?: typeof SerialPort;
		/**
		 * A hook that allows accessing the serial port instance after opening
		 * and before interacting with it.
		 */
		onSerialPortOpen?: (port: ZWaveSerialPortBase) => Promise<void>;

		/**
		 * Set this to true to skip the controller identification sequence.
		 */
		skipControllerIdentification?: boolean;

		/**
		 * Set this to true to skip the interview of all nodes.
		 */
		skipNodeInterview?: boolean;

		/**
		 * Set this to true to skip checking if the controller is in bootloader mode
		 */
		skipBootloaderCheck?: boolean;

		/**
		 * Set this to false to skip loading the configuration files. Default: `true`..
		 */
		loadConfiguration?: boolean;
	};
}

export type EditableZWaveOptions = Pick<
	ZWaveOptions,
	| "disableOptimisticValueUpdate"
	| "emitValueUpdateAfterSetValue"
	| "inclusionUserCallbacks"
	| "interview"
	| "logConfig"
	| "preferences"
	| "preserveUnknownValues"
> & {
	userAgent?: Record<string, string | null | undefined>;
};
