const { authorizedUsers } = require("./authorizedUsers");

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;
	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};
	const { data: pull } = await github.pulls.get({
		...options,
		pull_number: context.payload.issue.number,
	});

	// Only the pull request author and authorized users may execute this command
	if (
		![...authorizedUsers, pull.user.login].includes(
			context.payload.comment.user,
		)
	) {
		process.exit(1);
	}

	// Let the user know we're working on it
	await github.reactions.createForIssueComment({
		...options,
		comment_id: context.payload.comment.id,
		content: "rocket",
	});
}
module.exports = main;
