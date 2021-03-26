# Guide on partial parameters

Some devices use a single parameter number to configure several, sometimes unrelated, options. For convenience, `node-zwave-js` provides a simple way to define these values as multiple (partial) configuration parameters.

For example,

```json
"40[0x01]": {
	"label": "Button 1: behavior",
	/* parameter definition */
},
"40[0x02]": {
	"label": "Button 1: notifications",
	/* parameter definition */
},
"40[0x04]": {
	"label": "Button 2: behavior",
	/* parameter definition */
},
"40[0x08]": {
	"label": "Button 2: notifications",
	/* parameter definition */
},
```

defines 4 partial parameters that each switch a single bit of parameter #40. Using the appended bit mask (e.g. `[0x01]`), you can configure which bits each partial parameter affects.

Partial parameters must follow these rules:

1. The `valueSize` must be the actual size of the parameter, as defined in the device manual (not just the part of the bitmask). Each partial parameter must have the same `valueSize`.
1. Each bitmask must fit into the configured `valueSize` of the parameter.
1. The `minValue`, `maxValue` and `defaultValue` as well as options values are relative to the lowest bit the bit mask. If the bit mask is `0xC` (binary `1100`), these properties must be in the range 0...3 (2 bits). Any required bit shifts are automatically done.

Partial parameters are a new concept for many and can be confusing at first, so this section is intended to provide some help. Let's take an advanced parameter from the Zooz ZEN21 as an example. Parameter #7 has the following values:

| Value | Meaning                                                                           |
| ----- | --------------------------------------------------------------------------------- |
| 0     | none                                                                              |
| 1     | physical tap on ZEN21 only                                                        |
| 2     | physical tap on connected 3-way switch only                                       |
| 3     | physical tap on ZEN21 or connected 3-way switch                                   |
| 4     | Z-Wave command from hub                                                           |
| 5     | physical tap on ZEN21 or Z-Wave command from hub                                  |
| 6     | physical tap on connected 3-way switch or Z-Wave command from hub                 |
| 7     | physical tap on ZEN21 / connected 3-way switch or Z-Wave command from hub         |
| 8     | timer only                                                                        |
| 9     | physical tap on ZEN21 or timer                                                    |
| 10    | physical tap on connected 3-way switch or timer                                   |
| 11    | physical tap on ZEN21 / connected 3-way switch or timer                           |
| 12    | Z-Wave command from hub or timer                                                  |
| 13    | physical tap on ZEN21, Z-Wave command from hub, or timer                          |
| 14    | physical tap on ZEN21 / connected 3-way switch, Z-Wave command from hub, or timer |
| 15    | all of the above                                                                  |

If you look closely, you'll find 4 options which are all combined with each other:

| Value | Meaning                                |
| ----- | -------------------------------------- |
| 1     | physical tap on ZEN21                  |
| 2     | physical tap on connected 3-way switch |
| 4     | Z-Wave command from hub                |
| 8     | timer                                  |

For example, value 13 (8 + 4 + 1) enables **physical tap on ZEN21**, **Z-Wave command from hub** and the **timer**. One can represent these values as single bits of the combined value instead:

| decimal value | binary value | bit # | Meaning                                |
| ------------- | ------------ | ----- | -------------------------------------- |
| 1             | 00000001     | 0     | physical tap on ZEN21                  |
| 2             | 00000010     | 1     | physical tap on connected 3-way switch |
| 4             | 00000100     | 2     | Z-Wave command from hub                |
| 8             | 00001000     | 3     | timer                                  |

These single-bit parameters which can be freely combined are **partial parameters** in `zwave-js`. They are addressed by the parameter number (7 in this case) and the bitmask, represented as hexadecimal, for example `7[0x01]`.

> [!NOTE] All values of partial parameters are relative to the bitmask, and `zwave-js` takes care of the math for you.  
> This means a single-bit partial parameter always has the values `0` and `1`, independently of the actual bitmask which could be `00010000` or `00000001`. Likewise, a partial parameter with three bits (e.g. `01110000` or `00001110`) always accepts the values `0` to `7`.

With this knowledge, the above parameters are translated to partial parameters as follows:

| param # | bitmask | values     | Meaning                                |
| ------- | ------- | ---------- | -------------------------------------- |
| 7       | `0x01`  | `0` or `1` | physical tap on ZEN21                  |
| 7       | `0x02`  | `0` or `1` | physical tap on connected 3-way switch |
| 7       | `0x04`  | `0` or `1` | Z-Wave command from hub                |
| 7       | `0x08`  | `0` or `1` | timer                                  |

So in order to enable the aforementioned option **physical tap on ZEN21, Z-Wave command from hub, or timer** with partial parameters, the partial parameters **physical tap on ZEN21** (`7[0x01]`), **Z-Wave command from hub** (`7[0x04]`) and **timer** (`7[0x08]`) need to be set to `1` and the other one to `0`.
