# Common issues

Here's a collection of common issues and how to solve them.

## Nodes are frequently marked dead

_...and sometimes come back immediately when pinged._

The log or error message likely mentions something along the lines of

> Failed to send the command after 3 attempts (Status NoAck)

> One or more nodes did not respond to the multicast request (Status NoAck)

**NoAck** means that the controller sent the command (a couple of times, including multiple retries over several seconds), but the node never acknowledged it. This is a sign of a bad connection between the controller and the node, or a general issue with your mesh. Read and follow [first steps](troubleshooting/first-steps.md).

_...and no, this can not be caused by a software update, even if that is when you noticed!_

## Inclusion finds no new devices

This can have multiple reasons:

**Bad connection between the controller and the device**\
See [first steps](troubleshooting/first-steps.md).

**The controller is set to a different frequency/region than the device**\
Check that the device is for the correct region. If it is, check and possibly change the region of your controller to the correct one.

**The device is not in inclusion mode**\
Check the device manual on how to put it into inclusion mode. Some devices require a button press, others a sequence of button presses.

**The device is still included in another network**\
Exclude the devide first, then try to include it again. Exclusion can be done using Z-Wave JS and will end without a message or with a message indicating that no device was excluded. This is normal.

**The device is out of range**\
Some older devices do not support network-wide inclusion, or lower their transmit power for inclusion. Move the device closer to the controller or vice-versa, then try again. After everything is back in its place, rebuild the routes for the new device.

## Inclusion of a new device fails completely

This means the controller told us that it was not able to perform the necessary communication to include the device, without going into detail why. Possible reasons are:

**Bad connection between the controller and the device**\
See [first steps](troubleshooting/first-steps.md).

**The device is in a weird state**\
Power-cycle the device, then try again. Possibly exclude the device (see above) and try again.

**The controller is in a weird state**\
Soft-reset (restart) the controller, then try again. If that does not help, power-cycle the controller (e.g. by unplugging it for a few seconds), then try again.

## Inclusion with Security ends in an error

On supporting applications, the error message should indicate **why** the secure inclusion failed. If not, driver logs should include the reason.

Typically, this is either a user error (wrong PIN, some keys not configured) or a timeout. Except for some rare cases, timeouts are caused by a **bad connection between the controller and the device**, see [first steps](troubleshooting/first-steps.md).

## Sensors report nonsensical values

See [nonsensical values appear randomly](troubleshooting/nonsensical-values.md).

## A device is not identified

In the Z-Wave standard, devices are identified by their "fingerprint", which are three numbers for **manufacturer ID**, **product type**, **product ID**. To map those to a device name, configuration files are required. However, for most of the functionality, these configuration files are **purely cosmetic**, especially for Z-Wave+ devices. It is likely that your device will work just fine, even if it is not recognized yet.

**Fingerprint is missing/undefined**\
This means that the device did not send its fingerprint during the interview.

- Ensure the connection to the device is good, see [first steps](troubleshooting/first-steps.md).
- Re-interview the device to query the information again.
- If that does not help, exclude the device, factory reset it, then include it again.

