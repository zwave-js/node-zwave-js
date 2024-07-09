// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="ts-pegjs.d.ts" />

import { formatWithDprint } from "@zwave-js/maintenance";
import * as fs from "fs";
import * as path from "path";
import pegjs from "pegjs";
import pegts from "ts-pegjs";

const sourceDir = path.join(__dirname, "../src");
const grammarFilename = path.join(sourceDir, "logic.pegjs");

const grammar = fs.readFileSync(grammarFilename, "utf8");
const parserCode = pegjs.generate(grammar, {
	output: "source",
	plugins: [pegts],
}) as any as string;

let code = `// THIS FILE WAS AUTO GENERATED
/* eslint-disable */
// @ts-nocheck

${parserCode}`;

const logicParserFilename = path.join(sourceDir, "LogicParser.ts");
code = formatWithDprint(logicParserFilename, code);

fs.writeFileSync(logicParserFilename, code, "utf8");
