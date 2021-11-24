# Z-Wave JS: NVM editor

CLI utility to convert binary NVM backups from Z-Wave controllers into JSON and back. Can be used to edit a Z-Wave controller's memory or convert it between different firmware revisions.  
**WARNING:** This is highly experimental. Use at your own risk!

(Probably) supports all NVM files in the NVM3 format, which is used starting with Z-Wave SDK 6.61+.

## Usage

### Convert binary NVM file to JSON

```
npx @zwave-js/nvmedit nvm2json --in /path/to/nvm.bin --out /path/to/nvm.json [--verbose]
```

The `--verbose` flag will print additional output like memory page contents or parsed NVM objects to the console.

more features coming soon...

<!-- ### Convert JSON NVM file to binary
```
npx @zwave-js/nvmedit json2nvm --in /path/to/nvm.json --out /path/to/nvm.bin
``` -->
