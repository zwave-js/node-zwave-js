export enum RFRegion {
	"Europe" = 0x00,
	"USA" = 0x01,
	"Australia/New Zealand" = 0x02,
	"Hong Kong" = 0x03,
	// 0x04 is deprecated
	"India" = 0x05,
	"Israel" = 0x06,
	"Russia" = 0x07,
	"China" = 0x08,
	"USA (Long Range)" = 0x09,
	// 0x0a is deprecated
	"EU (Long Range)" = 0x0b,
	"Japan" = 0x20,
	"Korea" = 0x21,
	"Unknown" = 0xfe,
	"Default (EU)" = 0xff,
}

export interface RFRegionInfo {
	region: RFRegion;
	supportsZWave: boolean;
	supportsLongRange: boolean;
	includesRegion?: RFRegion;
}

export enum ZnifferRegion {
	"Europe" = 0x00,
	"USA" = 0x01,
	"Australia/New Zealand" = 0x02,
	"Hong Kong" = 0x03,
	"India" = 0x05,
	"Israel" = 0x06,
	"Russia" = 0x07,
	"China" = 0x08,
	"USA (Long Range)" = 0x09,
	"USA (Long Range, backup)" = 0x0a,
	"Japan" = 0x20,
	"Korea" = 0x21,
	"USA (Long Range, end device)" = 0x30,
	"Unknown" = 0xfe,
	"Default (EU)" = 0xff,
}

/** Definitions for Zniffer regions on legacy (500 series and older) Zniffers */
export enum ZnifferRegionLegacy {
	EU = 0,
	US = 1,
	ANZ = 2,
	HK = 3,
	MY = 8,
	IN = 9,
	JP = 10,
	RU = 26,
	IL = 27,
	KR = 28,
	CN = 29,
	TF_866 = 4,
	TF_870 = 5,
	TF_906 = 6,
	TF_910 = 7,
	TF_878 = 11,
	TF_882 = 12,
	TF_886 = 13,
	TF_932_3CH = 14,
	TF_940_3CH = 15,
	TF_835_3CH = 24,
	TF_840_3CH = 16,
	TF_850_3CH = 17,
}
