/// <reference path="types.d.ts" />
// @ts-check

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

	if (context.payload.issue.html_url.includes("/pulls/")) {
		github.log.info("Comment appears in a PR, retrieving PR info...");
		// Only the pull request author and authorized users may execute this command
		const { data: pull } = await github.pulls.get({
			...options,
			pull_number: context.payload.issue.number,
		});

		const allowed = [...authorizedUsers, pull.user.login];
		const commenting = context.payload.comment.user.login;
		github.log.info(`Authorized users: ${allowed.join(", ")}`);
		github.log.info(`Commenting user: ${commenting}`);
		const isAuthorized = allowed.includes(commenting);
		github.log.info(`Is authorized: ${isAuthorized}`);

		if (!isAuthorized) return false;
	} else {
		// In issues, only the authorized users may execute any commands
		github.log.info("Comment appears in an issue");

		const commenting = context.payload.comment.user.login;
		github.log.info(`Authorized users: ${authorizedUsers.join(", ")}`);
		github.log.info(`Commenting user: ${commenting}`);
		const isAuthorized = authorizedUsers.includes(commenting);
		github.log.info(`Is authorized: ${isAuthorized}`);

		if (!isAuthorized) return false;
	}

	// Let the user know we're working on it
	await github.reactions.createForIssueComment({
		...options,
		comment_id: context.payload.comment.id,
		content: "rocket",
	});

	return true;
}
module.exports = main;
