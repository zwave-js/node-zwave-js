import { Box, render, useApp } from "ink";
import { useState } from "react";
import { ConfirmExit } from "./components/confirmExit";
import { Header } from "./components/header";
import { MainMenu } from "./components/mainMenu";
import { SetUSBPath } from "./components/setUSBPath";

enum CLIPage {
	SetUSBPath,
	MainMenu,
	StartingDriver,
	ConfirmExit,
}

const CLI: React.FC = () => {
	const { exit } = useApp();

	const [cliPage, setCLIPage] = useState<CLIPage>(CLIPage.MainMenu);
	const [usbPath, setUSBPath] = useState<string | undefined>(undefined);

	return (
		<Box flexDirection="column">
			<Header usbPath={usbPath} />
			{cliPage === CLIPage.SetUSBPath && (
				<SetUSBPath
					path={usbPath}
					onCancel={() => setCLIPage(CLIPage.MainMenu)}
					onSubmit={(path) => {
						setUSBPath(path);
						setCLIPage(CLIPage.MainMenu);
					}}
				/>
			)}
			{cliPage === CLIPage.MainMenu && (
				<MainMenu
					onExit={() => setCLIPage(CLIPage.ConfirmExit)}
					onSetUSBPath={() => setCLIPage(CLIPage.SetUSBPath)}
				/>
			)}
			{cliPage === CLIPage.ConfirmExit && (
				<ConfirmExit
					onCancel={() => setCLIPage(CLIPage.MainMenu)}
					onExit={() => exit()}
				/>
			)}
		</Box>
	);
};

const { waitUntilExit } = render(<CLI />);
void waitUntilExit();
