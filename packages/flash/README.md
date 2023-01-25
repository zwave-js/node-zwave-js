# Z-Wave JS: Firmware Flasher

CLI utility to flash the firmware on Z-Wave controllers

**WARNING:** Flashing the wrong firmware may brick your controller. Use at your own risk!

## Usage

You can either execute the current version directly from `npm` using

```
npx @zwave-js/flash <port> <filename> [--verbose]
```

or you can execute the version in the checked out repository by executing

```
yarn ts packages/nvmedit/src/cli.ts <port> <filename> [--verbose]
```

The `--verbose` flag will cause the driver logs to be printed to console.
