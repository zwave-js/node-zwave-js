import fs from "fs-extra";
import { createParser } from "./NVMParser";

void (async () => {
	const nvm = await fs.readFile("NVM_zstick5_1.02.bin");
	const parser = createParser(nvm);
	debugger;
})();
