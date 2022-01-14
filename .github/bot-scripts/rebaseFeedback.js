// @ts-check

/// <reference path="types.d.ts" />

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};

	let feedbackText;
	if (process.env.FEEDBACK === "error") {
		feedbackText = `❌ I tried my best, but unfortunately this branch cannot be rebased automatically.`;
	} else {
		return;
	}

	await github.rest.issues.createComment({
		...options,
		issue_number: context.payload.issue.number,
		body: feedbackText,
	});
}
module.exports = main;
