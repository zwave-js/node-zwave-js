// @ts-check

/// <reference path="types.d.ts" />

const { reviewers } = require("./users.cjs");
const { urls } = require("./utils.cjs");

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};

	if (process.env.RESULT === "unchanged") {
		await github.rest.issues.createComment({
			...options,
			issue_number: context.payload.issue.number,
			body: `❌ Sorry, importing the files yielded no changes.`,
		});
		return;
	}

	const pr = await github.rest.pulls.create({
		...options,
		head: process.env.branchname,
		base: "master",
		title: process.env.commitmessage,
		draft: true,
		body: `fixes: #${context.payload.issue.number}

**TODO:**
- [ ]	Change PR title to be more specific`,
		maintainer_can_modify: true,
	});
	const prNumber = pr.data.number;

	// Request review and add assignee
	await github.rest.pulls.requestReviewers({
		...options,
		pull_number: prNumber,
		reviewers: reviewers.config,
	});
	await github.rest.issues.addAssignees({
		...options,
		issue_number: prNumber,
		assignees: reviewers.config,
	});

	await github.rest.issues.createComment({
		...options,
		issue_number: context.payload.issue.number,
		body:
			`🔨 I created a PR at #${prNumber} - check it out! Usually, I'm going to need some help from a human to make sure the configuration matches the [style guide](${urls.styleGuide}).

If anyone feels compelled to help out, please follow these steps:

- Fork this repository if you haven't already. If you have, synchronize your fork so you get a copy of the new branch.
- Make the necessary changes in the branch \`${process.env.branchname}\` in your fork
- Create a pull request with your branch \`${process.env.branchname}\` as the source and our branch \`${process.env.branchname}\` as the target.

Thanks!`,
	});

	// Mark the issue as help wanted, so an explanation gets posted
	await github.rest.issues.addLabels({
		...options,
		issue_number: context.payload.issue.number,
		labels: ["help wanted"],
	});

	// Mark the PR as a "config draft"
	await github.rest.issues.addLabels({
		...options,
		issue_number: prNumber,
		labels: ["config draft 🤖"],
	});
}
module.exports = main;
