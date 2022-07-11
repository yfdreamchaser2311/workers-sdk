#!/usr/bin/env node

/**
 * This is the entry point for the wrangler cli. It will be compiled
 * out to bin/wrangler.js by the build process, so be careful when
 * referring to any paths in this file.
 */

import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import semiver from "semiver";
import type { ChildProcess } from "child_process";

const MIN_NODE_VERSION = "16.7.0";
const debug =
	process.env["WRANGLER_LOG"] === "debug"
		? (...args: unknown[]) => console.log(...args)
		: () => {};

let maybeWranglerProcess: ChildProcess | undefined;

/**
 * Executes ../wrangler-dist/cli.js
 */
function runWrangler(): ChildProcess | undefined {
	if (semiver(process.versions.node, MIN_NODE_VERSION) < 0) {
		// Note Volta and nvm are also recommended in the official docs:
		// https://developers.cloudflare.com/workers/get-started/guide#2-install-the-workers-cli
		console.error(
			`Wrangler requires at least Node.js v${MIN_NODE_VERSION}. You are using v${process.versions.node}.
You should use the latest Node.js version if possible, as Cloudflare Workers use a very up-to-date version of V8.
Consider using a Node.js version manager such as https://volta.sh/ or https://github.com/nvm-sh/nvm.`
		);
		process.exitCode = 1;
		return;
	}

	let pathToCACerts = process.env.NODE_EXTRA_CA_CERTS;
	if (pathToCACerts) {
		// TODO:
		// - should we log a warning here?
		// - maybe we can generate a certificate that concatenates with ours?
		//
		//  I do think it'll be rare that someone wants to add a cert AND
		//  use Cloudflare WARP, but let's wait till the situation actually
		//  arises before we do anything about it
	} else {
		const osTempDir = os.tmpdir();
		const certDir = path.join(osTempDir, "wrangler-cert");
		const certPath = path.join(certDir, "Cloudflare_CA.pem");
		// copy cert to the system temp dir if needed
		if (!fs.existsSync(certPath)) {
			fs.mkdirSync(certDir, { recursive: true });
			fs.writeFileSync(
				certPath,
				fs.readFileSync(path.join(__dirname, "../Cloudflare_CA.pem"), "utf-8")
			);
		}
		pathToCACerts = certPath;
	}

	return spawn(
		process.execPath,
		[
			"--no-warnings",
			"--experimental-vm-modules",
			...process.execArgv,
			path.join(__dirname, "../wrangler-dist/cli.js"),
			...process.argv.slice(2),
		],
		{
			stdio: "inherit",
			env: {
				...process.env,
				NODE_EXTRA_CA_CERTS: pathToCACerts,
			},
		}
	).on("exit", (code) =>
		process.exit(code === undefined || code === null ? 0 : code)
	);
}

/**
 * Runs a locally-installed version of wrangler, delegating from this version.
 * @throws {MODULE_NOT_FOUND} if there isn't a locally installed version of wrangler.
 */
function runDelegatedWrangler(): ChildProcess {
	const packageJsonPath = require.resolve("wrangler/package.json", {
		paths: [process.cwd()],
	});
	const {
		bin: { wrangler: binaryPath },
		version,
	} = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
	const resolvedBinaryPath = path.resolve(packageJsonPath, "..", binaryPath);

	debug(`Delegating to locally-installed version of wrangler @ v${version}`);

	// this call to `spawn` is simpler because the delegated version will do all
	// of the other work.
	return spawn(
		process.execPath,
		[resolvedBinaryPath, ...process.argv.slice(2)],
		{
			stdio: "inherit",
		}
	).on("exit", (code) =>
		process.exit(code === undefined || code === null ? 0 : code)
	);
}

/**
 * Indicates if this invocation of `wrangler` should delegate
 * to a locally-installed version.
 */
function shouldDelegate() {
	try {
		// `require.resolve` will throw if it can't find
		// a locally-installed version of `wrangler`
		const delegatedPackageJson = require.resolve("wrangler/package.json", {
			paths: [process.cwd()],
		});
		const thisPackageJson = path.resolve(__dirname, "..", "package.json");
		// if it's the same path, then we're already a local install -- no need to delegate
		return thisPackageJson !== delegatedPackageJson;
	} catch (e) {
		// there's no local version to delegate to -- `require.resolve` threw
		return false;
	}
}

async function main() {
	maybeWranglerProcess = shouldDelegate()
		? runDelegatedWrangler()
		: runWrangler();
}

process.on("SIGINT", () => {
	maybeWranglerProcess?.kill();
});
process.on("SIGTERM", () => {
	maybeWranglerProcess?.kill();
});

void main();