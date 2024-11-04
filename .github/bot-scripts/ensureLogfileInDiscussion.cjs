// @ts-check

/// <reference path="types.d.ts" />

const zjsLogRegex =
	/\[.*\]\(http.*(zwavejs_|zwave_js|zwave-js-ui-store).*\.(log|txt|zip|t?gz|(log|txt)\.(zip|t?gz))\)/;
const markdownLinkRegex = /\[.*\]\(http.*\)/;
const codeBlockRegex = /`{3,4}(.*?)`{3,4}/s;

const LOGFILE_COMMENT_TAG = "<!-- LOGFILE_COMMENT_TAG -->";

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const discussion = context.payload.discussion;
	if (!discussion) return;

	const user = discussion.user.login;
	const body = discussion.body;
	const categorySlug = discussion.category.slug;

	console.log(`Discussion created: ${discussion.number}`);
	console.log(`categorySlug: ${categorySlug}`);

	// Only check for logfiles in categories that require one
	if (categorySlug !== "request-support-investigate-issue") return;

	let message = "";
	let hasZjsLog = false;

	const logfileSectionHeader = "### Upload Logfile";
	if (body.includes(logfileSectionHeader)) {
		const logfileSection = body.slice(
			body.indexOf(logfileSectionHeader) + logfileSectionHeader.length,
		);
		const hasLink = markdownLinkRegex.test(logfileSection);
		hasZjsLog = zjsLogRegex.test(logfileSection);
		const codeBlockContent = codeBlockRegex.exec(logfileSection)?.[1]
			?.trim() ?? "";

		console.log(`logfileSection: ${logfileSection}`);
		console.log(`hasLink: ${hasLink}`);
		console.log(`hasZjsLog: ${hasZjsLog}`);
		console.log(
			`codeBlockContent (matches = ${
				codeBlockRegex.test(codeBlockContent)
			}): ${codeBlockContent}`,
		);

		if (!hasZjsLog) {
			if (codeBlockContent) {
				if (codeBlockContent.split("\n").length > 20) {
					// This code block is too long and should be a logfile instead
					message = `👋 Hey @${user}!

It looks like you copied the contents of a logfile. Please attach it as a file instead, so it is easier to work with.
_Note: You can just drag & drop files into the textbox. Just make sure to use a supported file extension like \`.log\` or \`.txt\`_`;
				}
			} else if (hasLink) {
				// This doesn't look like a driver logfile
				message = `👋 Hey @${user}!

It looks like you attached a logfile, but its filename doesn't look like it a **driver log** that came from Z-Wave JS.

Please double-check that you uploaded the correct logfile. If you did, disregard this comment.

As a reminder, here's how to create one:

- [Z-Wave JS  UI](https://zwave-js.github.io/zwave-js-ui/#/troubleshooting/generating-logs?id=driver-logs)
- [Home Assistant Z-Wave Integration](https://www.home-assistant.io/integrations/zwave_js#how-do-i-access-the-z-wave-logs)
- [ioBroker.zwave2 Adapter](https://github.com/AlCalzone/ioBroker.zwave2/blob/master/docs/en/troubleshooting.md#providing-the-necessary-information-for-an-issue)
`;
			} else {
				message = `👋 Hey @${user}!

Thanks for opening an issue! It doesn't look like you provided a logfile though. While not strictly necessary for every issue, having a **driver log** on loglevel **debug** is required to diagnose most issues.

Please consider uploading a logfile that captures your problem. As a reminder, here's how to create one:

- [Z-Wave JS  UI](https://zwave-js.github.io/zwave-js-ui/#/troubleshooting/generating-logs?id=driver-logs)
- [Home Assistant Z-Wave Integration](https://www.home-assistant.io/integrations/zwave_js#how-do-i-access-the-z-wave-logs)
- [ioBroker.zwave2 Adapter](https://github.com/AlCalzone/ioBroker.zwave2/blob/master/docs/en/troubleshooting.md#providing-the-necessary-information-for-an-issue)
`;
			}
		}
	}

	// TODO: Consider if we want to delete outdated comments. That may delete replies as well though.
	if (hasZjsLog || !message) return;

	// Check if there is a comment from the bot already
	const queryComments = /* GraphQL */ `
		query Discussion($owner: String!, $repo: String!, $number: Int!) {
			repository(owner: $owner, name: $repo) {
				discussion(number: $number) {
					comments(first: 100) {
						nodes {
							id
							author {
								login
							}
							body
			
							# replies(first: 100) {
							#   nodes {
							#     id
							#     author {
							#       login
							#     }
							#     body
							#   }
							# }
						}
					}
				}
			}
		}
	`;
	const queryVars = {
		owner: context.repo.owner,
		repo: context.repo.repo,
		number: discussion.number,
	};

	try {
		// Existing comments are tagged with LOGFILE_COMMENT_TAG
		const queryResult = await github.graphql(queryComments, queryVars);
		const comments = queryResult.repository.discussion.comments.nodes;

		const existing = comments.find(
			(c) =>
				c.author.login === "zwave-js-bot"
				&& c.body.includes(LOGFILE_COMMENT_TAG),
		);
		if (existing) {
			// Already have a comment, no need for another one
			console.log("There already is a comment, no need for another one");
			return;

			// if (message) {
			// 	// Comment found, update it
			// 	await github.rest.issues.updateComment({
			// 		...options,
			// 		comment_id: existing.id,
			// 		body: message,
			// 	});
			// } else {
			// 	// No need to have a comment, all is ok
			// 	await github.rest.issues.deleteComment({
			// 		...options,
			// 		comment_id: existing.id,
			// 	});
			// }
		}
	} catch {
		// Ok make a new one maybe
	}

	// Tag the message so it's easier to find the comments later
	message += LOGFILE_COMMENT_TAG;

	const addCommentQuery = /* GraphQL */ `
		mutation reply($discussionId: ID!, $body: String!) {
			addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
				comment {
					id
				}
			}
		}
	`;
	const addCommentVars = {
		discussionId: discussion.node_id,
		body: message,
	};

	await github.graphql(addCommentQuery, addCommentVars);
}

module.exports = main;
