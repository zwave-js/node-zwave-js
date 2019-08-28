(async function main() {
	const exec = require('@actions/exec');

	let ccTable = '';

	const options = {};
	options.listeners = {
		stdout: (data) => {
			ccTable += data.toString();
		},
	};

	await exec.exec('npm', ['run', 'gh-cc-table'], options);

	ccTable = ccTable.split("\n").filter(line => line.startsWith("| ")).join("\n");
	console.error();
	console.error("FILTERED:");
	console.error(ccTable);
})();
