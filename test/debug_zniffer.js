const { ZnifferMessage, ZnifferDataMessage } = require("@zwave-js/serial");
const { parseMPDU } = require("zwave-js/Zniffer");

const data = Buffer.from(
	"2101000063093121030fd14ca7c90011010f03019efab4671b",
	"hex",
);
const raw = ZnifferMessage.from({ data });
debugger;
if (raw instanceof ZnifferDataMessage) {
	const mpdu = parseMPDU(raw);
	debugger;
}
