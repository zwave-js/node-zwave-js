# basic format

```
0         10        20        30        40        50        60        70        80        90     100
0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789

DIR [TAG1] [TAG2] ...Log message...                                             {prio} {opts} {info}

DIR :=
	optional direction of data flow. "<- " = inbound, " ->" = outbound
	must be empty ("   ") if left out

[TAG1] [TAG2] :=
	Tags describing the data (optional). Namespaces may define their own tags.
	Default tags are:
	* [ACK], [NAK], [CAN] - 1 byte control messages
	* [REQ] - Messages with type Request
	* [RES] - Messages with type Response
	* [ERROR] - Error messages, followed by the error description in the next line
	Additional tags include:
	* [Node 1] - Messages related to Node #1
	* [AddNodeToNetwork], [SendData], ... - Names of the message classes
	* [BasicCCGet], ... - Names of the CCs and CC Commands

Log message :=
	Content of the log message. If this crosses the 80 char line or does not fit between left and
	right-aligned tags, it will be placed in the next line instead.
	If it does not fit in one line, it will be broken into separate ones instead

Additional right-aligned tags:
{prio} :=
	Priority of the message (if not default)
{opts} :=
	(Multiple) transmit options
{info} :=
	Additional info relating the message transmission, e.g. "attempt #2", "confirmation", ...
Tags may cross the 80 char line. Namespaces may define their own tags.
```

Log messages are color-coded:

-   warn = yellow
-   error = red
-   others = white

# logging namespaces:

## `serial`

Is only logged if loglevel >= debug

lowest level, contains raw data (transmitted and received):

```
 -> 0xc0ffee...deadbeef (26 bytes)
<-  [ACK] (0x01)
<-  0xbada55 (3 bytes)
    Buffer := 0x01bada55 (4 bytes)
```

## `driver`

Is only logged if loglevel >= verbose

interpretation of the data in message form, basic control flow:

```
 -> [REQ] [AddNodeToNetwork] (...message specific...) --> {priority, transmit options, ...}
 -> [REQ] [AddNodeToNetwork] (...message specific...) --> {attempt #2}
...
 -> [REQ] [AddNodeToNetwork] (...message specific...) --> {giving up}
...
 -> [REQ] [AddNodeToNetwork] (...message specific...) --> {priority, transmit options, ...}
<-  [REQ] [AddNodeToNetwork] [Done] [Node 2] --> {final response / confirmation / ...}
...
 -> [REQ] [NodeId: 7] [SendData] [BasicCCGet] --> {priority, callback id, tx options}
...
<-  [ERROR]
    Dropping message with invalid payload:
    0xabcd...ef12 (15 bytes)
```

## `cntrlr`

Logging depends on the loglevel (info, warn, error)

interview process and node specific value events

```
[Value added][batterycc] [Endpoint 1] isLow = false
```
