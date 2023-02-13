#!/bin/bash

sed -r -i 's#it\((.+), \(\) => \{#test\(\1, \(t\) => \{#' "$1"
sed -r -i 's#it\((.+), async \(\) => \{#test\(\1, async \(t\) => \{#' "$1"

sed -r -i 's#expect\((.+?)\).toBe\(#t.is\(\1, #' "$1"
sed -r -i 's#expect\((.+?)\).not.toBe\(#t.not\(\1, #' "$1"

sed -r -i 's#expect\((.+?)\).toEqual\(#t.deepEqual\(\1, #' "$1"
sed -r -i 's#expect\((.+?)\).toStrictEqual\(#t.deepEqual\(\1, #' "$1"
sed -r -i 's#expect\((.+?)\).not.toEqual\(#t.notDeepEqual\(\1, #' "$1"

sed -r -i 's#expect\((.+?)\).toBeTrue\(\)#t.true\(\1\)#' "$1"
sed -r -i 's#expect\((.+?)\).toBeFalse\(\)#t.false\(\1\)#' "$1"

sed -r -i 's#expect\((.+?)\).toBeUndefined\(\)#t.is\(\1, undefined\)#' "$1"
sed -r -i 's#expect\((.+?)\).not.toBeUndefined\(\)#t.not\(\1, undefined\)#' "$1"

sed -r -i 's#expect\((.+?)\).toInclude\((.+?)\)#t.true\(\1.includes\(\2\)\)#' "$1"
sed -r -i 's#expect\((.+?)\).not.toInclude\((.+?)\)#t.false\(\1.includes\(\2\)\)#' "$1"

sed -r -i 's#assertZWaveError\(#assertZWaveErrorAva\(t, #' "$1"
sed -r -i 's#assertCC\(#assertCCAva\(t, #' "$1"
sed -r -i 's#jest\.fn\(\)#sinon.spy\(\)#' "$1"
sed -r -i 's#expect\((.+?)\).toBeCalled\(\)#sinon.assert.called\(\1\)#' "$1"
sed -r -i 's#expect\((.+?)\).not.toBeCalled\(\)#sinon.assert.notCalled\(\1\)#' "$1"
sed -r -i 's#expect\((.+?)\).toBeCalledTimes\((.+?)\)#t.is\(\1.callCount, \2\)#' "$1"

sed -r -i 's#expect\((.+?)\).toHaveLength\((.+?)\)#t.is\(\1.length, \2\)#' "$1"

sed -r -i 's#expect\((.+?)\).toBeInstanceOf\((.+?)\)#t.true\(\1 instanceof \2\)#' "$1"

sed -r -i 's#expect\((.+?)\).toMatchObject\(#t.like\(\1, #' "$1"

sed -r -i 's#expect\((.+?)\).toResolve\(\)#t.notThrowsAsync\(\(\) => \1\)#' "$1"
