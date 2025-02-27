#!/bin/bash
RED='\033[1;31m'
GREEN='\033[0;32m'
BLUE='\033[1;34m'
GRAY='\033[1;30m'
NC='\033[0m'

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}         Welcome to the Z-Wave JS GitPod!         ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo "Just a few more questions to help you get started..."
echo ""

while true; do
	read -p "Have you already forked the repo? (y/n) " fork
	case $fork in
		[Yy]* ) break;;
		[Nn]* )
			echo -e "${BLUE}Please open https://github.com/zwave-js/zwave-js/fork in another browser window and select your account as the destination.${NC}"
			read -p "Press ENTER when the fork was created... "
			break;;
		* ) echo -e "${RED}Please answer yes (y) or no (n)!${NC}";;
	esac
done

while true; do
	read -p "What is your GitHub username? " username
	if [[ -z "$username" ]]; then
		echo -e "${RED}Please enter a username!${NC}"
	else
		break;
	fi
done

echo -e "${BLUE}Setting up git remotes for you...${NC}"
git remote set-url origin "https://github.com/$username/zwave-js"
git fetch origin
echo ""
echo -e "Your fork is now configured as ${BLUE}origin${NC}, the original repo as ${BLUE}upstream${NC}"
echo ""

if [[ "$(git rev-parse --abbrev-ref HEAD)" == "master" ]]; then
	if [[ "$(git rev-list --left-right --count HEAD...origin/master | cut -f2)" != "0" ]]; then
		echo -e "Your fork's master branch seems to be out of sync. To update it, execute these commands:"
		echo -e "${GRAY}  git fetch upstream${NC}"
		echo -e "${GRAY}  git reset --hard upstream/master${NC}"
		echo -e "${GRAY}  git push --force origin master${NC}"
		echo -e ""
		echo -e "${RED}WARNING: This will overwrite changes in your master branch!${NC}"
		echo -e ""
	fi
fi
