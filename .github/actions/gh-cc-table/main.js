const c = require("ansi-colors");
const exec = require('@actions/exec');

(async function main() {

	let ccTable = '';

	const options = {};
	options.listeners = {
		stdout: (data) => {
			ccTable += data.toString();
		},
	};

	await exec.exec('npm', ['run', 'gh-cc-table'], options);

	ccTable = ccTable.split("\n").filter(line => line.startsWith("| ")).join("\n");
	ccTable = c.stripColor(ccTable);

	console.error()
	console.error("FILTERED:");
	console.error(ccTable);
})();
