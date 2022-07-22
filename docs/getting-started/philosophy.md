# The philosophy behind Z-Wave JS {docsify-ignore-all}

Simply put, Z-Wave JS is supposed to be **the best open source Z-Wave device driver** out there. This includes the following **goals**:

1. Be compliant with the Z-Wave specifications
1. Work well out of the box with **modern**, compliant Z-Wave devices
1. Provide an easy-to-use high-level API which makes sense
1. Handle the complicated things like associations, etc.

**Non-goals** however are:

1. Compatibility with other Z-Wave drivers
1. Fixing manufacturer's mistakes
1. Working around every device-related quirk or weird design choice

Readers might wonder why the latter is so explicitly mentioned. After all, Z-Wave JS includes workarounds for _some_ device-related issues. It is not always obvious where we draw the line, but in general, we limit workarounds to the following scenarios:

1. **Low-effort changes** providing bare-minimum compatibility to **broad range of legacy devices** which cannot be interacted with otherwise.
1. Changes that **prevent buggy devices from negatively impacting the entire network**, e.g. by flooding it in response to certain messages
1. Changes that enable **new and useful functionality** in a sensible way
1. Unifying behavior caused by different possible interpretations of **unclear specifications**, e.g. concerning associations and multi-channel devices

## A personal note on the "why"

Other Z-Wave drivers work around many more issues, sometimes going as far as providing device-specific implementations.

This may sound cynical but I don't think this should be done at all.
Buggy devices should really become a problem of the manufacturers who release them and don't offer any support whatsoever. The huge bunch of workarounds that other drivers implemented make it too easy for manufacturers to reject responsibility and claim _"But it works in XYZ, cannot be our fault!"_

I can understand the sentiment of making things work when you're using unofficial APIs etc, but Z-Wave is a standard, devices have to be certified and still too many devices with non-compliant behavior slip through the cracks - partially empowered by software with workarounds.

Only when we **stop solving the manufacturers' mistakes for them** and make them fix them, then we can get to a point where it becomes a benefit for the smart home community. Many issues I keep seeing would have been caught by QA if they bothered to test it at all, e.g.:

-   RGB controllers that are missing the blue channel from their list of supported colors
-   Thermostats with off-by-one errors, leading to the wrong scales/units being advertised (or none at all)
-   Power meters that randomly flip the most significant bit in their reports

Unfortunately, I can't make manufacturers do that, but I can take a stance and choose not to fix their mistakes (and neither should the other projects), even if it is annoying for users.
But maybe **having a majority of their users complain** because their stuff does not work with a standards-compliant software will change that mentality:

1. When there are issues with a device, contact the manufacturer support. Open Source projects are not free tech support for manufacturers.
1. Hold them accountable. If there is clearly an issue with the device firmware, demand them to fix it. Even if they initially claim its not their fault. European law recently even made it mandatory to provide updates for ~5 years.
1. Vote with your wallet:
    - Don't buy from manufacturers that don't provide any support
    - Don't buy from manufacturers that don't provide firmware updates or make you pay for them. Nowadays there is really not a reason not to provide them online.
    - Don't buy from manufacturers that tend to seek fault elsewhere (_"The device is certified, cannot be our fault..."_)
    - **DO** buy from manufacturers that have reliable devices and give good support.
    - [Inform yourself](getting-started/device-review.md) beforehand
