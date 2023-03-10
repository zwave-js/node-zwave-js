import React from "react";
import type {
	ControllerEventCallbacks,
	Driver,
	DriverEventCallbacks,
} from "zwave-js";

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

export function useDriverEvent<K extends keyof DriverEventCallbacks>(
	type: K,
	listener: DriverEventCallbacks[K],
): void {
	const { driver } = React.useContext(DriverContext);
	React.useEffect(() => {
		driver.on(type, listener);
		return () => void driver.off(type, listener);
	}, [listener, type]);
}

export function useControllerEvent<K extends keyof ControllerEventCallbacks>(
	type: K,
	listener: ControllerEventCallbacks[K],
): void {
	const { driver } = React.useContext(DriverContext);
	const controller = driver.controller;
	React.useEffect(() => {
		controller.on(type, listener);
		return () => void controller.off(type, listener);
	}, [listener, type]);
}
