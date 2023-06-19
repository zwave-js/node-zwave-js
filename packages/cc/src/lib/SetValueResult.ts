import { Duration, SupervisionResult } from "@zwave-js/core/safe";

/**
 * Indicates the status of a `setValue` call. This enum is an extension of `SupervisionStatus`
 * with additional status codes to indicate errors that are not related to supervision.
 */
export enum SetValueStatus {
	/** The device reports no support for this command */
	NoDeviceSupport = 0x00,
	/** The device has accepted the command and is working on it */
	Working = 0x01,
	/** The device has rejected the command */
	Fail = 0x02,
	/** The endpoint specified in the value ID does not exist */
	EndpointNotFound = 0x03,
	/** The given CC or its API is not implemented (yet) or it has no `setValue` implementation */
	NotImplemented = 0x04,
	/** The value to set (or a related value) is invalid */
	InvalidValue = 0x05,
	/** The command was sent successfully, but it is unknown whether it was executed */
	SuccessUnsupervised = 0xfe,
	/** The device has executed the command successfully */
	Success = 0xff,
}

/** Indicates the result of a `setValue` call. */
export type SetValueResult =
	// Derived from SupervisionResult
	| {
			status:
				| SetValueStatus.NoDeviceSupport
				| SetValueStatus.Fail
				| SetValueStatus.Success;
			remainingDuration?: undefined;
			message?: undefined;
	  }
	| {
			status: SetValueStatus.Working;
			remainingDuration: Duration;
			message?: undefined;
	  }
	// Added by setValue
	| {
			status: SetValueStatus.SuccessUnsupervised;
			remainingDuration?: undefined;
			message?: undefined;
	  }
	| {
			status:
				| SetValueStatus.EndpointNotFound
				| SetValueStatus.NotImplemented
				| SetValueStatus.InvalidValue;
			remainingDuration?: undefined;
			message: string;
	  };

export function supervisionResultToSetValueResult(
	result: SupervisionResult | undefined,
): SetValueResult {
	if (result == undefined) {
		return {
			status: SetValueStatus.SuccessUnsupervised,
		};
	} else {
		// @ts-expect-error We only care about the compatible subset of status codes
		return result;
	}
}

/** Tests whether a `SetValueResult` indicates that the device accepted the command. */
export function setValueSucceeded(
	result: SetValueResult,
): result is SetValueResult & {
	status: SetValueStatus.Success | SetValueStatus.Working;
} {
	return (
		result.status === SetValueStatus.Success ||
		result.status === SetValueStatus.Working
	);
}

/** Tests whether a `SetValueResult` indicates that the command could not be sent or the device did not accept the command. */
export function setValueFailed(
	result: SetValueResult,
): result is SetValueResult & {
	status:
		| SetValueStatus.NoDeviceSupport
		| SetValueStatus.Fail
		| SetValueStatus.EndpointNotFound
		| SetValueStatus.NotImplemented
		| SetValueStatus.InvalidValue;
} {
	return (
		result.status === SetValueStatus.NoDeviceSupport ||
		result.status === SetValueStatus.Fail ||
		result.status === SetValueStatus.EndpointNotFound ||
		result.status === SetValueStatus.NotImplemented ||
		result.status === SetValueStatus.InvalidValue
	);
}

/** Tests whether a `SetValueResult` indicates that the command was sent and that the device maybe accepted the command. */
export function setValueWasUnsupervisedOrSucceeded(
	result: SetValueResult,
): result is SetValueResult & {
	status:
		| SetValueStatus.SuccessUnsupervised
		| SetValueStatus.Success
		| SetValueStatus.Working;
} {
	return (
		result.status === SetValueStatus.SuccessUnsupervised ||
		setValueSucceeded(result)
	);
}
