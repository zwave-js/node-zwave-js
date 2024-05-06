const { ZnifferMessage, ZnifferDataMessage, ZnifferFrameType } = require(
	"@zwave-js/serial",
);
const { parseMPDU } = require("zwave-js/Zniffer");
const { parseBeamFrame } = require(
	"../packages/zwave-js/build/lib/zniffer/MPDU",
);

const data = Buffer.from(
	"210500003400e6",
	"hex",
);
const raw = ZnifferMessage.from({ data });
debugger;
if (raw instanceof ZnifferDataMessage) {
	if (raw.frameType === ZnifferFrameType.Data) {
		const mpdu = parseMPDU(raw);
		debugger;
	} else if (
		raw.frameType === ZnifferFrameType.BeamStart
		|| raw.frameType === ZnifferFrameType.BeamStop
	) {
		const beam = parseBeamFrame(raw);
		debugger;
	} else {
		console.error("unsupported frame type");
		debugger;
	}
}
