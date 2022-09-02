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

	const { data: commits } = await github.rest.pulls.listCommits({
		...options,
		pull_number: context.issue.number,
	});

	if (commits.length > 1) {
		// Not necessary to do this.
		await github.rest.issues.createComment({
			...options,
			issue_number: context.payload.issue.number,
			body: `There is more than one commit - no need to rename it.`,
		});

		return false;
	}
	return true;
}
module.exports = main;
