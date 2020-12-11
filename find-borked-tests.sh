#!/usr/bin/env bash

for file in $(find packages -name "*.test.ts")
do
	npm run test:ts -- --testPathPattern="$file" |& grep 'Jest did not exit' &> /dev/null
	if [ $? == 0 ]; then
		echo -e "\e[31m[NOK] $file\e[0m"
	else
		echo -e "\e[32m[OK]  $file\e[0m"
	fi
done
