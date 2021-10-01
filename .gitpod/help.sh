#!/bin/bash
RED='\033[1;31m'
GREEN='\033[0;32m'
BLUE='\033[1;34m'
GRAY='\033[1;30m'
NC='\033[0m'

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}         Welcome to the Z-Wave JS GitPod!         ${NC}"
echo -e "${GREEN}==================================================${NC}"

echo -e ""
echo -e "This environment is set up to make contributing easy for you."
echo -e ""
echo -e "🎉 Files are formatted automatically on save."
echo -e ""
echo -e ""
echo -e "🤖 To check configuration files for errors, run this in the terminal:"
echo -e "   ${BLUE}yarn lint:config${NC}"
echo -e ""
echo -e ""
echo -e "🚔 We use Conventional Commits to enforce certain commit messages. See"
echo -e "   https://www.conventionalcommits.org/en/v1.0.0/"
echo -e "   for a detailed explanation."
echo -e ""
echo -e "   For configuration files, something similar to these examples should do:"
echo -e "   * New device configuration:"
echo -e "     ${BLUE}feat(config): add MyManufacturer ABC-123Z${NC}"
echo -e ""
echo -e "   * Add a new device fingerprint to an existing file:"
echo -e "     ${BLUE}feat(config): add fingerprint 0x1234:0x2345 to MyManufacturer ABC-123Z${NC}"
echo -e ""
echo -e "   * Add a new config param to an existing file:"
echo -e "     ${BLUE}feat(config): add param 5 to MyManufacturer ABC-123Z${NC}"
echo -e ""
echo -e "   * Correcting something in a config file"
echo -e "     ${BLUE}fix(config): change param 2 min value to -10 for MyManufacturer ABC-123Z${NC}"

echo ""
echo ""
echo -e "${BLUE}Please wait... setting up workspace${NC}"
echo ""
echo ""
gp sync-await prepare

echo -e ""
echo -e "${RED}♥${NC} All done, Happy coding!"
echo -e ""
