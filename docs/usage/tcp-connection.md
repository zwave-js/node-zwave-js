# Connect to a hosted serial port over TCP

Instead of using a local serial port, the driver can connect to a serial port hosted on a remote server via TCP, for example using [`ser2net`](https://linux.die.net/man/8/ser2net).

To do so, enter `tcp://<hostname-or-ip>:<port>` as the connection string, where

-   `<hostname-or-ip>` is the hostname or IP address of the remote server
-   and `<port>` is the port number under which the serial port is accessible.

The serial port must be configured with the following settings:

-   raw, no timeout
-   baudrate: 115200
-   data bits: 8
-   parity: none
-   stop bits: 1

If using `ser2net`, this corresponds to the following settings:

```
<port>:raw:0:<path-to-serial>:115200 8DATABITS NONE 1STOPBIT
```

where `<path-to-serial>` is the path to the serial port on the remote server and `<port>` is the port number used in the connection string.
