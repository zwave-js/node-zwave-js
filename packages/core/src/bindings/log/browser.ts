import colors from "ansi-colors";
import { MESSAGE } from "triple-beam";
import { colorizer } from "../../log/Colorizer.js";
import {
	type LogFormat,
	combine,
	formatLogMessage,
	label,
	printLogMessage,
	timestamp,
} from "../../log/format.js";
import {
	type LogConfig,
	type LogContext,
	type LogFactory,
	type ZWaveLogInfo,
	timestampFormatShort,
} from "../../log/shared.js";
import { type LogContainer, type ZWaveLogger } from "../../log/traits.js";

colors.enabled = true;

function createLoggerFormat(
	channel: string,
	colorize: boolean,
	shortTimestamps: boolean,
): LogFormat {
	const formats = [
		label(channel),
		shortTimestamps
			? timestamp(timestampFormatShort)
			: timestamp(),
		formatLogMessage,
		colorize ? colorizer(false) : undefined,
		printLogMessage(shortTimestamps),
	].filter((f) => f != undefined);
	return combine(...formats);
}

class ConsoleLogContainer implements LogContainer {
	#loggers = new Map<string, ZWaveLogger>();

	updateConfiguration(_config: Partial<LogConfig>): void {
		// noop
	}
	getConfiguration(): LogConfig {
		return {
			enabled: true,
			level: "debug",
			transports: [],
			logToFile: false,
			filename: "zwavejs.log",
			forceConsole: false,
			maxFiles: 0,
		};
	}
	destroy(): void {
		// noop
	}
	getLogger<TContext extends LogContext = LogContext<string>>(
		label: string,
	): ZWaveLogger<TContext> {
		if (!this.#loggers.has(label)) {
			const format = createLoggerFormat(label, true, false);
			this.#loggers.set(label, {
				log: (info: ZWaveLogInfo<LogContext>) => {
					info = format.transform(info);
					if (info.level === "error") {
						console.error(info[MESSAGE]);
					} else {
						console.log(info[MESSAGE]);
					}
				},
			});
		}
		return this.#loggers.get(label)!;
	}
	isLoglevelVisible(loglevel: string): boolean {
		return loglevel !== "silly";
	}
	isNodeLoggingVisible(_nodeId: number): boolean {
		return true;
	}
}

export const log: LogFactory = (_config?: Partial<LogConfig>) =>
	new ConsoleLogContainer();
