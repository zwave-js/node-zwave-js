import {
	type LogContainer,
	ZWaveError,
	ZWaveErrorCodes,
	isZWaveError,
} from "@zwave-js/core";
import { getErrorMessage, pathExists } from "@zwave-js/shared";
import { type FileSystem } from "@zwave-js/shared/bindings";
import path from "pathe";
import { ConfigLogger } from "./Logger.js";
import {
	type ManufacturersMap,
	loadManufacturersInternal,
	saveManufacturersInternal,
} from "./Manufacturers.js";
import { PACKAGE_VERSION } from "./_version.js";
import {
	ConditionalDeviceConfig,
	type DeviceConfig,
	type DeviceConfigIndex,
	type FulltextDeviceConfigIndex,
	generatePriorityDeviceIndex,
	getDevicesPaths,
	loadDeviceIndexInternal,
	loadFulltextDeviceIndexInternal,
} from "./devices/DeviceConfig.js";
import {
	type SyncExternalConfigDirResult,
	configDir,
	getDeviceEntryPredicate,
	getExternalConfigDirEnvVariable,
	syncExternalConfigDir,
} from "./utils.js";

export interface ConfigManagerOptions {
	bindings?: FileSystem;
	logContainer?: LogContainer;
	deviceConfigPriorityDir?: string;
	deviceConfigExternalDir?: string;
}

export class ConfigManager {
	public constructor(options: ConfigManagerOptions = {}) {
		this._fs = options.bindings;
		this._logContainer = options.logContainer;

		this.deviceConfigPriorityDir = options.deviceConfigPriorityDir;
		this.deviceConfigExternalDir = options.deviceConfigExternalDir;

		this._configVersion = PACKAGE_VERSION;
	}

	private _fs: FileSystem | undefined;
	private async getFS(): Promise<FileSystem> {
		this._fs ??= (await import("@zwave-js/core/bindings/fs/node")).fs;
		return this._fs;
	}

	private _configVersion: string;
	public get configVersion(): string {
		return this._configVersion;
	}

	private _logContainer: LogContainer | undefined;
	private _logger: ConfigLogger | undefined;
	private async getLogger(): Promise<ConfigLogger> {
		if (!this._logContainer) {
			this._logContainer =
				(await import("@zwave-js/core/bindings/log/node")).log({
					enabled: false,
				});
		}
		if (!this._logger) {
			this._logger = new ConfigLogger(this._logContainer);
		}
		return this._logger;
	}

	private _manufacturers: ManufacturersMap | undefined;
	public get manufacturers(): ManufacturersMap {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._manufacturers;
	}

	private deviceConfigPriorityDir: string | undefined;
	private deviceConfigExternalDir: string | undefined;
	public get externalConfigDir(): string | undefined {
		return this.deviceConfigExternalDir
			?? getExternalConfigDirEnvVariable();
	}

	private index: DeviceConfigIndex | undefined;
	private fulltextIndex: FulltextDeviceConfigIndex | undefined;

	private _useExternalConfig: boolean = false;
	public get useExternalConfig(): boolean {
		return this._useExternalConfig;
	}

	public async loadAll(): Promise<void> {
		const logger = await this.getLogger();
		// If the environment option for an external config dir is set
		// try to sync it and then use it
		let syncResult: SyncExternalConfigDirResult | undefined;
		const externalConfigDir = this.externalConfigDir;
		if (externalConfigDir) {
			syncResult = await syncExternalConfigDir(
				await this.getFS(),
				externalConfigDir,
				logger,
			);
		}

		if (syncResult?.success) {
			this._useExternalConfig = true;
			logger.print(
				`Using external configuration dir ${externalConfigDir}`,
			);
			this._configVersion = syncResult.version;
		} else {
			this._useExternalConfig = false;
			this._configVersion = PACKAGE_VERSION;
		}
		logger.print(`version ${this._configVersion}`, "info");

		await this.loadManufacturers();
		await this.loadDeviceIndex();
	}

