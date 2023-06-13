# Frequently Asked Questions

## Does Z-Wave JS support secondary controllers?

Yes and no.

Z-Wave JS expects to **be the primary controller** in the network and it will try to assume that role when started. It will not work correctly as a secondary controller.

It does however support **having secondary controllers in the network**. This includes:

-   Including/excluding a secondary controller
-   Letting secondary controllers (inclusion controllers) include and exclude devices
-   Perform network key exchange with devices included by a secondary controller
