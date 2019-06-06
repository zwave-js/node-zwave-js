import { TransformFunction } from "logform";
import * as winston from "winston";
const { colorize, combine, timestamp, simple } = winston.format;

// const logFormat = format.printf(info => {
// 	return `${info.timestamp} ${info.level}: ${info.message} --> ${info.label}`;
// });

const serialFormatter = {
	transform: (info => {
		return info;
	}) as TransformFunction,
};

export const serialLoggerFormat = combine(
	timestamp(),
	colorize({ all: true }),
	serialFormatter,
	simple(),
);

if (!winston.loggers.has("serial")) {
	winston.loggers.add("serial", {
		format: serialLoggerFormat,
		transports: [new winston.transports.Console({ level: "silly" })],
	});
}
