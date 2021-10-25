import type { LogConfig } from "@zwave-js/core";
import type { FileSystem } from "./FileSystem";

export interface ZWaveOptions {
	/** Specify timeouts in milliseconds */
	timeouts: {
		/** how long to wait for an ACK */
		ack: number; // >=1, default: 1000 ms

		/** not sure */
		byte: number; // >=1, default: 150 ms

		/**
		 * How long to wait for a controller response. Usually this timeout should never elapse,
		 * so this is merely a safeguard against the driver stalling
		 */
		response: number; // [500...5000], default: 1600 ms

		/** How long to wait for a callback from the host for a SendData[Multicast]Request */
		sendDataCallback: number; // >=10000, default: 65000 ms

		/** How much time a node gets to process a request and send a response */
		report: number; // [1000...40000], default: 10000 ms

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

		/** Whether a command should be retried when a node acknowledges the receipt but no response is received */
		retryAfterTransmitReport: boolean; // default: false

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
		 * @internal
		 * Set this to true to skip the controller interview. Useful for testing purposes
		 */
		skipInterview?: boolean;

		/**
		 * Whether all user code should be queried during the interview of the UserCode CC.
		 * Note that enabling this can cause a lot of traffic during the interview.
		 */
		queryAllUserCodes?: boolean;
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
	 * @deprecated Use `securityKeys.S0_Legacy` instead
	 * Specify the network key to use for encryption. This must be a Buffer of exactly 16 bytes.
	 */
	networkKey?: Buffer;

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
}
