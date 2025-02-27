// Creates or updates a PR with a documentation update

// @ts-check
/// <reference path="../bot-scripts/types.d.ts" />

const exec = require("@actions/exec");
const semver = require("semver");

const options = {
	owner: "zwave-js",
	repo: "zwave-js",
};

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const npmToken = /** @type {string} */ (process.env.NPM_TOKEN);
	const pr = context.issue.number;

	const { data: pull } = await github.rest.pulls.get({
		...options,
		pull_number: pr,
	});

	let success = false;
	let newVersion;
	try {
		// Build it
		await exec.exec("yarn", ["run", "build"]);

		// Configure git
		await exec.exec("git", ["config", "user.email", "bot@zwave-js.io"]);
		await exec.exec("git", ["config", "user.name", "Z-Wave JS Bot"]);

		// Configure npm login
		await exec.exec("yarn", ["config", "set", "npmAuthToken", npmToken]);

		// Figure out the next version
		newVersion = `${
			semver.inc(
				require(`${process.env.GITHUB_WORKSPACE}/package.json`).version,
				"prerelease",
			)
		}-pr-${pr}-${pull.merge_commit_sha.slice(0, 7)}`;

		// Bump versions
		await exec.exec(
			"yarn",
			`workspaces foreach --all version ${newVersion} --deferred`.split(
				" ",
			),
		);
		await exec.exec("yarn", ["version", "apply", "--all"]);

		// and release changed packages
		await exec.exec(
			"yarn",
			`workspaces foreach --all -vti --no-private npm publish --tolerate-republish --tag next`
				.split(
					" ",
				),
		);
		success = true;
	} catch (e) {
		console.error(e.message);
	}

	if (success) {
		github.rest.issues.createComment({
			...options,
			issue_number: pr,
			body: `🎉 The packages have been published.
You can now install the test version with
\`\`\`
yarn add zwave-js@${newVersion}
\`\`\``,
		});
	} else {
		github.rest.issues.createComment({
			...options,
			issue_number: pr,
			body:
				`😥 Unfortunately I could not publish the new packages. Check out the logs to see what went wrong.`,
		});
	}
}

module.exports = main;
