import {
	ZWaveLogContainer,
	createDefaultTransportFormat,
} from "@zwave-js/core";
import { SpyTransport, assertMessage } from "@zwave-js/core/test";
import { SerialLogger } from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";
import colors from "ansi-colors";
import { pseudoRandomBytes } from "node:crypto";
import { beforeAll, beforeEach, test } from "vitest";

interface TestContext {
	serialLogger: SerialLogger;
	spyTransport: SpyTransport;
}

const test = ava as TestFn<TestContext>;

beforeAll((t) => {
	// Replace all defined transports with a spy transport
	const spyTransport = new SpyTransport();
	spyTransport.format = createDefaultTransportFormat(true, true);
	const serialLogger = new SerialLogger(
		new ZWaveLogContainer({
			transports: [spyTransport],
		}),
	);
	// Uncomment this to debug the log outputs manually
	// wasSilenced = unsilence(serialLogger);

	t.context = {
		serialLogger,
		spyTransport,
	};
});

// Don't spam the console when performing the other tests not related to logging
afterAll((t) => {
	t.context.serialLogger.container.updateConfiguration({ enabled: false });
});

beforeEach((t) => {
	t.context.spyTransport.spy.resetHistory();
});

test.sequential("logs single-byte messages correctly: inbound ACK", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.ACK("inbound");
	const alignRight = " ".repeat(80 - 14);
	assertMessage(t, spyTransport, {
		message: `« [ACK] ${alignRight}(0x06)`,
	});
});

test.sequential("logs single-byte messages correctly: outbound ACK", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.ACK("outbound");
	const alignRight = " ".repeat(80 - 14);
	assertMessage(t, spyTransport, {
		message: `» [ACK] ${alignRight}(0x06)`,
	});
});

test.sequential("logs single-byte messages correctly: inbound NAK", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.NAK("inbound");
	const alignRight = " ".repeat(80 - 14);
	assertMessage(t, spyTransport, {
		message: `« [NAK] ${alignRight}(0x15)`,
	});
});

test.sequential("logs single-byte messages correctly: outbound NAK", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.NAK("outbound");
	const alignRight = " ".repeat(80 - 14);
	assertMessage(t, spyTransport, {
		message: `» [NAK] ${alignRight}(0x15)`,
	});
});

test.sequential("logs single-byte messages correctly: inbound CAN", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.CAN("inbound");
	const alignRight = " ".repeat(80 - 14);
	assertMessage(t, spyTransport, {
		message: `« [CAN] ${alignRight}(0x18)`,
	});
});

test.sequential("logs single-byte messages correctly: outbound CAN", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.CAN("outbound");
	const alignRight = " ".repeat(80 - 14);
	assertMessage(t, spyTransport, {
		message: `» [CAN] ${alignRight}(0x18)`,
	});
});

for (const msg of ["ACK", "NAK", "CAN"] as const) {
	test.sequential(`colors single-byte messages like tags: ${msg}`, (t) => {
		const { serialLogger, spyTransport } = t.context;
		serialLogger[msg]("inbound");

		const expected1 = colors.blue(
			colors.bgBlue("[") + colors.inverse(msg) + colors.bgBlue("]"),
		);
		assertMessage(t, spyTransport, {
			predicate: (msg) => msg.includes(expected1),
			ignoreColor: false,
		});
	});
}

test.sequential("logs raw data correctly: short buffer, inbound", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.data("inbound", Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
	const alignRight = " ".repeat(80 - 30);
	assertMessage(t, spyTransport, {
		message: `« 0x0102030405060708 ${alignRight}(8 bytes)`,
	});
});

test.sequential("logs raw data correctly: short buffer, outbound", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.data("outbound", Uint8Array.from([0x55, 4, 3, 2, 1]));
	const alignRight = " ".repeat(80 - 24);
	assertMessage(t, spyTransport, {
		message: `» 0x5504030201 ${alignRight}(5 bytes)`,
	});
});

test.sequential("wraps longer buffers into multiple lines", (t) => {
	const { serialLogger, spyTransport } = t.context;
	// We have room for 67 chars in the first line
	const expected = pseudoRandomBytes(39);
	const hexBuffer = `0x${expected.toString("hex")}`;
	const expectedLine1 = hexBuffer.slice(0, 67);
	const expectedLine2 = hexBuffer.slice(67);
	serialLogger.data("inbound", expected);
	assertMessage(t, spyTransport, {
		message: `« ${expectedLine1} (39 bytes)
  ${expectedLine2}`,
	});
});

test.sequential("correctly groups very long lines", (t) => {
	const { serialLogger, spyTransport } = t.context;
	// We have room for 67 chars in the first line, that is 32.5 bytes
	// and 78 chars (39 bytes) in each following line
	const expected = pseudoRandomBytes(72);
	const hexBuffer = `0x${expected.toString("hex")}`;
	const expectedLine1 = hexBuffer.slice(0, 67);
	const expectedLine2 = hexBuffer.slice(67, 67 + 78);
	const expectedLine3 = hexBuffer.slice(67 + 78);
	serialLogger.data("inbound", expected);
	assertMessage(t, spyTransport, {
		message: `« ${expectedLine1} (72 bytes)
  ${expectedLine2}
  ${expectedLine3}`,
	});
});

test.sequential("logs discarded data correctly", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.discarded(Bytes.from("02020202020202", "hex"));
	const alignRight = " ".repeat(80 - 53);
	assertMessage(t, spyTransport, {
		message:
			`« [DISCARDED] invalid data 0x02020202020202 ${alignRight}(7 bytes)`,
	});
});

test.sequential("logs short messages correctly", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.message("Test");
	assertMessage(t, spyTransport, {
		message: `  Test`,
	});
});

test.sequential("logs long messages correctly", (t) => {
	const { serialLogger, spyTransport } = t.context;
	serialLogger.message(
		"This is a very long message that should be broken into multiple lines maybe sometimes...",
	);
	assertMessage(t, spyTransport, {
		message:
			`  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
	});
});
