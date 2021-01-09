/// <reference path="types.d.ts" />
// @ts-check

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;
	// Download job logs
	const { data: log } = await github.request(
		`https://api.github.com/repos/${context.repo.owner}/${context.repo.repo}/actions/jobs/${context.payload.check_run.id}/logs`,
	);

	// Check if the --fix option can do something
	if (!log.includes("--fix") && !log.includes("Forgot to run Prettier?"))
		return;
	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};
	const pr = context.payload.check_run.pull_requests[0].number;

	// In order not to post this help too often, check if the bot has commented in the last 12 hours
	const { data: comments } = await github.issues.listComments({
		...options,
		issue_number: pr,
		since: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
	});
	if (comments.some((c) => c.user.login === "zwave-js-bot")) return;

	await github.issues.createComment({
		...options,
		issue_number: pr,
		body: `🚧 It seems like this PR has lint errors 🚧
I should be able to fix them for you. If you want me to, just comment
\`@zwave-js-bot fix lint\``,
	});
}
module.exports = main;
