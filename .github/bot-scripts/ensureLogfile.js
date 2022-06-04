// @ts-check

/// <reference path="types.d.ts" />

const zjsLogRegex =
	/\[.*\]\(http.*zwavejs_.*\.(log|txt|zip|t?gz|(log|txt)\.(zip|t?gz))\)/;
const markdownLinkRegex = /\[.*\]\(http.*\)/;
const codeBlockRegex = /`{3,4}(.*?)`{3,4}/s;

const LOGFILE_COMMENT_TAG = "<!-- LOGFILE_COMMENT_TAG -->";

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const user = context.payload.issue.user.login;
	const body = context.payload.issue.body;

	const logfileSectionHeader = "### Attach Driver Logfile";
	// Check if this is a bug report which requires a logfile
	if (!body.includes(logfileSectionHeader)) return;

	const logfileSection = body.slice(
		body.indexOf(logfileSectionHeader) + logfileSectionHeader.length,
	);
	const hasLink = markdownLinkRegex.test(logfileSection);
	const hasZjsLog = zjsLogRegex.test(logfileSection);
	const codeBlockContent = codeBlockRegex.exec(logfileSection)?.[1]?.trim();

	console.log(`logfileSection: ${logfileSection}`);
	console.log(`hasLink: ${hasLink}`);
	console.log(`hasZjsLog: ${hasZjsLog}`);
	console.log(
		`codeBlockContent (matches = ${codeBlockRegex.test(
			codeBlockContent,
		)}): ${codeBlockContent}`,
	);

	let message = "";
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

It looks like you attached a logfile, but its filename doesn't look like it a [driver log](https://zwave-js.github.io/zwavejs2mqtt/#/troubleshooting/generating-logs?id=driver-logs) that came from Z-Wave JS. Please make sure you upload the correct one.`;
		} else {
			message = `👋 Hey @${user}!

Thanks for opening an issue! It doesn't look like you provided a logfile though. While not strictly necessary for every issue, having a [driver log](https://zwave-js.github.io/zwavejs2mqtt/#/troubleshooting/generating-logs?id=driver-logs) is required to diagnose most issues.

Please consider uploading a logfile that captures your problem.`;
		}
	}

	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};

	// When all is good, remove any existing comment
	if (message) {
		message += LOGFILE_COMMENT_TAG;
	}

	// Existing comments are tagged with LOGFILE_COMMENT_TAG
	try {
		const { data: comments } = await github.rest.issues.listComments({
			...options,
			issue_number: context.issue.number,
		});
		const existing = comments.find(
			(c) =>
				c.user.login === "zwave-js-bot" &&
				c.body.includes(LOGFILE_COMMENT_TAG),
		);
		if (existing) {
			if (message) {
				// Comment found, update it
				await github.rest.issues.updateComment({
					...options,
					comment_id: existing.id,
					body: message,
				});
			} else {
				// No need to have a comment, all is ok
				await github.rest.issues.deleteComment({
					...options,
					comment_id: existing.id,
				});
			}
			return;
		}
	} catch {
		// Ok make a new one maybe
	}

	if (message) {
		// Make a new one otherwise
		await github.rest.issues.createComment({
			...options,
			issue_number: context.issue.number,
			body: message,
		});
	}
}

module.exports = main;
