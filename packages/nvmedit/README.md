# Z-Wave JS: NVM editor

CLI utility to convert binary NVM backups from Z-Wave controllers into JSON and back. Can be used to edit a Z-Wave controller's memory or convert it between different firmware revisions.\
**WARNING:** This is highly experimental. Use at your own risk!

(Probably) supports all NVM files in the NVM3 format, which is used starting with Z-Wave SDK 6.61+.

## Usage

You can either execute the current version directly from `npm` using

```
npx @zwave-js/nvmedit ...command...
```

or you can execute the version in the checked out repository by executing

```
yarn ts packages/nvmedit/src/cli.ts ...command...
```

The following documentation will use the first approach.

## Convert one NVM to be compatible with another one

**This is probably the command you're looking for.** It converts the format of an NVM backup between different Z-Wave modules.

```
npx @zwave-js/nvmedit convert --source <source> --target <target> --out <output>
```

`<source>` specifies the source NVM filename. This file will be converted to match the target NVM.\
`<target>` specifies the target NVM filename. This file will used to determine how to convert the source NVM.\
The resulting NVM will be written to `<output>`.

## Convert binary NVM file to JSON

```
npx @zwave-js/nvmedit nvm2json --in /path/to/nvm.bin --out /path/to/nvm.json [--verbose]
```

The `--verbose` flag will print additional output like memory page contents or parsed NVM objects to the console.

The `.bin` file must either contain a 700-series NVM (SDK version 7.x) or a 500-series NVM (SDK version 6.61+). The `.json` output format will depend on the SDK version.

## Convert JSON NVM file to binary

```
npx @zwave-js/nvmedit json2nvm --in /path/to/nvm.json --out /path/to/nvm.bin --protocolVersion <ver.si.on>
```

`<ver.si.on>` determines the output format of the NVM file and must be replaced with the target SDK version which must match your stick's firmware version
Only firmware version `7.x` is supported. Converting a 500-series `.json` to a 700-series `.json` must be done beforehand in a separate step.

**ATTENTION:** The input `.json` file must contain a `"meta"` section which contains some information about the target stick. If it is missing, you can use the `nvm2json` command to convert a backup of the target stick and copy the section from there.

## Convert 500-series JSON to 700-series JSON

```
npx @zwave-js/nvmedit 500to700 --in /path/to/nvm500.json --out /path/to/nvm700.json [--truncate]
```

Some 500-series NVM backups contain more application data than the 700-series NVM has reserved for this field. The conversion routine will try to remove 0-bytes at the start and end, but if this is not enough, it will fail. Set the `--truncate` option to allow truncating potentially valid application data.

## Convert 700-series JSON to 500-series JSON

```
npx @zwave-js/nvmedit 700to500 --in /path/to/nvm700.json --out /path/to/nvm500.json
```
