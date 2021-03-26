# Importing config files from other sources

We provide import scripts to import and convert Z-Wave config files from other sources.

> [!NOTE]
> It is intended that these config files will be used only as a starting point. Almost always the resulting config files will need to be edited to comply with our [mandatory style guide](style-guide.md). For manufacturers with multiple similar devices, it may be necessary to define and use [templates](using-templates.md). Parameters may also need to be defined [conditionally](conditional-parameters.md) or converted to [partial parameters](config-files/partial-parameters.md).

## OpenZWave

If your device is already present in the [OpenZWave devices DB](https://github.com/OpenZWave/open-zwave/tree/master/config), you can import it by using its device id (which you can find in the zwavejs2mqtt control panel). Device config files also contain the device id but the format is different: `0086:0075:0004` in the file needs to be formatted as `0x0086-0x0075-0x0004` for the following commands.

The command to use is:

```bash
# if you're using npm
npm run config -- import -s ozw -Dd --ids 0x0086-0x0075-0x0004
# if you're using yarn
yarn run config import -s ozw -Dd --ids 0x0086-0x0075-0x0004
```

You can specify multiple device ids too:

```bash
# if you're using npm
npm run config -- import -s ozw -Dd --ids 0x0258-0x1027-0x0200 0x041a-0x0008-0x0200
# if you're using yarn
yarn run config import -s ozw -Dd --ids 0x0258-0x1027-0x0200 0x041a-0x0008-0x0200
```

## OpenSmartHouse Z-Wave Device Database (OpenHAB)

If you can find the file [here](https://opensmarthouse.org/zwavedatabase/), you can import it with the following commands:

```bash
# if you're using npm
npm run config -- import -s oh -Dd --ids 1234
# if you're using yarn
yarn run config import -s oh -Dd --ids 1234
```

To specify multiple device IDs, just append them to the command:

```bash
# if you're using npm
npm run config -- import -s oh -Dd --ids 1234 1235
# if you're using yarn
yarn run config import -s oh -Dd --ids 1234 1235
```

The device ID can be found in the browser URL - the device at `https://opensmarthouse.org/zwavedatabase/256` has the ID 256.
