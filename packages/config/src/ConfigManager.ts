import type { ZWaveLogContainer } from "@zwave-js/core";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import {
	IndicatorMap,
	IndicatorPropertiesMap,
	IndicatorProperty,
	loadIndicatorsInternal,
} from "./Indicators";
import { ConfigLogger } from "./Logger";

export class ConfigManager {
	public constructor(container: ZWaveLogContainer) {
		this.logger = new ConfigLogger(container);
	}

	private logger: ConfigLogger;

	private indicators: IndicatorMap | undefined;
	private properties: IndicatorPropertiesMap | undefined;

	public async loadIndicators(): Promise<void> {
		try {
			await loadIndicatorsInternal();
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not indicators config: ${e.message}`,
						"error",
					);
				}
				if (!this.indicators) this.indicators = new Map();
				if (!this.properties) this.properties = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	/**
	 * Looks up the label for a given indicator id
	 */
	public lookupIndicator(indicatorId: number): string | undefined {
		if (!this.indicators) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.indicators.get(indicatorId);
	}

	/**
	 * Looks up the property definition for a given indicator property id
	 */
	public lookupProperty(propertyId: number): IndicatorProperty | undefined {
		if (!this.properties) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.properties.get(propertyId);
	}
}
