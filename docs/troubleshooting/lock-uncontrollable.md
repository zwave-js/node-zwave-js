# A lock (or any secure device) cannot be controlled

Locks require encrypted communication for their critical functionality. There are several reasons that could cause the driver to communicate without encryption.

1. It could have no or wrong encryption keys. Make sure that the security keys (1 for S0, 3 for S2) are configured and match the ones that were used when including the device. If the keys don't match, you have to **exclude and include** the device again.
2. The device could have been included without encryption. Make sure that the device is included securely. If not, you have to **exclude and include** the device again.
3. The device did not respond when the driver tried to figure out the encryption level. Try re-interviewing.
