// @ts-check

/// <reference path="types.d.ts" />

const zjsLogRegex = /\[.*\]\(http.*zwavejs_.*\.(log|txt)\)/;
const markdownLinkRegex = /\[.*\]\(http.*\)/;
const codeBlockRegex = /`{3,4}(?<code>(?:.|\n)*?)`{3,4}/;

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
	const codeBlockContent = codeBlockRegex
		.exec(logfileSection)
		?.groups?.code.trim();

	if (hasZjsLog) return; // all good!

	let message = "";
	if (codeBlockContent) {
		if (codeBlockContent.split("\n").length > 10) {
			// This code block is too long and should be a logfile instead
			message = `👋 Hey @${user}!

It looks like you copied the contents of a logfile. Please attach it as a file instead, so it is easier to work with.
_Note: You can just drag & drop files into the textbox. Just make sure to use a supported file extension like \`.log\` or \`.txt\`_`;
		} else {
			// This is a short log that might not have enough info to work with
			message = `👋 Hey @${user}!

It looks like you copied a few log lines here. Note that we often need a lot of context to diagnose issues, so please attach the full logfile instead.
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

	message += LOGFILE_COMMENT_TAG;

	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};

	// Try to check if there is already a comment tagged with LOGFILE_COMMENT_TAG
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
			// Comment found, update it
			await github.rest.issues.updateComment({
				...options,
				comment_id: existing.id,
				body: message,
			});
			return;
		}
	} catch {
		// Ok make a new one
	}

	// Make a new one otherwise
	await github.rest.issues.createComment({
		...options,
		issue_number: context.issue.number,
		body: message,
	});
}

module.exports = main;
