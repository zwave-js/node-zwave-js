import { getCCName } from "@zwave-js/core";
import fs from "node:fs/promises";
import xml2js from "xml2js";

const xmlParserOptions_default: xml2js.ParserOptions = {
	normalize: true,
	// Don't separate xml attributes from children
	mergeAttrs: true,
	// We normalize to arrays where necessary, no need to do it globally
	explicitArray: false,
	explicitRoot: false,
	attrValueProcessors: [
		function parseVersion(value, name) {
			if (name === "version") return parseInt(value, 10);
			return value;
		},
	],
};

async function main() {
	const { cmd_class } = await xml2js
		.parseStringPromise(
			await fs.readFile("zwave.xml", "utf8"),
			xmlParserOptions_default,
		);

	const ccs = new Map<string, any>();
	for (const cc of cmd_class) {
		if (ccs.has(cc.key) && ccs.get(cc.key).version > cc.version) {
			continue;
		}
		ccs.set(cc.key, cc);
		const ccId = parseInt(cc.key, 16);
		let ccName = getCCName(ccId);
		if (ccName.startsWith("unknown")) {
			ccName = cc.help.replace(/Command Class /i, "");
		}
		cc.name = ccName;
	}

	const allCCs = [...ccs.values()].sort((a, b) =>
		a.name.localeCompare(b.name)
	);

	const implemented = `{
${
		allCCs.map((cc) => {
			let info = "";
			if (cc.comment?.toLowerCase().includes("deprecated")) {
				info = ", deprecated: true";
			} else if (cc.comment?.toLowerCase().includes("obsoleted")) {
				info = ", obsolete: true";
			}
			return `	"${cc.key}": { version: ${cc.version}${info} }, // ${cc.name}`;
		}).join("\n")
	}
}`;

	await fs.writeFile("implemented.txt", implemented);

	const enumm = allCCs.map((cc) => `	"${cc.name}" = ${cc.key},`).join(
		"\n",
	);

	await fs.writeFile("enum.txt", enumm);
}
void main();
