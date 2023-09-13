// @ts-check
const { MockServer } = require("../build/mockServer");
const { readFileSync, statSync, readdirSync } = require("fs");
const path = require("path");

// Allow putting .js mock configs outside the repo
const { createRequire } = require("module");
const childRequire = createRequire(module.filename);

const args = process.argv.slice(2);

/** @returns {never} */
function printUsage() {
	// Print a help text explaining the usage of this script and mention the options it supports
	console.log(`
Usage: node ${path.basename(__filename)} [options]

Options:
  -h, --help        Displays this help
  -i, --interface   The network interface to bind to. Default: all interfaces
  -p, --port        The port to bind to. Default: 5555
  -c, --config      Path to a single config file, or a directory with config
                    files. Config files have extension .js or .json and define
                    the mock(s)

`);
	throw process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
	throw printUsage();
}

/** @param {{filename: string; config: Record<string, any>}[]} files */
function mergeConfigFiles(files) {
	// Make sure that only one of the files defines the controller behavior
	const filesWithControllerMock = files.filter((f) => !!f.config.controller);
	if (filesWithControllerMock.length > 1) {
		console.error(`
Only one of the config files may define the controller behavior, but the following files do:
${filesWithControllerMock.map((f) => `- ${f.filename}\n`).join()}
`);

		process.exit(1);
	}

	// Remember the whole config file for each node, so we can give an error message when a node ID is duplicated
	const nodeConfigFiles = new Map();
	for (const file of files) {
		if (!file.config.nodes) continue;
		for (const nodeConfig of file.config.nodes) {
			if (!nodeConfigFiles.has(nodeConfig.id)) {
				nodeConfigFiles.set(nodeConfig.id, file);
			} else {
				console.error(`
Each node ID may only be used once in mock configs. Node ID ${nodeConfig.id} is duplicated in the following files:
- ${nodeConfigFiles.get(nodeConfig.id).filename}
- ${file.filename}
`);

				process.exit(1);
			}
		}
	}

	const mergedConfig = {};
	if (filesWithControllerMock.length) {
		mergedConfig.controller = filesWithControllerMock[0].config.controller;
	}

	for (const [nodeId, file] of nodeConfigFiles) {
		mergedConfig.nodes ??= [];
		mergedConfig.nodes.push(file.config.nodes.find((n) => n.id === nodeId));
	}
	mergedConfig.nodes?.sort((a, b) => a.id - b.id);

	return mergedConfig;
}

/**
 * @param {string} filename
 */
function getConfig(filename) {
	if (filename.endsWith(".js")) {
		// The export can either be a static config object or a function that accepts a require
		let config = require(filename).default;
		if (typeof config === "function") {
			config = config({ require: childRequire });
		}
		return config;
	} else if (filename.endsWith(".json")) {
		// TODO: JSON5 support
		return JSON.parse(readFileSync(filename, "utf8"));
	}
}

// Parse config
const configIndex = args.findIndex((arg) => arg === "--config" || arg === "-c");
const configPath = configIndex === -1 ? undefined : args[configIndex + 1];
if (configIndex !== -1 && !configPath) {
	throw printUsage();
}

let config;
if (configPath) {
	const absolutePath = path.isAbsolute(configPath)
		? configPath
		: path.join(process.cwd(), configPath);

	const isDir = statSync(absolutePath).isDirectory();

	if (isDir) {
		// Read all .js and .json files from the directory and merge them
		const files = readdirSync(absolutePath)
			.filter(
				(filename) =>
					filename.endsWith(".js") || filename.endsWith(".json"),
			)
			.map((filename) => {
				const fullPath = path.join(absolutePath, filename);
				return {
					filename: fullPath,
					config: getConfig(fullPath),
				};
			});
		if (!files.length) {
			console.error(`
No config files found in ${absolutePath}
`);
			process.exit(1);
		}
		config = mergeConfigFiles(files);
	} else {
		// This is a single config file, just load it
		config = getConfig(absolutePath);
	}
}

// Parse interface
const interfaceIndex = args.findIndex(
	(arg) => arg === "--interface" || arg === "-i",
);
const interface = interfaceIndex === -1 ? undefined : args[interfaceIndex + 1];

// Parse port
const portIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
let port = portIndex === -1 ? undefined : parseInt(args[portIndex + 1]);
if (Number.isNaN(port)) port = undefined;

let server;
(async () => {
	server = new MockServer({
		interface,
		port,
		config,
	});
	await server.start();
})();

process.on("SIGINT", async () => {
	await server.stop();
	process.exit(0);
});
