import React from "react";
import type winston from "winston";

interface IGlobalsContext {
	usbPath: string;
	logTransport: winston.transport;
	logEnabled: boolean;
	setLogEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export const GlobalsContext = React.createContext<IGlobalsContext>({} as any);

export const useGlobals = () => React.useContext(GlobalsContext);
