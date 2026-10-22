#!/bin/sh
set -e

# Setup main repo
echo "🏗️  Preparing repository..."
echo ""
yarn
# Run bootstrap tasks serially because they depend on building shared references,
# which would unnecessarily be rebuilt in parallel.
yarn turbo run bootstrap --concurrency=1
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
