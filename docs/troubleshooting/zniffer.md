# Creating a Zniffer

A Zniffer is a Z-Wave controller with special firmware that can capture Z-Wave traffic from any nearby Z-Wave device. This is useful for troubleshooting, as it allows you to see exactly what is being sent and received by the devices in your network.

## Prerequisites

- [Simplicity Studio 5](https://www.silabs.com/developers/simplicity-studio) for your operating system
- A [Silicon Labs Account](https://community.silabs.com/SL_CommunitiesSelfReg) to install and use the Z-Wave SDK
- A (spare) Zniffer-compatible Z-Wave controller - it cannot run the controller and Zniffer firmware at the same time:
  - [ZGM230-DK2603A](https://www.silabs.com/development-tools/wireless/z-wave/z-wave-800-dev-kit?tab=overview) 800 series development kit. We recommend using this device as it has a good antenna and can easily converted between a Zniffer and a regular controller.
  - [SLUSB001A / UZB7](https://www.silabs.com/development-tools/wireless/z-wave/efr32zg14-usb-7-z-wave-700-stick-bridge-module?tab=overview) may also work (unverified).
  - Or (if you really have to) the `ACC-UZB3-x-STA` 500 series controller - where `x` is the frequency identifier, e.g. `E` for Europe, `U` for USA, `H` for Japan (and potentially AUS/NZ). The black versions will work in any region, the white ones only in the one specified on the outside.\
    Programming this is also more complicated, error-prone and requires a Windows PC. Also you'll have to get your hands on the required firmware and drivers somehow.

> [!WARNING] Converting a controller to a Zniffer will erase the network information on the controller. Do not convert a controller that is part of a production network.

## Installation

1. Install Simplicity Studio
1. If using an 800 series Zniffer, install the **Simplicity SDK** in the latest version inside Simplicity Studio.
1. If using an 700 series Zniffer, install the **Gecko SDK** in the latest version inside Simplicity Studio.
1. If using the 500 series Zniffer, figure out where to get the Zniffer firmware and drivers from.

## Converting a 700/800 series controller into a Zniffer

1. Open Simplicity Studio and connect the Z-Wave controller to your PC.
1. If switching from a controller to a Zniffer, **erase the device**:
   1. Click on **Tools**
   1. Click on **Simplicity Commander**, then OK
   1. Select your device in the top left corner under _Select Kit..._
   1. Go to the **Flash** tab
   1. Click on **Erase User Data** _(not sure if necessary)_
   1. Click on **Erase chip**
   1. Click on **Unlock Debug Access**, then confirm that the device will be erased
   1. Close Simplify Commander
1. (optional) Install the Gecko **Bootloader** - this is only necessary the first time and after enabling debug access:
   1. Open the Welcome page
   1. Select your device, click **Start**
   1. Make sure that the latest Gecko SDK (700 series) or Simplicity SDK (800 series) is selected under **Preferred SDK**
   1. Click on the **Example Projects & Demos** tab
   1. Select filters: **Z-Wave**, search for **bootloader**
   1. If the list contains a demo with an **OTW Bootloader** for your board, e.g. **Z-Wave OTW BRD2603A Bootloader**:
      1. On that card, click **RUN**
   1. If not:
      1. In the **Bootloader - NCP UART XMODEM (For Z-Wave Applications)** card, click **CREATE**
      1. Accept the defaults on the following dialog and click **FINISH**
      1. Wait for the project to be created
      1. In the Project explorer, right-click your project. From the context menu, select **Run As** → **1 Silicon Labs ARM Program**
   1. Wait for the flashing to complete. The bootloader is now installed.
1. Install the **Zniffer firmware**:
   1. Open the Welcome page
   1. Select your device, click **Start**
   1. Make sure that the latest Gecko SDK (700 series) or Simplicity SDK (800 series) is selected under **Preferred SDK**
   1. Click on the **Example Projects & Demos** tab
   1. Select filters: **Z-Wave**, search for **Zniffer**
   1. If the list contains a demo with **NCP Zniffer Beta** in the name (the region does not matter, as you can change it in software):
      1. On that card, click **RUN**
   1. If not:
      1. In the **Z-Wave - NCP Zniffer Beta** card, click **CREATE**
      1. Accept the defaults on the following dialog and click **FINISH**
      1. Wait for the project to be created
      1. In the Project explorer, right-click your project. From the context menu, select **Run As** → **1 Silicon Labs ARM Program**
   1. Wait for the flashing to complete. The Zniffer firmware is now installed.
   1. On Windows, you can immediately verify that it works by starting **Tools** → **Z-Wave Zniffer**.

## Updating the Zniffer

See [Converting a 700/800 series controller into a Zniffer](#converting-a-700800-series-controller-into-a-zniffer), step _4. Install the Zniffer firmware_.

## Converting a 700/800 Zniffer back into a controller

1. Open Simplicity Studio and connect the Zniffer to your PC.
1. **Erase the device**:
   1. Click on **Tools**
   1. Click on **Simplicity Commander**, then OK
   1. Select your device in the top left corner under _Select Kit..._
   1. Go to the **Flash** tab
   1. Click on **Erase User Data** _(not sure if necessary)_
   1. Click on **Erase chip**
   1. Click on **Unlock Debug Access**, then confirm that the device will be erased
   1. Close Simplify Commander
1. Install the Gecko **Bootloader**:
   1. Open the Welcome page
   1. Select your device, click **Start**
   1. Make sure that the latest Gecko SDK (700 series) or Simplicity SDK (800 series) is selected under **Preferred SDK**
   1. Click on the **Example Projects & Demos** tab
   1. Select filters: **Z-Wave**, search for **bootloader**
   1. If the list contains a demo with an **OTW Bootloader** for your board, e.g. **Z-Wave OTW BRD2603A Bootloader**:
      1. On that card, click **RUN**
   1. If not:
      1. In the **Bootloader - NCP UART XMODEM (For Z-Wave Applications)** card, click **CREATE**
      1. Accept the defaults on the following dialog and click **FINISH**
      1. Wait for the project to be created
      1. In the Project explorer, right-click your project. From the context menu, select **Run As** → **1 Silicon Labs ARM Program**
   1. Wait for the flashing to complete. The bootloader is now installed.
1. Install the **Controller firmware**:
   1. Open the Welcome page
   1. Select your device, click **Start**
   1. Make sure that the latest Gecko SDK (700 series) or Simplicity SDK (800 series) is selected under **Preferred SDK**
   1. Click on the **Example Projects & Demos** tab
   1. Select filters: **Z-Wave**, search for **Serial api**
   1. If the list contains a demo with **NCP Serial API Controller** in the name (the region does not matter, as you can change it in software):
      1. On that card, click **RUN**
   1. If not:
      1. In the **Z-Wave - NCP Serial API Controller** card, click **CREATE**
      1. Accept the defaults on the following dialog and click **FINISH**
      1. Wait for the project to be created
      1. In the Project explorer, right-click your project. From the context menu, select **Run As** → **1 Silicon Labs ARM Program**
   1. Wait for the flashing to complete. The Controller firmware is now installed.

## Converting a UZB3 into a Zniffer

See https://community.silabs.com/s/article/z-wave-500-converting-a-uzb3-controller-to-a-zniffer?language=en_US for instructions to install the Zniffer firmware and https://community.silabs.com/s/article/z-wave-500-programming-uzb3-controller-stick?language=en_US (including comments) on how to use the **Z-Wave Programmer** software.

> [!NOTE] It may be possible to convert the Zniffer back to a Z-Wave Controller by flashing the controller firmware. However, we did not verify this.

> [!WARNING] Flashing firmware on a 500 series controller is risky and may brick the device. Recovery is only possible by soldering a UART to the device. More information [here](https://community.silabs.com/s/article/z-wave-500-recovering-uzb3-controller-stick?language=en_US).
