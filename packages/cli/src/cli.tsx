import { Box, render, Text, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import type { Driver } from "zwave-js";
import { Frame } from "./components/Frame.js";
import { HDivider } from "./components/HDivider.js";
import { Log } from "./components/Log.js";
import {
	InlineQuery,
	ModalMessage,
	ModalQuery,
	ModalState,
} from "./components/Modals.js";
import { SetUSBPath } from "./components/setUSBPath.js";
import { VDivider } from "./components/VDivider.js";
import { ActionsContext } from "./hooks/useActions.js";
import { DialogsContext } from "./hooks/useDialogs.js";
import { DriverContext } from "./hooks/useDriver.js";
import { GlobalsContext } from "./hooks/useGlobals.js";
import { MenuContext, useMenuItemSlots } from "./hooks/useMenu.js";
import {
	CLIPage,
	CLIPageWithProps,
	getPageComponent,
	NavigationContext,
} from "./hooks/useNavigation.js";
import { useStdoutDimensions } from "./hooks/useStdoutDimensions.js";
import { createLogTransport, LinesBuffer } from "./lib/logging.js";
import { defaultMenuItems } from "./lib/menu.js";

process.on("unhandledRejection", (err) => {
	throw err;
});

// We may have more than 10 input listeners active at any given time
process.stdin.setMaxListeners(100);

const MIN_ROWS = 30;

const logBuffer = new LinesBuffer(10000);
const logTransport = createLogTransport(logBuffer.stream);
const clearLog = () => logBuffer.clear();

const autostart = process.argv.includes("--start");

const CLI: React.FC = () => {
	const [columns, rows] = useStdoutDimensions();

	// Switch between horizontal and vertical layout
	const [layout, setLayout] = useState<"horizontal" | "vertical">(
		columns >= 180 ? "horizontal" : "vertical",
	);
	useEffect(() => {
		setLayout(columns >= 180 ? "horizontal" : "vertical");
	}, [columns, setLayout]);

	const [usbPath, setUSBPath] = useState<string>("/dev/ttyUSB0");
	const [driver, setDriver] = useState<Driver>();

	const [logVisible, setLogVisible] = useState<boolean>(false);

	const [cliPage, setCLIPage] = useState<CLIPageWithProps>({
		page: usbPath && autostart ? CLIPage.StartingDriver : CLIPage.Prepare,
		props: {},
	});
	const [prevCliPage, setPrevCLIPage] = useState<CLIPageWithProps>();

	const navigate = useCallback(
		(to: CLIPage, pageProps?: {}) => {
			setPrevCLIPage(cliPage);
			setCLIPage({ page: to, props: pageProps });
		},
		[cliPage, setCLIPage, setPrevCLIPage],
	);

	const back = useCallback(() => {
		if (prevCliPage) {
			setCLIPage(prevCliPage);
			setPrevCLIPage(undefined);
			return true;
		}
		return false;
	}, [prevCliPage, setCLIPage, setPrevCLIPage]);

	const [modalState, setModalState] = useState<ModalState>();
	const showError = useCallback(
		(message: React.ReactNode) => {
			setModalState({
				type: "message",
				message,
				color: "red",
				onSubmit: () => setModalState(undefined),
			});
		},
		[setModalState],
	);
	const showWarning = useCallback(
		(message: React.ReactNode) => {
			setModalState({
				type: "message",
				message,
				color: "yellow",
				onSubmit: () => setModalState(undefined),
			});
		},
		[setModalState],
	);
	const showSuccess = useCallback(
		(message: React.ReactNode) => {
			setModalState({
				type: "message",
				message,
				color: "green",
				onSubmit: () => setModalState(undefined),
			});
		},
		[setModalState],
	);
	const queryInput = useCallback(
		(
			message: React.ReactNode,
			options: {
				initial?: string;
				inline?: boolean;
			} = {},
		) => {
			const { initial, inline = false } = options;
			return new Promise<any>((resolve) => {
				setModalState({
					type: inline ? "queryInline" : "query",
					message,
					initial,
					onSubmit: (value) => {
						setModalState(undefined);
						resolve(value);
					},
					onCancel: () => {
						setModalState(undefined);
						resolve(undefined);
					},
				});
			});
		},
		[setModalState],
	);

	const [menuItemSlots, updateMenuItems] = useMenuItemSlots(defaultMenuItems);

	// Prevent the app from exiting automatically
	useInput(() => {
		// nothing to do
	});

	const performAction = useCallback(async () => {
		// if (action.type === "navigate") {
		// 	setCLIPage(action.to);
		// }
	}, []);

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

	const PageComponent = getPageComponent(cliPage.page);

	return (
		<MenuContext.Provider value={{ updateItems: updateMenuItems }}>
			<GlobalsContext.Provider
				value={{
					usbPath,
					logTransport,
					logVisible,
					setLogVisible,
					clearLog,
				}}
			>
				<NavigationContext.Provider
					value={{
						currentPage: cliPage.page,
						previousPage: prevCliPage?.page,
						navigate,
						back,
					}}
				>
					<ActionsContext.Provider value={{ do: performAction }}>
						<DriverContext.Provider
							value={{
								driver: driver!,
								setDriver,
							}}
						>
							<DialogsContext.Provider
								value={{
									showError,
									showWarning,
									showSuccess,
									queryInput,
								}}
							>
								<Frame
									topLabels={!modalState && menuItemSlots.top}
									bottomLabels={
										!modalState && menuItemSlots.bottom
									}
									height={
										rows -
										(process.env.NODE_ENV === "development"
											? layout === "horizontal"
												? 4
												: 10
											: 0)
									}
									width={columns}
									paddingY={1}
									flexDirection={
										layout === "horizontal"
											? "row"
											: "column"
									}
									alignItems="stretch"
									justifyContent="space-between"
								>
									{(!modalState ||
										modalState.type === "queryInline") && (
										<>
											<Box
												flexDirection="column"
												flexGrow={1}
												alignItems="stretch"
												justifyContent="center"
											>
												{/* TODO: This should be merged into `selectPage` */}
												{cliPage.page ===
													CLIPage.SetUSBPath && (
													<SetUSBPath
														path={usbPath}
														onCancel={() =>
															setCLIPage({
																page: CLIPage.Prepare,
															})
														}
														onSubmit={(path) => {
															setUSBPath(path);
															setCLIPage({
																page: CLIPage.Prepare,
															});
														}}
													/>
												)}

												{PageComponent && (
													<PageComponent
														{...cliPage.props}
													/>
												)}

												{modalState?.type ===
													"queryInline" && (
													<InlineQuery
														onSubmit={
															modalState.onSubmit
														}
														onCancel={
															modalState.onCancel
														}
														initial={
															modalState.initial
														}
														color={modalState.color}
													>
														{modalState.message}
													</InlineQuery>
												)}
											</Box>
											{logVisible && (
												<Box
													flexDirection={
														layout === "horizontal"
															? "row"
															: "column"
													}
													height={
														layout === "horizontal"
															? undefined
															: Math.min(
																	Math.floor(
																		rows /
																			2,
																	),
																	30,
															  )
													}
												>
													{layout === "horizontal" ? (
														<VDivider color="gray" />
													) : (
														<HDivider color="gray" />
													)}
													<Log buffer={logBuffer} />
												</Box>
											)}
										</>
									)}
									{modalState && (
										<>
											{modalState.type === "message" && (
												<ModalMessage
													onSubmit={
														modalState.onSubmit
													}
													color={modalState.color}
												>
													{modalState.message}
												</ModalMessage>
											)}
											{modalState.type === "query" && (
												<ModalQuery
													onSubmit={
														modalState.onSubmit
													}
													onCancel={
														modalState.onCancel
													}
													initial={modalState.initial}
													color={modalState.color}
												>
													{modalState.message}
												</ModalQuery>
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

render(<CLI />);
