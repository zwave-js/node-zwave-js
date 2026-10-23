import { test } from "vitest";

import { Bytes } from "./Bytes.js";
import { readTextFile } from "./fs.js";

test("readTextFile() strips a leading byte order mark", async (t) => {
	const fs = {
		readFile: () => Promise.resolve(Bytes.from("efbbbf7b7d", "hex")),
	};
	t.expect(await readTextFile(fs, "file.json")).toBe("{}");
});
