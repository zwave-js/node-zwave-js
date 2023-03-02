import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useEffect } from "react";
import { useDialogs } from "../hooks/useDialogs.js";
import { useDriver } from "../hooks/useDriver.js";
import { useGlobals } from "../hooks/useGlobals.js";
import { useMenu } from "../hooks/useMenu.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";
import { startDriver } from "../lib/driver.js";
import { toggleLogMenuItem } from "../lib/menu.js";

export const StartingDriverPage: React.FC = () => {
	useMenu([toggleLogMenuItem]);

	const { usbPath, logTransport } = useGlobals();
	const [driver, setDriver] = useDriver();
	const [navigate] = useNavigation();
	const { showError } = useDialogs();

	// When opening this page, try to start the driver
	useEffect(() => {
		if (driver) {
			navigate(CLIPage.MainMenu);
			return;
		} else if (!usbPath) {
			navigate(CLIPage.Prepare);
			return;
		}

		(async () => {
			try {
				const driver = await startDriver(usbPath, logTransport);
				setDriver(driver);
				navigate(CLIPage.MainMenu);
			} catch (e: any) {
				navigate(CLIPage.Prepare);
				showError(e.message);
			}
		})();
	}, []);

	return (
		<Box flexDirection="column" justifyContent="center">
			<Text>
				<Text color="green">
					<Spinner type="dots" />
				</Text>
				{" starting driver"}
			</Text>
		</Box>
	);
};
