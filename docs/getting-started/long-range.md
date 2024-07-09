# Supporting Z-Wave Long Range in Applications

Z-Wave Long Range (ZWLR) is an addition to Z-Wave, that allows for a massively increased transmission range and up to 4000 nodes in a single network. Z-Wave Long Range uses a star topology, where all nodes communicate directly with the controller. This means that ZWLR nodes cannot be used to route messages for non-ZWLR nodes.

There are a few things applications need to be aware of to support Long Range using Z-Wave JS.

1. ZWLR node IDs start at 256. This can be used to distinguish between ZWLR and classic Z-Wave nodes.
1. ZWLR has only two security classes, S2 Access Control and S2 Authenticated. Both must use a different security key than their Z-Wave Classic counterparts. To configure them, use the `securityKeysLongRange` property of the [`ZWaveOptions`](api/driver#zwaveoptions)
1. ZWLR inclusion works exclusively through [Smart Start](getting-started/security-s2#smartstart).\
   ZWLR nodes advertise support for Long Range in the `supportedProtocols` field of the `QRProvisioningInformation` object (see [here](api/utils#other-qr-codes)). When this field is present, the user **MUST** have the choice between the advertised protocols. Currently this means deciding between including the node via Z-Wave Classic (mesh) or Z-Wave Long Range (no mesh).\
   To include a node via ZWLR, set the `protocol` field of the `PlannedProvisioningEntry` to `Protocols.ZWaveLongRange` when [provisioning the node](api/controller#provisionsmartstartnode).