	public async loadManufacturers(): Promise<void> {
		try {
			this._manufacturers = await loadManufacturersInternal(
				await this.getFS(),
				this._useExternalConfig && this.externalConfigDir || undefined,
			);
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					(await this.getLogger()).print(
						`Could not load manufacturers config: ${e.message}`,
						"error",
					);
				}
				if (!this._manufacturers) this._manufacturers = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	public async saveManufacturers(): Promise<void> {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		await saveManufacturersInternal(
			await this.getFS(),
			this._manufacturers,
		);
	}

	/**
	 * Looks up the name of the manufacturer with the given ID in the configuration DB
	 * @param manufacturerId The manufacturer id to look up
	 */
	public lookupManufacturer(manufacturerId: number): string | undefined {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._manufacturers.get(manufacturerId);
	}

	/**
	 * Add new manufacturers to configuration DB
	 * @param manufacturerId The manufacturer id to look up
	 * @param manufacturerName The manufacturer name
	 */
	public setManufacturer(
		manufacturerId: number,
		manufacturerName: string,
	): void {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		this._manufacturers.set(manufacturerId, manufacturerName);
	}

	public async loadDeviceIndex(): Promise<void> {
		const fs = await this.getFS();
		const logger = await this.getLogger();
		try {
			// The index of config files included in this package
			const embeddedIndex = await loadDeviceIndexInternal(
				fs,
				logger,
				this._useExternalConfig && this.externalConfigDir || undefined,
			);
			// A dynamic index of the user-defined priority device config files
			const priorityIndex: DeviceConfigIndex = [];
			if (this.deviceConfigPriorityDir) {
				if (await pathExists(fs, this.deviceConfigPriorityDir)) {
					priorityIndex.push(
						...(await generatePriorityDeviceIndex(
							fs,
							this.deviceConfigPriorityDir,
							logger,
						)),
					);
				} else {
					logger.print(
						`Priority device configuration directory ${this.deviceConfigPriorityDir} not found`,
						"warn",
					);
				}
			}
			// Put the priority index in front, so the files get resolved first
			this.index = [...priorityIndex, ...embeddedIndex];
		} catch (e) {
			// If the index file is missing or invalid, don't try to find it again
			if (
				(!isZWaveError(e) && e instanceof Error)
				|| (isZWaveError(e)
					&& e.code === ZWaveErrorCodes.Config_Invalid)
			) {
				// Fall back to no index on production systems
				if (!this.index) this.index = [];
				if (process.env.NODE_ENV !== "test") {
					logger.print(
						`Could not load or regenerate device config index: ${e.message}`,
						"error",
					);
					// and don't throw
					return;
				}
				// But fail hard in tests
				throw e;
			}
		}
	}

	public getIndex(): DeviceConfigIndex | undefined {
		return this.index;
	}

	public async loadFulltextDeviceIndex(): Promise<void> {
		this.fulltextIndex = await loadFulltextDeviceIndexInternal(
			await this.getFS(),
			await this.getLogger(),
		);
	}

	public getFulltextIndex(): FulltextDeviceConfigIndex | undefined {
		return this.fulltextIndex;
	}

	/**
	 * Looks up the definition of a given device in the configuration DB, but does not evaluate conditional settings.
	 * @param manufacturerId The manufacturer id of the device
	 * @param productType The product type of the device
	 * @param productId The product id of the device
	 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded.
	 * If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.
	 */
	public async lookupDevicePreserveConditions(
		manufacturerId: number,
		productType: number,
		productId: number,
		firmwareVersion?: string,
	): Promise<ConditionalDeviceConfig | undefined> {
		// Load/regenerate the index if necessary
		if (!this.index) await this.loadDeviceIndex();

		const fs = await this.getFS();

		// Look up the device in the index
		const indexEntries = this.index!.filter(
			getDeviceEntryPredicate(
				manufacturerId,
				productType,
				productId,
				firmwareVersion,
			),
		);
		// If there are multiple with overlapping firmware ranges, return the preferred one first
		const indexEntry = indexEntries.find((e) => !!e.preferred)
			?? indexEntries[0];

		if (indexEntry) {
			const devicesDir = getDevicesPaths(
				this._useExternalConfig && this.externalConfigDir || configDir,
			).devicesDir;
			const filePath = path.isAbsolute(indexEntry.filename)
				? indexEntry.filename
				: path.join(devicesDir, indexEntry.filename);
			if (!(await pathExists(fs, filePath))) return;

			// A config file is treated as am embedded one when it is located under the devices root dir
			// or the external config dir
			const isEmbedded = !path
				.relative(devicesDir, filePath)
				.startsWith("..");

			// When a device file is located in a different root directory than the embedded config files,
			// we use the embedded dir a fallback
			const rootDir = indexEntry.rootDir ?? devicesDir;
			const fallbackDirs = rootDir === devicesDir
				? undefined
				: [devicesDir];

			try {
				return await ConditionalDeviceConfig.from(
					fs,
					filePath,
					isEmbedded,
					{ rootDir, fallbackDirs },
				);
			} catch (e) {
				if (process.env.NODE_ENV !== "test") {
					(await this.getLogger()).print(
						`Error loading device config ${filePath}: ${
							getErrorMessage(
								e,
								true,
							)
						}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Looks up the definition of a given device in the configuration DB
	 * @param manufacturerId The manufacturer id of the device
	 * @param productType The product type of the device
	 * @param productId The product id of the device
	 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded.
	 * If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.
	 */
	public async lookupDevice(
		manufacturerId: number,
		productType: number,
		productId: number,
		firmwareVersion?: string,
	): Promise<DeviceConfig | undefined> {
		const ret = await this.lookupDevicePreserveConditions(
			manufacturerId,
			productType,
			productId,
			firmwareVersion,
		);
		return ret?.evaluate({
			manufacturerId,
			productType,
			productId,
			firmwareVersion,
		});
	}
}
