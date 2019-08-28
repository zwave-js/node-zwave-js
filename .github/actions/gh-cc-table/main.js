const c = require("ansi-colors");
const exec = require('@actions/exec');
const github = require('@actions/github');
const core = require('@actions/core');

const githubToken = core.getInput('githubToken');
const octokit = new github.GitHub(githubToken);
const context = github.context;

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

	const { data: { body } } = await octokit.issues.get({
		...context.repo,
		issue_number: 6,
	});
	console.error()
	console.error("ISSUE BODY:");
	console.error(body);

	console.error()
	console.error("NEW BODY:");
	const newBody = `
The following command classes are not implemented or incomplete:

${ccTable}

*this file was generated with* 
\`\`\`bash
npm run gh-cc-table
\`\`\`
`;
	console.error(newBody);

})();
