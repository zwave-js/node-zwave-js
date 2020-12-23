const c = require("ansi-colors");
const exec = require("@actions/exec");
const github = require("@actions/github");
const core = require("@actions/core");

const githubToken = core.getInput("githubToken");
const octokit = github.getOctokit(githubToken);
const context = github.context;

(async function main() {
	let ccTable = "";

	const options = {};
	options.listeners = {
		stdout: data => {
			ccTable += data.toString();
		},
	};

	await exec.exec("yarn", ["run", "implemented_ccs", "--flavor=github"], options);

	ccTable = ccTable
		.split("\n")
		.filter(line => line.startsWith("| "))
		.join("\n");
	ccTable = c.stripColor(ccTable);

	const { data: { body: oldBody } } = await octokit.issues.get({
		...context.repo,
		issue_number: 6,
	});

	const newBody = ccTable;

	if (oldBody !== newBody) {
		await octokit.issues.update({
			...context.repo,
			issue_number: 6,
			body: newBody,
		});
		console.error(c.green("The implementation table was updated!"));
	} else {
		console.error(c.yellow("No changes to the implementation table!"));
	}
})();
