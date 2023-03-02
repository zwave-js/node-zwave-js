import React from "react";

export enum CLIPage {
	Prepare,
	SetUSBPath,
	StartingDriver,
	MainMenu,
	ConfirmExit,
}

interface INavigationContext {
	currentPage: CLIPage;
	navigate: (page: CLIPage) => void;
}

export const NavigationContext = React.createContext<INavigationContext>(
	{} as any,
);

export const useNavigation = (): readonly [
	navigate: (page: CLIPage) => void,
	currentPage: CLIPage,
] => {
	const { currentPage, navigate } = React.useContext(NavigationContext);
	return [navigate, currentPage];
};
