// Creates or updates a PR with a documentation update

// @ts-check
/// <reference path="../bot-scripts/types.d.ts" />

const exec = require("@actions/exec");

const options = {
	owner: "zwave-js",
	repo: "node-zwave-js",
};
const branchName = "docs/update-typed-docs";
const reviewers = ["AlCalzone"];
const assignees = [];

const checkPaths = ["docs/", "packages/*/*.api.md"];

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github } = param;

	// check if our local working copy has any changes in the docs directory
	const isChanged = !!(await exec.exec(
		"git",
		["diff", "--exit-code", "--", ...checkPaths],
		{
			ignoreReturnCode: true,
		},
	));

	// Check if a PR already exists
	const PRs = await github.rest.pulls.list({
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

	if (!isChanged && !branchExists) {
		console.log(
			`We have no local changes and no remote branch exists, exiting...`,
		);
		return;
	}

	// create new branch for PR
	await exec.exec("git", ["fetch", "origin"]);
	await exec.exec("git", ["checkout", "-b", `${branchName}`]);

	if (branchExists) {
		// check if our local working copy is different from the remote branch
		const isChanged = !!(await exec.exec(
			"git",
			[
				"diff",
				"--exit-code",
				`origin/${branchName}`,
				"--",
				...checkPaths,
			],
			{
				ignoreReturnCode: true,
			},
		));
		if (!isChanged && !!prNumber) {
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
	await exec.exec(
		"git",
		["commit", "-m", "docs: update typed documentation and API report"],
		// Don't care if this fails due to no changes
		{
			ignoreReturnCode: true,
		},
	);

	// And push it (real good)
	if (branchExists) {
		console.log(`Force-pushing to remote...`);
		await exec.exec("git", ["push", "origin", branchName, "--force"]);
	} else {
		console.log(`Pushing new branch...`);
		await exec.exec("git", [
			"push",
			"--set-upstream",
			"origin",
			branchName,
		]);
	}

	if (!prNumber) {
		// no PR exists, create one
		const pr = await github.rest.pulls.create({
			...options,
			head: branchName,
			base: "master",
			title: "docs: update typed documentation and API report 🤖",
			body:
				`The auto-generated documentation and/or API reports have changed. Please review the changes and merge them if desired.`,
			maintainer_can_modify: true,
		});
		prNumber = pr.data.number;
	}
	// Request review and add assignee
	if (reviewers.length) {
		await github.rest.pulls.requestReviewers({
			...options,
			pull_number: prNumber,
			reviewers,
		});
	}
	if (assignees.length) {
		await github.rest.issues.addAssignees({
			...options,
			issue_number: prNumber,
			assignees,
		});
	}
}
module.exports = main;
