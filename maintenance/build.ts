import execa from "execa";

const project = process.argv[2] ?? "all";
const buildArgs = process.argv
	.slice(3)
	.filter((a) => a !== "-w" && a !== "--watch");

// TODO: Parse package.json dependency graph to figure out if codegen and/or
// partial builds are necessary, instead of hardcoding it here.

// Only cc, config and projects that depend on them need codegen and partial builds
const needsNoCodegen = [
	"@zwave-js/maintenance",
	"@zwave-js/core",
	"@zwave-js/shared",
	"@zwave-js/nvmedit",
	"@zwave-js/transformers",
];

const hasCodegen = ["@zwave-js/cc", "@zwave-js/config"];

// zwave-js is the main entry point, but there are projects that depend on it
const dependsOnZwaveJs = [
	"@zwave-js/flash",
	// And CLI in the future
];

const execOptions: execa.Options<string> = {
	stdio: "inherit",
};

async function main() {
	// Always build the maintenance project, so codegen tasks work
	console.log("Building maintenance project...");
	await execa(
		"yarn",
		[
			"workspace",
			"@zwave-js/maintenance",
			"run",
			"build",
			"--verbose",
			...buildArgs,
		],
		execOptions,
	);

	if (needsNoCodegen.includes(project)) {
		// We built the project or more than needed, so we're done
		return;
	}

	// Execute codegen tasks, so the rest can be built
	console.log();
	console.log("Running codegen tasks...");
	if (hasCodegen.includes(project)) {
		// Only codegen for the project is enough
		await execa(
			"yarn",
			["turbo", "run", "codegen", `--filter=${project}`],
			{
				...execOptions,
				env: {
					FORCE_COLOR: "1",
				},
			},
		);
	} else {
		// Codegen for all projects that need it
		await execa(
			"yarn",
			[
				"turbo",
				"run",
				"codegen",
				...hasCodegen.map((project) => `--filter=${project}`),
			],
			{
				...execOptions,
				env: {
					FORCE_COLOR: "1",
				},
			},
		);
	}

	if (project === "all") {
		// Simply build all projects that depend on zwave-js - this will
		// build everything
		for (const project of dependsOnZwaveJs) {
			console.log();
			console.log(`Building ${project}...`);
			await execa(
				"yarn",
				[
					"workspace",
					project,
					"run",
					"build",
					"--verbose",
					...buildArgs,
				],
				execOptions,
			);
		}
	} else {
		// Just build the single project
		console.log();
		console.log(`Building ${project}...`);
		await execa(
			"yarn",
			["workspace", project, "run", "build", "--verbose", ...buildArgs],
			execOptions,
		);
	}
}

main()
	.then(() => process.exit(0))
	.catch(() => process.exit(1));
