import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { useCallback, useState } from "react";
import { getEnumMemberName, RFRegion } from "zwave-js";
import { Center } from "../../components/Center.js";
import { useDialogs } from "../../hooks/useDialogs.js";
import { useDriver } from "../../hooks/useDriver.js";
import { useNavigation } from "../../hooks/useNavigation.js";

export interface ControllerSetRegionPageProps {
	// TODO:
}

const regions = (
	Object.entries(RFRegion).filter(
		([_, value]) => typeof value === "number",
	) as [string, RFRegion][]
).map(([name, region]) => ({
	label: name,
	value: region,
}));

type Item = (typeof regions)[number];

export const ControllerSetRegionPage: React.FC<ControllerSetRegionPageProps> = (
	props,
) => {
	const { driver } = useDriver();
	const [busy, setBusy] = useState(false);
	const { showSuccess, showError } = useDialogs();
	const { back } = useNavigation();

	const currentRegion = driver.controller.rfRegion;

	const setRegion = useCallback(
		async ({ value: region }: Item) => {
			setBusy(true);
			const result = await driver.controller.setRFRegion(region);
			setBusy(false);
			if (result) {
				showSuccess(
					`RF region changed to ${getEnumMemberName(
						RFRegion,
						region,
					)}`,
				);
			} else {
				showError(`Failed to change RF region.`);
			}
			back();
		},
		[driver.controller],
	);

	if (busy) {
		return (
			<Center>
				<Text>
					<Text color="green">
						<Spinner type="dots" />
					</Text>{" "}
					Setting RF region...
				</Text>
			</Center>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>Select RF region</Text>
			<SelectInput
				items={regions}
				onSelect={setRegion}
				initialIndex={regions.findIndex(
					(r) => r.value === currentRegion,
				)}
			/>
		</Box>
	);
};
