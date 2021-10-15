# Healing the network fails on Z-Wave 700 stick

Earlier firmware versions of the Z-Wave 700 series sticks had a bug where the commands for healing the network would not complete under some circumstances. To fix this, you need to upgrade the stick's firmware to the latest possible version (at the time of writing this is **7.16**). Unfortunately, you'll have to resort to Silabs' PC Controller tool, which is included in their [Simplicity Studio](https://www.silabs.com/developers/simplicity-studio) (Windows only!)
