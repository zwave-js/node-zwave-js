// @ts-check

/// <reference path="./types.d.ts" />

const { makeRe } = require("minimatch");

/**
 * @param {{github: Github, context: Context, whitelist: string[], workflows: string[]}} param
 */
async function main(param) {
	const { github, context, whitelist, workflows } = param;

	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};

	// Figure out which workflow IDs the whitelisted workflows have
	const {
		data: { workflows: repoWorkflows },
	} = await github.rest.actions.listRepoWorkflows({
		...options,
	});
	const workflowIDs = repoWorkflows
		.filter((w) => workflows.includes(w.path))
		.map((w) => w.id);

	// Only look at the runs that part of the whitelisted workflows
	const {
		data: { workflow_runs },
	} = await github.rest.actions.listWorkflowRunsForRepo({
		...options,
		status: "action_required",
	});
	const pendingRuns = workflow_runs.filter((run) =>
		workflowIDs.includes(run.workflow_id),
	);

	/** @type {number[]} */
	const whitelistedRuns = [];
	runs: for (const run of pendingRuns) {
		console.log(`Checking run ${run.id}...`);

		// Find the pull request for the current run
		const { data: pulls } = await github.rest.pulls.list({
			...options,
			head: `${run.head_repository.owner.login}:${run.head_branch}`,
		});

		if (!pulls.length) {
			console.log(
				`No pull request found for workflow run ${run.id} - skipping...`,
			);
			continue;
		}

		// List all the files in there
		const { data: files } = await github.rest.pulls.listFiles({
			...options,
			pull_number: pulls[0].number,
		});

		// Figure out if only the whitelisted files were touched
		const filenames = new Set([
			...files.map((f) => f.filename),
			...files.map((f) => f.previous_filename).filter((f) => !!f),
		]);

		const patterns = whitelist.map((p) => makeRe(p));
		for (const file of filenames) {
			if (!patterns.some((p) => p.test(file))) {
				console.log(
					`File ${file} does not match any whitelist - not approving workflow run!`,
				);
				continue runs;
			}
		}

		console.log(
			`Changed files in PR #${pulls[0].number}: ${[...filenames]
				.map((f) => `\n· ${f}`)
				.join("")}`,
		);

		console.log(`Check okay... workflow run will be approved`);
		whitelistedRuns.push(run.id);
	}

	console.log(`Approving workflow runs...`);
	for (const run_id of whitelistedRuns) {
		await github.request(
			"POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve",
			{
				...options,
				run_id,
			},
		);
	}
	console.log(`Done!`);
}
module.exports = main;
