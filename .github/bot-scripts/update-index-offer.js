/// <reference path="types.d.ts" />
// @ts-check

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};
	const pr = context.payload.number;

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
		body: `🚧 It seems like you forgot to update the device index file 🚧
I should be able to that for you. If you want me to, just comment
\`@zwave-js-bot update index\``,
	});
}
module.exports = main;
