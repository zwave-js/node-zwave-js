// @ts-check
const { MockServer } = require("../build/Testing");
const { readFileSync } = require("fs");
const path = require("path");

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
	// Print a help text explaining the usage of this script and mention the options it supports
	console.log(`
Usage: node ${path.basename(__filename)} [options]

Options:
  -h, --help        Displays this help
  -i, --interface   The network interface to bind to. Default: all interfaces
  -p, --port        The port to bind to. Default: 5555
  -c, --config      Path to a config file (either .js or .json), which defines the mock

`);
	process.exit(0);
}

// Parse config
const configIndex = args.findIndex((arg) => arg === "--config" || arg === "-c");
const configPath = configIndex === -1 ? undefined : args[configIndex + 1];
let config;
if (configPath?.endsWith(".js")) {
	config = require(path.join(process.cwd(), configPath)).default;
} else if (configPath?.endsWith(".json")) {
	// TODO: JSON5 support
	config = JSON.parse(readFileSync(configPath, "utf8"));
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
