# /config

This directory contains metadata about known devices like device descriptions and config parameter definitions.

The file `manufacturers.json` maps manufacturer IDs to manufacturer and brand names
The directory `devices` contains the metadata for each known device. It is structured as follows:

```
<manufacturerId>/<productId>/<productType>[_<firmwareVersion>].json
```

where:

-   `manufacturerId` is the manufacturer ID formatted as a 16-bit hex number, e.g. `0x0012`
-   `productId` is the product ID formatted as a 16-bit hex number, e.g. `0x0064`
-   and `productType` is the product type formatted as a 16-bit hex number, e.g. `0x0101`.

To incorporate differences from different firmware versions, the relevant firmware version may be added.

## TODO: Describe options in the config files

The configuration files are parsed as JSON5, so you may use comments.
