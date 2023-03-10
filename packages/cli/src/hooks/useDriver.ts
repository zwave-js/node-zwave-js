import React from "react";
import type { Driver } from "zwave-js";

interface IDriverContext {
	driver: Driver;
	setDriver: (driver: Driver) => void;
}

export const DriverContext = React.createContext<IDriverContext>({} as any);

export const useDriver = () => {
	const { driver, setDriver } = React.useContext(DriverContext);
	const destroyDriver = React.useCallback(async () => {
		if (!driver) return;
		await driver.destroy();
		// @ts-expect-error
		setDriver(undefined);
	}, [driver]);

	return { driver, setDriver, destroyDriver };
};
