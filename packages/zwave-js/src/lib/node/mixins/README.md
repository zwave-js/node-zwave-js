This folder contains "mixins" to compose the full functionality of the `ZWaveNode` class. They are not really mixins in the traditional sense, but rather "partial" classes that are extended in a fixed order to compose the full `ZWaveNode` class from manageable chunks.

Files should be prefixed with numbers to indicate the order in which the inheritance is done. Each file should export a class that extends the previous one.
