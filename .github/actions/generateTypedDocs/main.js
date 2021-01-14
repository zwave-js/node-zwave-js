const exec = require("@actions/exec");
const github = require("@actions/github");
const core = require("@actions/core");

const githubToken = core.getInput("githubToken");
const octokit = github.getOctokit(githubToken);

const options = {
	owner: "zwave-js",
	repo: "node-zwave-js",
};
const branchName = "docs/update-typed-docs";
const reviewers = ["AlCalzone", "robertsLando"];
const assignees = [
	// "AlCalzone",
	// "robertsLando",
];

(async function main() {
	// check if our local working copy has any changes in the docs directory
	const isChanged = !(await exec.exec(
		"git",
		["diff", "--exit-code", "--", "docs/"],
		{
			ignoreReturnCode: true,
		},
	));
	if (isChanged) {
		console.log(`We have no local changes, exiting...`);
		return;
	}

	// Check if a PR already exists
	const PRs = await octokit.pulls.list({
		...options,
		state: "open",
		head: `zwave-js:${branchName}`,
	});
	const firstPR = PRs.data[0];
	let prNumber = firstPR && firstPR.number;

	// Check if the action's branch exists on the remote (exit code 0) or not (exit code 2)
	const branchExists = !(await exec.exec(
		"git",
		["ls-remote", "--exit-code", "--heads", "origin", branchName],
		{
			ignoreReturnCode: true,
		},
	));

	// create new branch for PR
	await exec.exec("git", ["checkout", "-b", `${branchName}`]);

	if (branchExists) {
		// check if our local working copy is different from the remote branch
		const isChanged = !(await exec.exec(
			"git",
			["diff", "--exit-code", `origin/${branchName}`, "--", "docs/"],
			{
				ignoreReturnCode: true,
			},
		));
		if (isChanged && !!prNumber) {
			console.log(
				`We have no local changes compared to the remote branch and PR exists, exiting...`,
			);
			return;
		}

		// point the local branch to the remote branch
		await exec.exec("git", ["branch", "-u", `origin/${branchName}`]);
	}

	// Would the real Al Calzone please stand up?
	await exec.exec("git", [
		"config",
		"--global",
		"user.email",
		"d.griesel@gmx.net",
	]);
	await exec.exec("git", ["config", "--global", "user.name", "Al Calzone"]);

	// Create a commit
	await exec.exec("git", ["add", "."]);
	await exec.exec("git", [
		"commit",
		"-m",
		"docs: update typed documentation",
	]);

	// And push it (real good)
	if (branchExists) {
		await exec.exec("git", ["push", "-f"]);
	} else {
		await exec.exec("git", [
			"push",
			"--set-upstream",
			"origin",
			branchName,
		]);
	}

	if (!prNumber) {
		// no PR exists, create one
		const pr = await octokit.pulls.create({
			...options,
			head: branchName,
			base: "master",
			title: "docs: update typed documentation 🤖",
			body: `The auto-generated documentation has changed. Please review the changes and merge them if desired.`,
			maintainer_can_modify: true,
		});
		prNumber = pr.data.number;
	}
	// Request review and add assignee
	if (reviewers.length) {
		await octokit.pulls.requestReviewers({
			...options,
			pull_number: prNumber,
			reviewers,
		});
	}
	if (assignees.length) {
		await octokit.issues.addAssignees({
			...options,
			issue_number: prNumber,
			assignees,
		});
	}
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
