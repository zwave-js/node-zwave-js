import React from "react";

export type IDialogsContext = {
	showError(message: React.ReactNode): Promise<void>;
	showWarning(message: React.ReactNode): Promise<void>;
	showSuccess(message: React.ReactNode): Promise<void>;
	queryInput(
		message: React.ReactNode,
		options?: {
			initial?: string;
			inline?: boolean;
		},
	): Promise<string | undefined>;
};

// Context that stores references to the methods that show Notifications and Modals
export const DialogsContext = React.createContext<IDialogsContext>({} as any);

export const useDialogs = () => React.useContext(DialogsContext);
