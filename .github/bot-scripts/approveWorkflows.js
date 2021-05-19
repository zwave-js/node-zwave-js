const { makeRe } = require("minimatch");

/// <reference path="types.d.ts" />

// @ts-check

/**
 * @param {{github: Github, context: Context, whitelist: string[], workflows: string[]}} param
 */
async function main(param) {
	const { github, context, whitelist, workflows } = param;

	const options = {
		owner: context.repo.owner,
		repo: context.repo.repo,
	};

	const {
		data: { workflow_runs },
	} = await githubactions.listWorkflowRunsForRepo({
		...options,
		status: "action_required",
	});

	// Only look at the runs that part of the whitelisted workflows
	const pendingRuns = workflow_runs.filter((run) =>
		workflows.includes(run.name),
	);

	/** @type {typeof pendingRuns} */
	const whitelistedRuns = [];
	runs: for (const run of pendingRuns) {
		github.log.info(`Checking run ${run.id}...`);

		// Find the pull request for the current run
		const { data: pulls } = await github.pulls.list({
			...options,
			head: `${run.head_repository.owner.login}:${run.head_branch}`,
		});

		if (!pulls.length) {
			github.log.info(
				`No pull request found for workflow run ${run.id} - skipping...`,
			);
		}

		// List all the files in there
		const { data: files } = await github.pulls.listFiles({
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
				github.log.info(
					`File ${file} does not match any whitelist - not approving workflow run!`,
				);
				continue runs;
			}
		}
		github.log.info(`Check okay... workflow run will be approved`);
		whitelistedRuns.push(run);
	}

	github.log.info(`Approving workflow runs...`);
	for (const run of whitelistedRuns) {
		await githubrequest(
			"POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve",
			{
				...options,
				run_id: run.id,
			},
		);
	}
	github.log.info(`Done!`);
}
module.exports = main;
