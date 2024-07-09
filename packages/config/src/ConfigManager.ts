import {
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLogContainer,
	isZWaveError,
} from "@zwave-js/core";
import { getErrorMessage } from "@zwave-js/shared";
import { pathExists } from "fs-extra";
import path from "node:path";
import { ConfigLogger } from "./Logger";
import {
	type ManufacturersMap,
	loadManufacturersInternal,
	saveManufacturersInternal,
} from "./Manufacturers";
import {
	ConditionalDeviceConfig,
	type DeviceConfig,
	type DeviceConfigIndex,
	type FulltextDeviceConfigIndex,
	generatePriorityDeviceIndex,
	getDevicesPaths,
	loadDeviceIndexInternal,
	loadFulltextDeviceIndexInternal,
} from "./devices/DeviceConfig";
import {
	configDir,
	externalConfigDir,
	getDeviceEntryPredicate,
	getEmbeddedConfigVersion,
	syncExternalConfigDir,
} from "./utils";

export interface ConfigManagerOptions {
	logContainer?: ZWaveLogContainer;
	deviceConfigPriorityDir?: string;
}

export class ConfigManager {
	public constructor(options: ConfigManagerOptions = {}) {
		this.logger = new ConfigLogger(
			options.logContainer ?? new ZWaveLogContainer({ enabled: false }),
		);
		this.deviceConfigPriorityDir = options.deviceConfigPriorityDir;
		this._configVersion =
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			require("@zwave-js/config/package.json").version;
	}

	private _configVersion: string;
	public get configVersion(): string {
		return this._configVersion;
	}

	private logger: ConfigLogger;

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
	private index: DeviceConfigIndex | undefined;
	private fulltextIndex: FulltextDeviceConfigIndex | undefined;

	private _useExternalConfig: boolean = false;
	public get useExternalConfig(): boolean {
		return this._useExternalConfig;
	}

	public async loadAll(): Promise<void> {
		// If the environment option for an external config dir is set
		// try to sync it and then use it
		const syncResult = await syncExternalConfigDir(this.logger);
		if (syncResult.success) {
			this._useExternalConfig = true;
			this.logger.print(
				`Using external configuration dir ${externalConfigDir()}`,
			);
			this._configVersion = syncResult.version;
		} else {
			this._useExternalConfig = false;
			this._configVersion = await getEmbeddedConfigVersion();
		}
		this.logger.print(`version ${this._configVersion}`, "info");

		await this.loadManufacturers();
		await this.loadDeviceIndex();
	}

	public async loadManufacturers(): Promise<void> {
		try {
			this._manufacturers = await loadManufacturersInternal(
				this._useExternalConfig,
			);
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
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

		await saveManufacturersInternal(this._manufacturers);
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
		try {
			// The index of config files included in this package
			const embeddedIndex = await loadDeviceIndexInternal(
				this.logger,
				this._useExternalConfig,
			);
			// A dynamic index of the user-defined priority device config files
			const priorityIndex: DeviceConfigIndex = [];
			if (this.deviceConfigPriorityDir) {
				if (await pathExists(this.deviceConfigPriorityDir)) {
					priorityIndex.push(
						...(await generatePriorityDeviceIndex(
							this.deviceConfigPriorityDir,
							this.logger,
						)),
					);
				} else {
					this.logger.print(
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
					this.logger.print(
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
		this.fulltextIndex = await loadFulltextDeviceIndexInternal(this.logger);
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
				this._useExternalConfig ? externalConfigDir()! : configDir,
			).devicesDir;
			const filePath = path.isAbsolute(indexEntry.filename)
				? indexEntry.filename
				: path.join(devicesDir, indexEntry.filename);
			if (!(await pathExists(filePath))) return;

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
					filePath,
					isEmbedded,
					{ rootDir, fallbackDirs },
				);
			} catch (e) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
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
