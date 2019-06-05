import { TransformFunction } from "logform";
import * as winston from "winston";
const { colorize, combine, timestamp, simple } = winston.format;

const serialFormatter = {
	transform: (info => {
		return info;
	}) as TransformFunction,
};

if (!winston.loggers.has("serial")) {
	winston.loggers.add("serial", {
		format: combine(
			timestamp(),
			colorize({ all: true }),
			serialFormatter,
			simple(),
		),
		transports: [new winston.transports.Console({ level: "silly" })],
	});
}
