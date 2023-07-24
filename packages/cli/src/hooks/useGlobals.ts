import React from "react";
import type winston from "winston";

interface IGlobalsContext {
	usbPath: string;
	logTransport: winston.transport;
	logVisible: boolean;
	setLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
	clearLog: () => void;
}

export const GlobalsContext = React.createContext<IGlobalsContext>({} as any);

export const useGlobals = () => React.useContext(GlobalsContext);
