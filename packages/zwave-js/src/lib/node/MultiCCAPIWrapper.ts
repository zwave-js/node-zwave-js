import {
	type CCAPI,
	type SetValueImplementation,
	SupervisionCCReport,
} from "@zwave-js/cc";
import {
	type CommandClasses,
	type SendCommandOptions,
	type ValueID,
	ZWaveError,
	ZWaveErrorCodes,
	mergeSupervisionResults,
} from "@zwave-js/core/safe";

/** Creates a wrapper that looks like an instance of a specific CC API, but can handle multiple instances of that API */
export function createMultiCCAPIWrapper<T extends CCAPI>(apiInstances: T[]): T {
	if (apiInstances.length === 0) {
		throw new ZWaveError(
			"At least one CC API instance must be provided",
			ZWaveErrorCodes.Argument_Invalid,
		);
	} else if (apiInstances.some((a) => a.ccId !== apiInstances[0].ccId)) {
		throw new ZWaveError(
			"All CC API instances must be for the same CC",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const withOptions = (options: SendCommandOptions) =>
		createMultiCCAPIWrapper(
			// Create a new wrapper where each instance has the options applied
			apiInstances.map((a) => a.withOptions(options)),
		);
	const withTXReport = () =>
		createMultiCCAPIWrapper<T>(
			apiInstances.map((a) => a.withTXReport() as any),
		);

	// Delegate some properties to the first instance
	const version = apiInstances[0].version;
	const ccId = apiInstances[0].ccId;
	const isSupported = () => apiInstances[0].isSupported();
	const isSetValueOptimistic = (valueId: ValueID) =>
		apiInstances[0].isSetValueOptimistic(valueId);
	const supportsCommand = (cmd: CommandClasses) =>
		apiInstances[0].supportsCommand(cmd);

	// Since all instances are the same, either all of them or none have a set value implementation
	const setValue: SetValueImplementation | undefined = apiInstances[0]
			.setValue
		? async (...args) => {
			const tasks = apiInstances.map((a) => a.setValue!.call(a, ...args));
			const results = await Promise.all(tasks);
			return mergeSupervisionResults(results);
		}
		: undefined;

	// This wrapper is by definition for multiple nodes, so we cannot return one
	const getNode = () => undefined;
	const tryGetNode = () => undefined;

	return new Proxy({} as T, {
		get(target, prop) {
			// Avoid ultra-weird error messages during testing
			if (
				process.env.NODE_ENV === "test"
				&& typeof prop === "string"
				&& (prop === "$$typeof"
					|| prop === "constructor"
					|| prop.includes("@@__IMMUTABLE"))
			) {
				return undefined;
			}

			switch (prop) {
				case "ccId":
					return ccId;
				case "version":
					return version;
				case "isSupported":
					return isSupported;
				case "getNode":
					return getNode;
				case "tryGetNode":
					return tryGetNode;
				case "isSetValueOptimistic":
					return isSetValueOptimistic;
				case "supportsCommand":
					return supportsCommand;
				case "withOptions":
					return withOptions;
				case "withTXReport":
					return withTXReport;

				case "pollValue":
					// We don't do multicast polls
					return undefined;
				case "setValue":
					return setValue;

				default:
					// Assume everything else is a CC-specific method.
					// Call all of them and merge the results
					return async (...args: any) => {
						const tasks = apiInstances.map((a) =>
							// This may throw when a non-existing method is accessed, but that is desired here
							(a as any)[prop].call(a, ...args)
						);
						// This call won't go through the sendSupervisedCommand method, so supervision results are not automatically unwrapped
						const responses = await Promise.all(tasks);
						const results = responses.map((r) => {
							if (r instanceof SupervisionCCReport) {
								return r.toSupervisionResult();
							}
							return undefined;
						});
						// The call site may use a GET-type method, which does not make sense in a multicast context
						// The following will return `undefined` in that case
						return mergeSupervisionResults(results);
					};
			}
		},
	});
}
