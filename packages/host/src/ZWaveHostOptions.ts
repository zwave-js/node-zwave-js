export interface ZWaveHostOptions {
	/** Specify timeouts in milliseconds */
	timeouts: {
		/**
		 * How long to wait for a poll after setting a value without transition duration
		 */
		refreshValue: number;

		/**
		 * How long to wait for a poll after setting a value with transition duration. This doubles as the "fast" delay.
		 */
		refreshValueAfterTransition: number;
	};

	attempts: {
		/** How often the driver should try communication with the controller before giving up */
		controller: number; // [1...3], default: 3

		/** How often the driver should try sending SendData commands before giving up */
		sendData: number; // [1...5], default: 3

		/**
		 * How many attempts should be made for each node interview before giving up
		 */
		nodeInterview: number; // [1...10], default: 5
	};

	interview?: {
		/**
		 * Whether all user code should be queried during the interview of the UserCode CC.
		 * Note that enabling this can cause a lot of traffic during the interview.
		 */
		queryAllUserCodes?: boolean;
	};

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

	preferences?: {
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
