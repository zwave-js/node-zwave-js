/**
 * Checks whether there is a compatible update for the currently installed config package.
 * Returns the new version if there is an update, `undefined` otherwise.
 * Throws if the update check failed.
 */
export declare function checkForConfigUpdates(currentVersion: string): Promise<string | undefined>;
/**
 * Installs the update for @zwave-js/config with the given version.
 */
export declare function installConfigUpdate(newVersion: string): Promise<void>;
/**
 * Installs the update for @zwave-js/config with the given version.
 * Version for Docker images that does not mess up the container if there's no yarn cache
 */
export declare function installConfigUpdateInDocker(newVersion: string, external?: {
    configDir: string;
    cacheDir: string;
}): Promise<void>;
//# sourceMappingURL=UpdateConfig.d.ts.map