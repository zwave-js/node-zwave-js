import { Text } from "ink";
import Spinner from "ink-spinner";
import { useCallback, useEffect, useState } from "react";
import type { Driver } from "zwave-js";
import { Center } from "../components/Center.js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useDriver } from "../hooks/useDriver.js";
import { useGlobals } from "../hooks/useGlobals.js";
import { useMenu } from "../hooks/useMenu.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";
import { startDriver } from "../lib/driver.js";
import { exitMenuItem, toggleLogMenuItem } from "../lib/menu.js";

export const StartingDriverPage: React.FC = () => {
	useMenu([toggleLogMenuItem, exitMenuItem]);

	const { usbPath, logTransport, clearLog } = useGlobals();
	const { driver, setDriver } = useDriver();
	const { navigate } = useNavigation();
	const { showError } = useDialogs();
	const [message, setMessage] = useState("starting driver");

	const onError = useCallback(
		(e: Error) => {
			showError(e.message);
		},
		[showError],
	);
	const onDriverReady = useCallback((driver: Driver) => {
		navigate(CLIPage.DeviceOverview);
	}, []);
	const onBootloaderReady = useCallback((driver: Driver) => {
		setMessage("driver stuck in bootloader mode");
		// TODO
	}, []);

	// When opening this page, try to start the driver
	useEffect(() => {
		if (driver) {
			navigate(CLIPage.DeviceOverview);
			return;
		} else if (!usbPath) {
			navigate(CLIPage.Prepare);
			return;
		}

		(async () => {
			try {
				clearLog();
				const driver = await startDriver(usbPath, {
					logTransport,
					onError,
					onDriverReady,
					onBootloaderReady,
				});
				setDriver(driver);
				setMessage("initializing");
			} catch (e: any) {
				navigate(CLIPage.Prepare);
				showError(e.message);
			}
		})();
	}, []);

	return (
		<Center>
			<Text>
				<Text color="green">
					<Spinner type="dots" />
				</Text>{" "}
				{message}
			</Text>
		</Center>
	);
};
