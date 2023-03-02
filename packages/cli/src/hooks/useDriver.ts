import React from "react";
import type { Driver } from "zwave-js";

interface IDriverContext {
	driver: Driver;
	setDriver: (driver: Driver) => void;
}

export const DriverContext = React.createContext<IDriverContext>({} as any);

export const useDriver = (): readonly [
	driver: Driver,
	setDriver: (driver: Driver) => void,
] => {
	const { driver, setDriver } = React.useContext(DriverContext);
	return [driver, setDriver];
};
