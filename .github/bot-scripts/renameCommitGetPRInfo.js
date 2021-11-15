// @ts-check
/// <reference path="types.d.ts" />

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const request = {
		owner: context.repo.owner,
		repo: context.repo.repo,
		pull_number: context.issue.number,
	};

	const { data: pull } = await github.rest.pulls.get(request);
	return {
		repo: pull.head.repo.full_name,
		ref: pull.head.ref,
		title: pull.title,
	};
}
module.exports = main;
