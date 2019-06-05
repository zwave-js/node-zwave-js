const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, prettyPrint } = format;

const logFormat = format.printf(info => {
	return `${info.timestamp} ${info.level}: ${info.message} --> ${info.label}`;
});

const logger = createLogger({
	format: combine(
		label({ label: "right meow!" }),
		timestamp(),
		format.colorize({ all: true }),
		format.padLevels(),
		logFormat,
	),
	transports: [
		new transports.Console({ level: "debug" }),
	],
});

logger.info("What time is the testing at?");
logger.error("What time is the testing really at?");
