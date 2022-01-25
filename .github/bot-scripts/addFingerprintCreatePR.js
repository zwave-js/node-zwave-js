// @ts-check

/// <reference path="types.d.ts" />

const { reviewers } = require("./users");

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
			body: `❌ Sorry, adding the fingerprint yielded no changes.`,
		});
		return;
	}

	const pr = await github.rest.pulls.create({
		...options,
		head: process.env.branchname,
		base: "master",
		title: process.env.commitmessage,
		body: `fixes: #${context.payload.issue.number}`,
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
		body: `🔨 I created a PR at #${prNumber} - check it out!`,
	});
}
module.exports = main;