**Fingerprint is known, but the device is not identified**\
A device configuration file is required to map the fingerprint to a device name. See [below](#configuration-parameters-are-missing-or-wrong) on how to do this.

## A device is not sending updates

See [missing updates from a device](troubleshooting/no-updates.md).

## Some values are missing

Check if the device is marked **ready**. If not, have patience - the first interview of battery-powered nodes may take several hours. This can be sped up by waking them up manually, which might take multiple attempts.

> [!NOTE] A device that sends reports **does not** automatically mean it is awake. Refer to the device manual to figure out how to wake it up. Usually this is done by pressing a button on the device.

If the interview never gets completed, please consider opening an issue.

If the device is supposed to be using encryption, also see [below](#a-lock-or-any-secure-device-cannot-be-controlled).

## Configuration parameters are missing or wrong

Check the [changelog](https://github.com/zwave-js/zwave-js/blob/master/CHANGELOG.md) if there were any recent updates to the configuration files for your device. If so, **try re-interviewing** the device to pick up the changed parameters.

It can also be that there were issues during the first interview. In this case, **try re-interviewing** the device.

If that does not help, a change to configuration files might be necessary. Although the specification added the ability to discover the configuration, most devices out there don't support this functionality. For those, configuration files are required which define the available parameters. To add or correct support for a device, please do one of the following:

- Open a Pull Request and provide such a configuration file or edit an existing one. The [documentation](config-files/overview.md) describes how this is done.
- Or open an issue detailing which device you want added/fixed. Make sure to provide all the requested information.

## A lock (or any secure device) cannot be controlled

Locks require encrypted communication for their critical functionality. There are several reasons that could cause the driver to communicate without encryption:

1. It could have no or wrong encryption keys. Make sure that the security keys (1 for S0, 3 for S2) are configured and match the ones that were used when including the device. If the keys don't match, you have to **exclude**, possibly **factory reset** and **include** the device again.
2. The device could have been included without encryption. Make sure that the device is included securely. If not, you have to **exclude and include** the device again. See also [Inclusion with Security ends in an error](#inclusion-with-security-ends-in-an-error).
3. The device did not respond when the driver tried to figure out the encryption level. Try re-interviewing.

## 500 series controller becomes unresponsive

Aeotec Z-Stick Gen5 and Gen5+, Firmware `1.0` and `1.1`: Attempting to send a command to a dead node can cause cause some controller responses to be significantly delayed or completely lock up the controller. Upgrading to [firmware 1.2](https://aeotec.freshdesk.com/support/solutions/articles/6000252294-z-stick-gen5-v1-02-firmware-update) can solve this issue, but not all controllers can be upgraded.

This issue may be present on other 500 series controllers as well, best to contact the manufacturer for support.

## 700/800 series controller is "jammed" or becomes unresponsive

This is a series of firmware issues, with the unresponsiveness being the most severe.

> [!NOTE] You may have noticed this first after updating Z-Wave JS, but the issue is not caused by it. Rather, Z-Wave JS started detecting and exposing issues with the controller in a different way. Prior to that, it would be treated like a communication issue, randomly marking healthy nodes as dead.

It can only be resolved by a firmware update. However, there is no known firmware version that is completely fixed, so it is recommended to choose a firmware based on the following criteria:

- 700 series:
  - prefer SDK versions 7.17.2 to 7.18.x
  - SDK versions 7.19.x are okay
  - avoid SDK versions before 7.17.2
  - avoid SDK versions 7.20 to 7.21.3

- 800 series
  - prefer SDK versions 7.22.x
  - SDK versions 7.17.2 to 7.19.x are okay
  - avoid SDK versions before 7.17.2
  - avoid SDK versions 7.20 to 7.21.3

> [!NOTE] The SDK version does not have to match the firmware version. If you are unsure which SDK versions a firmware is based on, contact the manufacturer of your device.

> [!WARNING] Z-Wave controllers generally do not allow downgrading the firmware, at least not without compiling a custom bootloader. Be careful which firmware you choose to install and avoid the `_v255` upgrades available from Silicon Labs - those can not be upgraded either.

Firmware can be upgraded using the below directions:

- [Upgrade instructions using Linux and Z-Wave JS based applications](https://github.com/kpine/zwave-js-server-docker/wiki/700-series-Controller-Firmware-Updates-(Linux))
- [Upgrade instructions using Windows (Aeotec)](https://aeotec.freshdesk.com/support/solutions/articles/6000252296-update-z-stick-7-with-windows)
- [Upgrade instructions using Windows (Zooz)](https://www.support.getzooz.com/kb/article/931-how-to-perform-an-ota-firmware-update-on-your-zst10-700-z-wave-stick/)
- [Upgrade instructions using Windows/Linux (Z-Wave.Me)](https://z-wave.me/support/uzbrazberry-firmwares/)

## Timeout while waiting for an ACK from the controller

This means the controller is not responding to commands at all. Possible reasons are:

**Wrong path configured**\
The configured path points to an existing serial port, but it is not connected to a Z-Wave controller. Double check the path and the physical connection to the controller.

**The controller is unresponsive**\
See [above](#_700800-series-controller-is-quotjammedquot-or-becomes-unresponsive).

**The controller is bricked**\
If this happens after a firmware upgrade/downgrade, you may have bricked the controller. While 700/800 series bootloaders should prevent this, we've still seen reports of it happen. Contact the manufacturer for support.

**Incorrect VM settings, e.g. USB passthrough**\
If using a 500 series controller or older, read [this issue](https://github.com/zwave-js/zwave-js/issues/6341) and follow the steps proposed there.
If none of that helps: good luck, you're on your own.
