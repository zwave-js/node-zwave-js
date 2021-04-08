# Missing updates from a device

So called unsolicited updates (that weren't requested by `zwave-js`) are sent by devices via associations - usually the "Lifeline". The Z-Wave specifications don't do a terribly good job at explaining how these should be configured and used, so of course it is done wrong very often. Missing updates are usually caused by incorrect associations or devices that send incorrect or ambiguous reports.

This section is meant to help you figure out why and reduce debugging time for us when you report issues. Please follow this checklist and correct any findings before opening an issue.

1. Check whether the device supports `Association CC`, `Multi Channel Association CC` and/or `Multi Channel CC` and note the CC versions.  
   _You should find this info in the cache file `<homeid>.json` or in node dumps from the applications._

1. Check whether the Lifeline association is set up correctly. For `Z-Wave Plus` devices, this is association group 1. For legacy devices, check the manual.  
   _The following will assume that the controller is node 1._

    a.) The device supports `Multi Channel CC` and `Multi Channel Association CC` version 3 or higher: **Node `1`, endpoint `0`**

    b.) The device supports `Multi Channel CC` and `Multi Channel Association CC` version 1 or 2: **Node `1`, no endpoint**

    c.) The device supports `Multi Channel CC` and `Association CC`: **Node `1`, no endpoint**

    d.) The device **does not** support `Multi Channel CC`: **Node `1`, no endpoint**

1. Check the logfile which reports the device sends. This depends on how the association is set up.

    a.) **Target endpoint 0:**  
    The device **should** send encapsulated reports (with source endpoint information):

    ```
    DRIVER « [Node 011] [REQ] [ApplicationCommand]
             └─[MultiChannelCCCommandEncapsulation]
               │ source:      2
               │ destination: 0
               └─[ThermostatSetpointCCReport]
                   setpoint type: Heating
                   value:         71 °F
    ```

    These can be attributed to the correct endpoint. If this is not the case, see b). Otherwise, this seems to be okay from the `node-zwave-js` point of view.

    b.) **No target endpoint:**  
    The device likely sends un-encapsulated reports (no source endpoint information):

    ```
    DRIVER « [Node 011] [REQ] [ApplicationCommand]
             └─[ThermostatSetpointCCReport]
                 setpoint type: Heating
                 value:         71 °F
    ```

    This means that we don't know which endpoint this report is from. If it was meant to come from an endpoint, we might be able to work around the missing info - see 4.

1. Check if the Command Class included in the report is supported on more than one endpoint (excluding endpoint `0`).  
   _You should find this info in the cache file `<homeid>.json` or in node dumps from the applications, for example:_

    ```json
    "endpoints": {
        "0": {
            "isSupported": true,
            "isControlled": false,
            "secure": false,
            "version": 0
        },
        "1": {
            "isSupported": true,
            "isControlled": false,
            "secure": false,
            "version": 0
        },
        "2": {
            "isSupported": true,
            "isControlled": false,
            "secure": false,
            "version": 0
        },
        // ...
    }
    ```

    a) It is supported on **exactly 1** endpoint (excluding `0`): The compat flag `mapRootReportsToEndpoints` should help.  
     Please open an issue (with the information you've gathered so far), so we can decide what to do.

    b) It is supported on **more than 1** endpoint (excluding `0`): Now it gets complicated.  
     Please open an issue (with the information you've gathered so far), so we can decide what to do.
