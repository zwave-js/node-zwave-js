# Custom log transports

Z-Wave JS offers the possibility to add custom log transports. This can be useful if you want to integrate the logging with the parent application or your own logging system.

To do so, pass one or more custom log transports in the `transports` option of the `LogConfig`:

```ts
const myTransport = TODO_getMyTransportSomewhere();

const driver = new Driver(port, {
	logConfig: {
		// Disable internal transports
		enabled: false,
		// and log to the custom transport
		transports: [myTransport],
	},
	// ... other options
});
```

This transport must be a [`winston`](https://github.com/winstonjs/winston) transport. You can use any of the predefined transports from `winston` or create your own. For example, you can log to a stream that is consumed elsewhere:

```ts
import { createDefaultTransportFormat } from "@zwave-js/core";
import winston from "winston";
import { Writable } from "stream";

const stream: Writable = TODO_getStreamSomehow();

const myTransport = new winston.transports.Stream({
	stream,
	format: createDefaultTransportFormat(
		/* colorize: */ true,
		/* shortTimestamps: */ true,
	),
});
```

The transport format is responsible for formatting the log output and **MUST** be specified on each transport. To reuse the formatting that Z-Wave JS has, use the `createDefaultTransportFormat` function from `@zwave-js/core`. It accepts two parameters:

-   `colorize`: Whether log outputs should be colorized using ANSI escape codes. This can be useful if you log to a terminal.
-   `shortTimestamps`: Whether the timestamps should include only the time (`true`) or also the date (`false`).

The [`log-transports` repository](https://github.com/zwave-js/log-transports) cotnains a few predefined transports that you can use.

## `JSONTransport`

The `JSONTransport` preserves most of the original `ZWaveLogInfo` object and optionally formats the message (if the transport format is specified). It is similar to the `Stream` transport and can be used as follows:

```ts
import { JSONTransport } from "@zwave-js/log-transport-json";

const transport = new JSONTransport();

// optionally format the messages:
transport.format = createDefaultTransportFormat(
	/* colorize: */ true,
	/* shortTimestamps: */ true,
);

// pass the transport to the driver (see above)

// handle the log events
transport.stream.on("data", (data) => {
	// data is a ZWaveLogInfo
});
```

where the `ZWaveLogInfo` objects have the following structure:

```ts
interface ZWaveLogInfo {
	// Whether the log message represents something incoming or outgoing
	direction: string;
	// Primary tags
	primaryTags?: string;
	// Secondary tags
	secondaryTags?: string;
	timestamp?: string;
	// A label identifying the source of the log message, e.g. DRIVER, SERIAL, ...
	label?: string;
	// The log message. This will be a formatted string if the transport format is specified.
	message: string | string[];
	// Log-message specific metadata. Their contents depend on what is being logged.
	context: TContext;
}
```

## `LogfmtTransport`

The `LogfmtTransport` formats the log messages as [logfmt](https://brandur.org/logfmt) and can be used as follows:

```ts
import { LogfmtTransport } from "@zwave-js/log-transport-logfmt";

const transport = new LogfmtTransport();
// pass the transport to the driver (see above)
```

It needs no special format and it simply logs to STDOUT.
