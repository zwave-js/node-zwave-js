# Remote serial port over TCP

Instead of using a local serial port, the driver can connect to a serial port hosted on a remote server via TCP, for example using [`ser2net`](https://github.com/cminyard/ser2net).
Removing the requirement to have a Z-Wave controller physically connected to the host running Z-Wave JS can have a few benefits, depending on the use case.

Examples include:

1. Being able to place the Z-Wave controller in another location, away from the Z-Wave JS host. \
   Ethernet is much more flexible when it comes to bridging distances than USB or serial interfaces.

2. Allowing for live migration of Z-Wave JS running in a virtual machine to another host in a cluster. \
   Passing through a physical USB or serial device ties a virtual machine to the host that has the hardware connected to it. This is especially true for Z-Wave controllers, as parts of the configuration reside in the hardware.

> [!NOTE] Proxying serial connections over TCP/IP networks introduces an additional point of failure. Latency, jitter and packet loss can all negatively affect the performance and functioning of a Z-Wave network. As such it is recommended to limit the use of this feature to local and preferably wired networks.\
> Considering these effects when [troubleshooting connectivity issues](troubleshooting/connectivity-issues.md) and mentioning the use of a remote serial port when reporting bugs is another good measure to take.

## Configuration in Z-Wave JS

To use a remote serial port, enter `tcp://<hostname-or-ip>:<port>` as the connection string in the "Serial Port" field of the Z-Wave JS configuration, where

-   `<hostname-or-ip>` is the hostname or IP address of the remote server
-   and `<port>` is the port number under which the serial port is accessible.

The serial port must be configured with the following settings:

-   raw, no timeout
-   baudrate: 115200
-   data bits: 8
-   parity: none
-   stop bits: 1

## Configuring `ser2net`

> [!NOTE] This uses the new YAML configuration format for `ser2net` and as such requires a `ser2net` version 4.0 or newer. If you have been using the old line-based configuration format make sure that you save the sample below using a `.yaml` suffix and point `ser2net` to that file.

The following `ser2net.yaml` configuration will expose a local serial port via TCP using `ser2net`:

```yaml
connection: &my-zwave
    accepter: tcp,<port>
    enable: on
    options:
        kickolduser: true
    connector: serialdev,<path-to-serial>,115200N81,nobreak,local
```

where `<path-to-serial>` is the path to the serial port on the remote server and `<port>` is the port number used in the connection string. The serial port configuration mentioned earlier is found encoded in the string `115200N81`.
The string `&my-zwave` defines an alias for this connection. `ser2net` requires an alias to be set and it can be used to reference a connection in more complex configurations but in this simple configuration it serves no further purpose.

## Enabling mDNS Service Discovery

Service Discovery via mDNS allows Z-Wave JS to automatically detect remote Z-Wave controllers shared through a TCP serial port on the network.

Z-Wave JS expects a remote serial port to be advertised within your domain (`.local` by default) using a service type of `_zwave._tcp`.

Analogous to the above configuration we can use `ser2net` to enable this feature:

```yaml
connection: &my-zwave
    accepter: tcp,<port>
    enable: on
    options:
        kickolduser: true
        mdns: true
        mdns-sysattrs: true
        mdns-type: "_zwave._tcp"
    connector: serialdev,<path-to-serial>,nobreak,local
```

In this case, the alias `my-zwave` will be used as the service instance name. This name can be customized to distinguish different instances. In this example the resulting `PTR` record value will be `my-zwave._zwave._tcp.local`.

For Service Discovery to fully function a few things are required:

1. The [`gensio`](https://github.com/cminyard/gensio) library underlying `ser2net` was built with mDNS support enabled. `ser2net` will fail to start with the above configuration if this is not the case. `ser2net` first started supporting mDNS in version 4.3.0.
2. The host running `ser2net` has a functioning implementation of mDNS / DNS-SD. For most Linux distributions it is sufficient if the [`avahi`](https://www.avahi.org/) daemon is enabled and running.
3. On the Z-Wave JS side it is necessary that the embedded mDNS implementation can participate in multicast communication on the local network. When running Z-Wave JS in a container this requires the container network to share the host network namespace, which in Docker can be achieved by passing `--network host` to the `docker run` command.
