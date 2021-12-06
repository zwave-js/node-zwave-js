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

	const body = `
Because of the large amount of Z-Wave devices, we cannot write all configuration files ourselves.
Help from the community is required, so we can focus our time on improving Z-Wave JS itself. 🙏🏻

This issue has been labeled "Help wanted", meaning we kindly ask anyone who wants to help out for support. Here are a few resources to get you started - don't hesitate to ask if you are having problems:
- [Contributing configuration files](https://zwave-js.github.io/node-zwave-js/#/config-files/contributing-files)
- [Importing from other sources](https://zwave-js.github.io/node-zwave-js/#/config-files/importing-from-others)
- [Configuration file format](https://zwave-js.github.io/node-zwave-js/#/config-files/file-format)
- [Style guide](https://zwave-js.github.io/node-zwave-js/#/config-files/style-guide)

We may get around to doing it ourselves at some point, but community support will speed up this process immensely.

Thanks!
`.trim();

	await github.rest.issues.createComment({
		...options,
		issue_number: context.payload.issue.number,
		body,
	});
}
module.exports = main;
