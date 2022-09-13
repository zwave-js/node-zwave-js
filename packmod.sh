for file in packages/*/package.json ; do
  jq '
	if (.publishConfig.types != null) then (
		.publishConfig["$types"] = .publishConfig.types | del(.publishConfig.types)
	) else . end
	| if (.publishConfig.typesVersions != null) then (
		.publishConfig["$typesVersions"] = .publishConfig.typesVersions | del(.publishConfig.typesVersions)
	) else . end
	' $file | sponge $file
done
