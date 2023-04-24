#!/bin/bash

pid=$(ps aux | grep "$(which node) --async" | grep "test/run" | sed -r 's/\ +/\ /g' | cut -d" " -f2)
kill -SIGUSR1 $pid
