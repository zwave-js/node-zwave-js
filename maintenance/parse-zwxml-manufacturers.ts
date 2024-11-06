import { formatId } from "@zwave-js/shared";
import { isArray } from "alcalzone-shared/typeguards";
import fs from "node:fs/promises";
import xml2js from "xml2js";

type Manufacturer =
	& {
		id: number;
	}
	& ({
		name: string;
		formerNames?: { formerName: string }[];
		reserved?: undefined;
	} | {
		reserved: boolean;
	});

const xmlParserOptions_default: xml2js.ParserOptions = {
	normalize: true,
	// Don't separate xml attributes from children
	mergeAttrs: true,
	// We normalize to arrays where necessary, no need to do it globally
	explicitArray: false,
	explicitRoot: false,

	attrValueProcessors: [
		function parseReserved(value, name) {
			if (name === "reserved") return value === "true";
			return value;
		},
		function parseId(value, name) {
			if (name === "id") return parseInt(value, 16);
			return value;
		},
	],
};

async function main() {
	const { manufacturer }: { manufacturer: Manufacturer[] } = await xml2js
		.parseStringPromise(
			await fs.readFile("zw_manufacturers.xml", "utf8"),
			xmlParserOptions_default,
		);
	const manufacturers = manufacturer.filter((
		m,
	): m is Manufacturer & { reserved: undefined } => !m.reserved);

	const text = `{
${
		manufacturers.map((m) => {
			let former = "";
			if (m.formerNames) {
				if (!isArray(m.formerNames)) {
					m.formerNames = [m.formerNames];
				}
				former = ` // formerly: ${
					m.formerNames.map((f) => f.formerName).join(", ")
				}`;
			}
			return `	"${formatId(m.id)}": "${
				m.name.replaceAll("\"", "\\\"")
			}",${former}`;
		}).join("\n")
	}
}`;
	const output = text; // formatWithDprint("manufacturers.json", text);

	await fs.writeFile("packages/config/config/manufacturers.json", output);
}
void main();
