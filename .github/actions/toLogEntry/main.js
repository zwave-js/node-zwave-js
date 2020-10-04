const c = require("ansi-colors");
const exec = require("@actions/exec");
const github = require("@actions/github");
const core = require("@actions/core");

const githubToken = core.getInput("githubToken");
const octokit = github.getOctokit(githubToken);
const context = github.context;

(async function main() {
	let result = "";

	/** @type {exec.ExecOptions} */
	const options = {
		listeners: {
			stderr: data => {
				result += data.toString();
			},
		},
	};

	await exec.exec("npm", ["run", "toLogEntryOverview"], options);

	const { data: { body: oldBody } } = await octokit.issues.get({
		...context.repo,
		issue_number: 54,
	});

	const newBody = `current implementation status:

${result}`;

	if (oldBody !== newBody) {
		await octokit.issues.update({
			...context.repo,
			issue_number: 54,
			body: newBody,
			// Auto-close or open the issue when everything is done (or not)
			state: result.trim().endsWith(":)") ? "closed" : "open"
		});
		console.error(c.green("The implementation status was updated!"));
	} else {
		console.error(c.yellow("No changes to the implementation status!"));
	}
})();
