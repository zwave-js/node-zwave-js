# Using a Zniffer

A Zniffer is a Z-Wave controller with special firmware that can capture Z-Wave traffic from any nearby Z-Wave device. This is useful for troubleshooting, as it allows you to see exactly what is being sent and received by the devices in your network.

## Prerequisites

- [Simplicity Studio 5](https://www.silabs.com/developers/simplicity-studio) for your operating system
- A [Silicon Labs Account](https://community.silabs.com/SL_CommunitiesSelfReg) to install and use the Z-Wave SDK
- A (spare) Zniffer-compatible Z-Wave controller - it cannot run the controller and Zniffer firmware at the same time:
  - [ZGM230-DK2603A](https://www.silabs.com/development-tools/wireless/z-wave/z-wave-800-dev-kit?tab=overview) 800 series development kit. We recommend using this device as it has a good antenna and can easily converted between a Zniffer and a regular controller.
  - [SLUSB001A / UZB7](https://www.silabs.com/development-tools/wireless/z-wave/efr32zg14-usb-7-z-wave-700-stick-bridge-module?tab=overview) may also work (unverified).
  - Or (if you really have to) the `ACC-UZB3-x-STA` 500 series controller - where `x` is the frequency identifier, e.g. `E` for Europe, `U` for USA, `H` for Japan (and potentially AUS/NZ). The black versions will work in any region, the white ones only in the one specified on the outside.
    \
    Programming this is also more complicated, error-prone and requires a Windows PC. Also you'll have to get your hands on the required firmware and drivers somehow.

> [!WARNING] Converting a controller to a Zniffer will erase the network information on the controller. Do not convert a controller that is part of a production network.

## Installation

1. Install Simplicity Studio
1. If using an 700/800 series Zniffer, install the Z-Wave (Gecko) SDK in the latest version inside Simplicity Studio.
1. If using the 500 series Zniffer, figure out where to get the Zniffer firmware and drivers from.

## Converting a UZB3 to a Zniffer

See https://community.silabs.com/s/article/z-wave-500-converting-a-uzb3-controller-to-a-zniffer?language=en_US

## Converting a 700/800 series controller to a Zniffer

1. Open Simplicity Studio and connect the Z-Wave controller to your PC.
1. (optional) Open Flasher and enable debug access (TODO: correct labels, screenshots)
1. (optional) Flash the Gecko Bootloader:
   1. Create a new project
   1. Set filters (TODO: correct labels, screenshots)
   1. Find XMODEM bootloader (TODO: correct labels, screenshots)
   1. Wait for the project to be created
   1. Run it (TODO: menu items, screenshots)
1. Flash the Zniffer firmware:
   1. Create a new project
   1. Set filters (TODO: correct labels, screenshots)
   1. Find Zniffer firmware (TODO: correct labels, screenshots)
   1. Click RUN
