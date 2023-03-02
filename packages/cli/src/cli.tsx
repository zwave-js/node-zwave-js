import { Box, render, Text, useApp, useInput } from "ink";
import useStdoutDimensions from "ink-use-stdout-dimensions";
import { useCallback, useMemo, useState } from "react";
import type { Driver } from "zwave-js";
import { ConfirmExit } from "./components/ConfirmExit";
import { Frame, FrameLabelGroupProps } from "./components/Frame";
import { Log } from "./components/Log";
import { MainMenu } from "./components/MainMenu";
import { ModalMessage, ModalMessageState } from "./components/ModalMessage";
import { SetUSBPath } from "./components/setUSBPath";
import { StartingDriverPage } from "./components/StartingDriver";
import { VDivider } from "./components/VDivider";
import { Action, ActionsContext } from "./hooks/useActions";
import { DialogsContext } from "./hooks/useDialogs";
import { DriverContext } from "./hooks/useDriver";
import { GlobalsContext } from "./hooks/useGlobals";
import { MenuContext, MenuItem } from "./hooks/useMenu";
import { CLIPage, NavigationContext } from "./hooks/useNavigation";
import { createLogTransport, LinesBuffer } from "./lib/logging";
import { defaultMenuItems } from "./lib/menu";
import { PreparePage } from "./pages/Prepare";

process.on("unhandledRejection", (err) => {
	throw err;
});

const MIN_ROWS = 30;

const logBuffer = new LinesBuffer(10000);
const logTransport = createLogTransport(logBuffer.stream);

const compareMenuItems = (a: MenuItem, b: MenuItem): number => {
	if (a.compareTo) {
		return a.compareTo(b);
	} else if (b.compareTo) {
		return -b.compareTo(a);
	} else {
		return 0;
	}
};

const normalizeMenuItems = (items: MenuItem[]): FrameLabelGroupProps => {
	const leftItems = items.filter((i) => i.location.endsWith("Left"));
	const centerItems = items.filter((i) => i.location.endsWith("Center"));
	const rightItems = items.filter((i) => i.location.endsWith("Right"));
	return {
		left: leftItems
			.filter((i) => i.visible !== false)
			.sort(compareMenuItems)
			.map((i) => i.item)
			.filter(Boolean),
		center: centerItems
			.filter((i) => i.visible !== false)
			.sort(compareMenuItems)
			.map((i) => i.item)
			.filter(Boolean),
		right: rightItems
			.filter((i) => i.visible !== false)
			.sort(compareMenuItems)
			.map((i) => i.item)
			.filter(Boolean),
	};
};

const CLI: React.FC = () => {
	const { exit } = useApp();
	const [columns, rows] = useStdoutDimensions();

	const [usbPath, setUSBPath] = useState<string>("/dev/ttyACM0");
	const [driver, setDriver] = useState<Driver>();
	const [logEnabled, setLogEnabled] = useState<boolean>(false);

	const [cliPage, setCLIPage] = useState<CLIPage>(CLIPage.Prepare);

	const [modalMessage, setModalMessage] = useState<ModalMessageState>();
	const showError = useCallback(
		(message: React.ReactNode) => {
			setModalMessage({
				message: message,
				color: "red",
			});
		},
		[setModalMessage],
	);

	const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
	const updateMenuItems = useCallback(
		(added: MenuItem[], changed: MenuItem[], removed: MenuItem[]) => {
			setMenuItems((current) => {
				const ret = [
					...current.filter((i) => !removed.includes(i)),
					...added,
				];
				return ret;
			});
		},
		[setMenuItems],
	);

	// Prevent the app from exiting automatically
	useInput((input, key) => {
		// nothing to do
	});

	const performAction = useCallback(async (action: Action) => {
		// if (action.type === "navigate") {
		// 	setCLIPage(action.to);
		// }
	}, []);

	const topMenu = useMemo(() => {
		const topItems = menuItems.filter((i) => i.location.startsWith("top"));
		return normalizeMenuItems(topItems);
	}, [menuItems]);

	const bottomMenu = useMemo(() => {
		const bottomItems = menuItems.filter((i) =>
			i.location.startsWith("bottom"),
		);
		return normalizeMenuItems(bottomItems);
	}, [menuItems]);

	if (rows < MIN_ROWS) {
		return (
			<Box height={rows} justifyContent="center" alignItems="center">
				<Text>
					Terminal is too small{" "}
					<Text bold color="red">
						{columns}&times;{rows}
					</Text>
					. Please resize it to at least{" "}
					<Text bold color="green">
						{columns}&times;{MIN_ROWS}
					</Text>
					.
				</Text>
			</Box>
		);
	}

	return (
		<MenuContext.Provider value={{ updateItems: updateMenuItems }}>
			<GlobalsContext.Provider
				value={{ usbPath, logTransport, logEnabled, setLogEnabled }}
			>
				<NavigationContext.Provider
					value={{ currentPage: cliPage, navigate: setCLIPage }}
				>
					<ActionsContext.Provider value={{ do: performAction }}>
						<DriverContext.Provider
							value={{ driver: driver!, setDriver }}
						>
							<DialogsContext.Provider value={{ showError }}>
								<Frame
									topLabels={topMenu}
									bottomLabels={bottomMenu}
									height={rows}
									paddingY={1}
									flexDirection="row"
									alignItems="stretch"
									justifyContent="space-around"
								>
									{modalMessage ? (
										<ModalMessage
											onContinue={() =>
												setModalMessage(undefined)
											}
											color={modalMessage.color}
										>
											{modalMessage.message}
										</ModalMessage>
									) : (
										<>
											<Box
												flexGrow={1}
												justifyContent="center"
											>
												{cliPage ===
													CLIPage.Prepare && (
													<PreparePage />
												)}

												{cliPage ===
													CLIPage.SetUSBPath && (
													<SetUSBPath
														path={usbPath}
														onCancel={() =>
															setCLIPage(
																CLIPage.Prepare,
															)
														}
														onSubmit={(path) => {
															setUSBPath(path);
															setCLIPage(
																CLIPage.Prepare,
															);
														}}
													/>
												)}

												{cliPage ===
													CLIPage.StartingDriver && (
													<StartingDriverPage />
												)}

												{cliPage ===
													CLIPage.MainMenu && (
													<MainMenu />
												)}

												{cliPage ===
													CLIPage.ConfirmExit && (
													<ConfirmExit
														onCancel={() =>
															setCLIPage(
																CLIPage.Prepare,
															)
														}
														onExit={async () => {
															if (driver) {
																await driver.destroy();
															}
															exit();
														}}
													/>
												)}
											</Box>
											{logEnabled && (
												<Box>
													<VDivider color="gray" />
													<Log buffer={logBuffer} />
												</Box>
											)}
										</>
									)}
								</Frame>
							</DialogsContext.Provider>
						</DriverContext.Provider>
					</ActionsContext.Provider>
				</NavigationContext.Provider>
			</GlobalsContext.Provider>
		</MenuContext.Provider>
	);
};

// console.clear();
const { waitUntilExit } = render(<CLI />);
waitUntilExit().then(() => {
	// console.clear();
});
