import React from "react";
import { SetUSBPath } from "../components/setUSBPath.js";
import { BootstrappingNodePage } from "../pages/BootstrappingNode.js";
import { ConfirmExitPage } from "../pages/ConfirmExit.js";
import { ControllerSetRegionPage } from "../pages/Controller/SetRegion.js";
import { DestroyingDriverPage } from "../pages/DestroyingDriver.js";
import { DeviceDetailsPage } from "../pages/DeviceDetails.js";
import { DeviceOverviewPage } from "../pages/DeviceOverview.js";
import { ExcludeNodePage } from "../pages/ExcludeNode.js";
import { IncludeNodePage } from "../pages/IncludeNode.js";
import { PreparePage } from "../pages/Prepare.js";
import { RemoveFailedNodePage } from "../pages/RemoveFailedNode.js";
import { ReplaceFailedNodePage } from "../pages/ReplaceFailedNode.js";
import { StartingDriverPage } from "../pages/StartingDriver.js";

export enum CLIPage {
	Prepare,
	SetUSBPath,
	StartingDriver,
	DestroyingDriver,

	DeviceOverview,
	DeviceDetails,

	IncludeNode,
	BootstrappingNode,
	ExcludeNode,
	ReplaceFailedNode,
	RemoveFailedNode,

	ControllerSetRegion,

	ConfirmExit,
}

export interface CLIPageWithProps {
	page: CLIPage;
	props?: {};
}

interface INavigationContext {
	previousPage?: CLIPage;
	currentPage: CLIPage;
	// TODO: type this better
	navigate: (page: CLIPage, pageProps?: {}) => void;
	back: () => boolean;
}

export const NavigationContext = React.createContext<INavigationContext>(
	{} as any,
);

export const useNavigation = () => React.useContext(NavigationContext);

export function getPageComponent(cliPage: CLIPage): React.FC<any> | undefined {
	switch (cliPage) {
		case CLIPage.Prepare:
			return PreparePage;
		case CLIPage.SetUSBPath:
			return SetUSBPath;

		case CLIPage.StartingDriver:
			return StartingDriverPage;
		case CLIPage.DestroyingDriver:
			return DestroyingDriverPage;

		case CLIPage.DeviceOverview:
			return DeviceOverviewPage;
		case CLIPage.DeviceDetails:
			return DeviceDetailsPage;

		case CLIPage.IncludeNode:
			return IncludeNodePage;
		case CLIPage.BootstrappingNode:
			return BootstrappingNodePage;
		case CLIPage.ExcludeNode:
			return ExcludeNodePage;

		case CLIPage.ReplaceFailedNode:
			return ReplaceFailedNodePage;
		case CLIPage.RemoveFailedNode:
			return RemoveFailedNodePage;

		case CLIPage.ControllerSetRegion:
			return ControllerSetRegionPage;

		case CLIPage.ConfirmExit:
			return ConfirmExitPage;
	}
	return undefined;
}
