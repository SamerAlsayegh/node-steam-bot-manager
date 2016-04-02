# NodeJS Bot Management Tool
A bot management tool for [Steam Community](http://www.steamcommunity.com) built using NodeJS backend.



## Scope of the project
The scope of this project is to be a SteamBot alternative for NodeJS.

# CAUTION:
#### It is not recommended to run this tool in production mode.

## Demo:
TODO: None available yet.

## Examples:
You can check examples of bots you can build by navigating to the 'examples' folder in the root of the project.

## Features:
- GUI-based
- Talk to people on the Bot's friends list
- Trade with people on the Bot's friends list.
- Set-up 2-factor-authentication (including the phone-number if not yet on account)
- Handle API sign-up process*
- Manage multiple bots at once
- API system
- Plugin-capable (Customize the actions of the bot)

## TODO:
- Add registration account checking

## Set-up
### Prerequisites:
 - NodeJS
 - npm

### Install and run:
~~~
git clone https://github.com/Undeadkillz/node-steam-bot-manager # Clone the repo
cd node-steam-bot-manager # Change directory to the cloned repo
npm install # Installs all libraries required
chmod -R 777 examples/config # Make the config folder accessible for edits
cd examples # Change directory to examples folder
node InventoryBot.js # Run the example bot
~~~

### How to run 24/7 (Linux)

- 'yum install screen' or 'apt-get install screen' (Use based on your distro)
- Create a 'server.sh' file wherever the bot you would like to run is (ex. InventoryBot.js) and paste the following:
~~~
#!/bin/bash
screen -dmLS BotManager node InventoryBot.js
~~~
- Finally, just run the script with 'node server.sh'
- You may then access it, by typing 'screen -x BotManager'

## Configuration:
On first run, a config file will be be generated using the template file. Simply close the bot and edit the config.json

Once completed, you may run the bot again with the changes taking effect.

---
### Registering a Bot:
- Choose 'register' option from main menu (use arrow keys to navigate the menu)
- Enter the username of the bot [The credentials are not yet checked, so be sure of the credentials.]
- Enter the password of the bot [The credentials are not yet checked, so be sure of the credentials.]
- Main menu will appear with new bot.
- Use arrow keys to choose the bot you want to manage.





## Libraries used:
- [colors.js](https://github.com/marak/colors.js/)
- [node-steamstore](https://github.com/DoctorMcKay/node-steamstore)
- [node-steam-totp](https://github.com/DoctorMcKay/node-steam-totp)
- [node-steam-tradeoffer-manager](https://github.com/DoctorMcKay/node-steam-tradeoffer-manager)
- [node-steamcommunity](https://github.com/DoctorMcKay/node-steamcommunity)

## How to contribute:
~~~
git clone https://github.com/Undeadkillz/node-steam-bot-manager # Clone project files locally
node install # To install the tool and dependancies
~~~
The project is still in early stages, and any feedback or contribution is appreciated.

#### To contribute:
Simply make your desired changes and submit your pull request. At this point, there is no specific format you have to follow, just make sure the code is easily readable, and if possible comment where possible so that the pull request could be approved faster.

#### To help:
Install the tool, and try out the different examples or even build your own, and try to break the tool. Once you break it, just make sure to inform us via the ISSUES pages, about the issue.

Make sure to atleast include a log of the error message and if possible inform us about the steps to reproduce the issue.

---


## Credits:
- [Undeadkillz](https://github.com/Undeadkillz) | Add me on: **[Steam](http://steamcommunity.com/profiles/76561198042954517/)** - **[Skype](skype:undeadkillz?chat)**
- All authors and helpers of the libraries listed above (with their respective library urls)



\* Using this feature means you agree to Steam's API terms found at: [Steam API Terms](http://steamcommunity.com/dev/apiterms)