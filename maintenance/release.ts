// tslint:disable:no-var-requires
// tslint:disable:no-console

/*

	Bumps the package version and releases a new tag
	to set off a CI and npm release run

	CALL THIS WITH:
	npm run release -- [<releaseType> [<postfix]] [--dry]
	or
	npm run release -- <version> [--dry]

	PLACEHOLDER for next version in readme:
	#### __WORK IN PROGRESS__

*/

import { padStart } from "alcalzone-shared/strings";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
const semver = require("semver");
const colors = require("colors/safe");
import { argv } from "yargs";

const rootDir = path.resolve(__dirname, "../");

const packPath = path.join(rootDir, "package.json");
const pack = require(packPath);
const readmePath = path.join(rootDir, "README.md");
let readme = fs.readFileSync(readmePath, "utf8");
// const ioPackPath = path.join(rootDir, "io-package.json");
// const ioPack = require(ioPackPath);

function fail(reason: string) {
	console.error("");
	console.error(colors.red(reason));
	console.error("");
	process.exit(0);
}

// check if there are untracked changes
const gitStatus = execSync("git status", {cwd: rootDir, encoding: "utf8"});
if (/have diverged/.test(gitStatus)) {
	if (!argv.dry) fail(colors.red("Cannot continue, the local branch has diverged from the git repo!"));
	else console.log(colors.red("This is a dry run. The full run would fail due to a diverged branch\n"));
} else if (!/working tree clean/.test(gitStatus)) {
	if (!argv.dry) fail(colors.red("Cannot continue, the local branch has uncommited changes!"));
	else console.log(colors.red("This is a dry run. The full run would fail due to uncommited changes\n"));
} else if (/Your branch is behind/.test(gitStatus)) {
	if (!argv.dry) fail(colors.red("Cannot continue, the local branch is behind the remote changes!"));
	else console.log(colors.red("This is a dry run. The full run would fail due to the local branch being behind\n"));
} else if (/Your branch is up\-to\-date/.test(gitStatus) || /Your branch is ahead/.test(gitStatus)) {
	// all good
	console.log(colors.green("git status is good - I can continue..."));
}

const releaseTypes = ["major", "premajor", "minor", "preminor", "patch", "prepatch", "prerelease"];

const releaseType = argv._[0] || "patch";
let newVersion = releaseType;
const oldVersion = pack.version as string;
if (releaseTypes.indexOf(releaseType) > -1) {
	if (releaseType.startsWith("pre") && argv._.length >= 2) {
		// increment to pre-release with an additional prerelease string
		newVersion = semver.inc(oldVersion, releaseType, argv._[1]);
	} else {
		newVersion = semver.inc(oldVersion, releaseType);
	}
	console.log(`bumping version ${colors.blue(oldVersion)} to ${colors.gray(releaseType)} version ${colors.green(newVersion)}\n`);
} else {
	// increment to specific version
	newVersion = semver.clean(newVersion);
	if (newVersion == null) {
		fail(`invalid version string "${newVersion}"`);
	} else {
		// valid version string => check if its actually newer
		if (!semver.gt(newVersion, pack.version)) {
			fail(`new version ${newVersion} is NOT > than package.json version ${pack.version}`);
		}
		// if (!semver.gt(newVersion, ioPack.common.version)) {
		// 	fail(`new version ${newVersion} is NOT > than io-package.json version ${ioPack.common.version}`);
		// }
	}
	console.log(`bumping version ${oldVersion} to specific version ${newVersion}`);
}

if (argv.dry) {
	console.log(colors.yellow("dry run:") + " not updating package files");
} else {
	console.log(`updating package.json from ${colors.blue(pack.version)} to ${colors.green(newVersion)}`);
	pack.version = newVersion;
	fs.writeFileSync(packPath, JSON.stringify(pack, null, 2));

	console.log(`updating changelog in README.md`);
	const d = new Date();
	readme = readme.replace(
		"#### __WORK IN PROGRESS__",
		`#### ${newVersion} (${d.getFullYear()}-${padStart("" + (d.getMonth() + 1), 2, "0")}-${padStart("" + d.getDate(), 2, "0")})`,
	);
	fs.writeFileSync(readmePath, readme, "utf8");

	// console.log(`updating io-package.json from ${colors.blue(ioPack.common.version)} to ${colors.green(newVersion)}`);
	// ioPack.common.version = newVersion;
	// fs.writeFileSync(ioPackPath, JSON.stringify(ioPack, null, 4));
}

const gitCommands = [
	`git add -A`,
	`git commit -m "release v${newVersion} [skip ci]"`,
	`git push`,
	`git tag v${newVersion}`,
	`git push origin --tags`,
];
if (argv.dry) {
	console.log(colors.yellow("dry run:") + " I would execute this:");
	for (const command of gitCommands) {
		console.log("  " + command);
	}
} else {
	for (const command of gitCommands) {
		console.log(`executing "${colors.blue(command)}" ...`);
		execSync(command, {cwd: rootDir});
	}
}

console.log("");
console.log(colors.green("done!"));
console.log("");

process.exit(0);
