// Script to pack the monorepo packages for production, but locally
import execa from "execa";
import fs from "fs-extra";
import path from "path";
import type { Stream } from "stream";
import tar from "tar-stream";
import zlib from "zlib";

const repoRoot = path.join(__dirname, "..");
const packagesDir = path.join(repoRoot, "packages");

interface Workspace {
	name: string;
	dir: string;
	version: string;
	packageJson: any;
	workspaceDependencies: string[];
	tarball: string;
}

async function stream2buffer(stream: Stream): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const _buf = Array<any>();

		stream.on("data", (chunk) => _buf.push(chunk));
		stream.on("end", () => resolve(Buffer.concat(_buf)));
		stream.on("error", (err) => reject(`error converting stream - ${err}`));
	});
}

async function main() {
	const workspaces: Workspace[] = [];

	let outDir = process.argv[2] || ".prodpack";
	if (!path.isAbsolute(outDir)) {
		outDir = path.join(process.cwd(), outDir);
	}

	// First pass: read all package.json files
	console.log("Parsing workspace...");
	const workspaceDirs = await fs.readdir(packagesDir);
	for (const workspaceDir of workspaceDirs) {
		const workspaceDirFull = path.join(packagesDir, workspaceDir);
		const packageJson = await fs.readJson(
			path.join(workspaceDirFull, "package.json"),
		);
		if (packageJson.private) continue;

		const { name, version } = packageJson;

		workspaces.push({
			name,
			dir: workspaceDirFull,
			version,
			packageJson,
			workspaceDependencies: [],
			tarball: path.join(
				outDir,
				(name as string).replace(/\//g, "-") + ".tgz",
			),
		});
	}

	// Second pass: find all workspace dependencies
	for (const workspace of workspaces) {
		const { dependencies } = workspace.packageJson;
		if (!dependencies) continue;

		for (const dependency of Object.keys(dependencies)) {
			const isOwn = workspaces.some((w) => w.name === dependency);
			if (isOwn) {
				workspace.workspaceDependencies.push(dependency);
			}
		}
	}

	// Pack all workspaces
	console.log("Packing tarballs...");
	await fs.ensureDir(outDir);
	for (const workspace of workspaces) {
		console.log(`  ${workspace.name}`);
		await execa("yarn", [
			"workspace",
			workspace.name,
			"pack",
			"--out",
			path.join(outDir, "%s.tgz"),
		]);
	}

	// Modify each tarball to point at the other tarballs
	console.log("Modifying workspaces...");
	for (const workspace of workspaces) {
		console.log(`  ${workspace.name}`);
		const extract = tar.extract();
		const pack = tar.pack();

		extract.on("entry", async (header, stream, next) => {
			if (header.name === "package/package.json") {
				const data = await stream2buffer(stream);
				const packageJson = JSON.parse(data.toString());
				// Replace workspace dependencies with references to local tarballs
				for (const dep of workspace.workspaceDependencies) {
					packageJson.dependencies[dep] = `file:./${dep.replace(
						/\//g,
						"-",
					)}.tgz`;
				}
				// Avoid accidentally installing dev dependencies
				delete packageJson.devDependencies;

				// Return data
				pack.entry(header, JSON.stringify(packageJson, null, 2), next);
			} else {
				// pass through
				stream.pipe(pack.entry(header, next));
			}
		});

		extract.on("finish", () => {
			pack.finalize();
		});

		const read = fs.createReadStream(workspace.tarball);
		const unzip = zlib.createGunzip();
		read.pipe(unzip).pipe(extract);

		const zip = zlib.createGzip();
		const write = fs.createWriteStream(workspace.tarball + ".tmp");
		pack.pipe(zip).pipe(write);

		await new Promise((resolve) => write.on("finish", resolve));

		// Replace the original tarball
		await fs.unlink(workspace.tarball);
		await fs.rename(workspace.tarball + ".tmp", workspace.tarball);
	}

	console.log("Done!");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
//
