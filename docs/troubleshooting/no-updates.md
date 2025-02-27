# Missing updates from a device

So called unsolicited updates (that weren't requested by `zwave-js`) are sent by devices via associations - usually the "Lifeline". The Z-Wave specifications don't do a terribly good job at explaining how these should be configured and used, so of course it is done wrong very often. Missing updates are usually caused by incorrect associations or devices that send incorrect or ambiguous reports.

This section is meant to help you figure out why and reduce debugging time for us when you report issues. Please follow this checklist and correct any findings before opening an issue.

1. Check whether the device supports `Association CC` or `Multi Channel Association CC`. If it doesn't it cannot send unsolicited updates and must be polled regularly.\
   _You should find this info in the cache file `<homeid>.json` or in node dumps from the applications._

1. Check whether **any** Lifeline association is set up. For `Z-Wave Plus` devices, this is association group 1. For legacy devices, check the manual.\
   If not, **try re-interviewing** the device. `zwave-js` will try to configure the correct associations automatically.\
   The lifeline association should have the controller as the target node. The type of association and the target endpoint depends on many factors, which would be too much for this guide.

1. Check the logfile which reports the device sends.

   a) **With source endpoint information**\
   The source endpoint should correspond to the endpoint you're using to control the device. These reports can be attributed to the correct endpoint:

   ```log
   DRIVER « [Node 011] [REQ] [ApplicationCommand]
            └─[MultiChannelCCCommandEncapsulation]
              │ source:      2
              │ destination: 0
              └─[ThermostatSetpointCCReport]
                  setpoint type: Heating
                  value:         71 °F
   ```

   If this is not the case, see b). Otherwise, this seems to be okay from the `zwave-js` point of view.

   b) **No source endpoint**\
   The device sends un-encapsulated reports (no source endpoint information):

   ```log
   DRIVER « [Node 011] [REQ] [ApplicationCommand]
            └─[ThermostatSetpointCCReport]
                setpoint type: Heating
                value:         71 °F
   ```

   This means that we don't know which endpoint this report is from. If it was meant to come from an endpoint, we might be able to work around the missing info - see 4.

   c) **None**\
   Most likely the lifeline is not set up correctly. Some devices spread their reports across multiple association groups. Consult the manual to figure out which reports are sent in which group.

1. Check if the Command Class included in the report is supported on more than one endpoint (excluding endpoint `0`).\
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

   a) It is supported on **exactly 1** endpoint (excluding `0`): The compat flag `mapRootReportsToEndpoint` should help.\
   Please open an issue (with the information you've gathered so far), so we can decide what to do.

   b) It is supported on **more than 1** endpoint (excluding `0`): Now it gets complicated.\
   Please open an issue (with the information you've gathered so far), so we can decide what to do.
