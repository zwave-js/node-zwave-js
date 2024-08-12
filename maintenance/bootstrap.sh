#!/bin/sh
set -e

# Setup main repo
echo "🏗️  Preparing repository..."
echo ""
yarn
ts-patch install
yarn node maintenance/patch-typescript.js
yarn turbo run bootstrap
echo "✅ Repository ready"

# Do not install VSCode extension on CI
if [ -z "$CI" ]; then
	# Install/Update VSCode extension
	echo ""
	echo "🏗️  Preparing VSCode extension..."
	echo ""
	git submodule update --init -- .vscode/extensions/zwave-js-config-editor
	cd .vscode/extensions/zwave-js-config-editor
	git checkout main
	npm i
	# TODO check if this can be made better. We want to build in any case.
	if [ -d out ]; then
		npm run build
		echo ""
		echo "✅ VSCode extension ready"
		echo ""
	else
		npm run build
		echo ""
		echo "✅ VSCode extension ready. Install the recommended workspace extension to use it!"
		echo ""
	fi
fi
