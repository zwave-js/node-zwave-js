import { tz } from "moment-timezone";

export interface DSTInfo {
	startDate: Date;
	endDate: Date;
	standardOffset: number;
	dstOffset: number;
}

/**
 * Returns a fallback DSTInfo in case we cannot determine the correct one.
 * This fallback has no additional DST shift.
 * The dummy DST starts on March 31st and ends on October 31st, both times at 01:00 UTC.
 * @param defaultOffset - The offset to use for both standardOffset and dstOffset
 */
export function getDefaultDSTInfo(defaultOffset?: number): DSTInfo {
	const thisYear = new Date().getUTCFullYear();
	if (defaultOffset == undefined)
		defaultOffset = -new Date().getTimezoneOffset();
	return {
		startDate: new Date(Date.UTC(thisYear, 2, 31, 1)),
		endDate: new Date(Date.UTC(thisYear, 9, 31, 1)),
		standardOffset: defaultOffset,
		dstOffset: defaultOffset,
	};
}

/** Returns the current system's daylight savings time information if possible */
export function getDSTInfo(): DSTInfo | undefined {
	const thisYear = new Date().getUTCFullYear();
	// find out which timezone we're in
	const zoneName = tz.guess();
	const zone = tz.zone(zoneName);
	if (!zone) return;

	// moment-timezone stores the end dates of each timespan in zone.untils
	// iterate through them to find this year's dates
	const indizes: number[] = [];
	const dates: Date[] = [];
	const offsets: number[] = [];
	for (let i = 0; i < zone.untils.length; i++) {
		const date = new Date(zone.untils[i]);
		if (date.getUTCFullYear() === thisYear) {
			indizes.push(i);
			dates.push(date);
			// Javascript has the offsets inverted, we use the normal interpretation
			offsets.push(-zone.offsets[i]);
		}
	}
	// We can only work with exactly two dates -> start and end of DST
	switch (indizes.length) {
		case 1:
			// if we have exactly 1 index, we use that offset information to construct the fallback info
			return getDefaultDSTInfo(offsets[0]);
		case 2:
			// if we have exactly 2 indizes, we know there's a start and end date
			break; // continue further down
		default:
			// otherwise we cannot construct dst info
			return undefined;
	}
	if (offsets[0] > offsets[1]) {
		// index 0 is end of DST, index 1 is start
		return {
			endDate: dates[0],
			startDate: dates[1],
			dstOffset: offsets[0],
			standardOffset: offsets[1],
		};
	} else {
		// index 0 is start of DST, index 1 is end
		return {
			startDate: dates[0],
			endDate: dates[1],
			dstOffset: offsets[1],
			standardOffset: offsets[0],
		};
	}
}
