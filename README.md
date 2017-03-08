# About
A bot management tool for [Steam Community](http://www.steamcommunity.com) built using NodeJS backend.



Version 1.0.43

[![forthebadge](http://forthebadge.com/images/badges/uses-js.svg)](http://forthebadge.com)
[![forthebadge](http://forthebadge.com/images/badges/built-with-love.svg)](http://forthebadge.com)

## Demo:
##### No demo's currently exist. If you would like a quick demo, please contact Undeadkillz on Steam.

To showcase a demo of your use, pm Undeadkillz on Steam or Github with your website using this bot.



## Examples:
You can check examples of bots you can build by navigating to the 'examples' folder in the root of the project.

## Features:
- GUI-based control
- GUI-Messaging
- GUI-Trading
- 2-Factor Authentication Support + Enabling
- Enable API-Access
- Manage multiple bots simultaneously
- API Support for third-party systems (Betting, Trading, and so on..)
- Even based interactions of a single bot or multiple
- Ability to upvote/downvote attachments on SteamCommunity (Please don't abuse)


## TODO:
- Add registration account checking
- Add further error checking

## Set-up
### Prerequisites:
 - NodeJS
 - npm

[![NPM](https://nodei.co/npm/node-steam-bot-manager.png)](https://www.npmjs.com/package/node-steam-bot-manager)

### Install and run (using Example bot):
Using npm:
~~~
npm i node-steam-bot-manager --save
~~~
Copy 'InventoryBot.js' found in 'examples' folder.
[Link to raw-file](https://raw.githubusercontent.com/Undeadkillz/node-steam-bot-manager/master/examples/InventoryBot.js)
~~~
node InventoryBot.js # Run the example bot
~~~
That's it! If you encounter issues, just post in 'Issues' or contact me on Steam (link below)

### How to run 24/7 (Linux - using Example bot)

- 'yum install screen' or 'apt-get install screen' (Use based on your distro)
- Create a 'server.sh' file wherever the bot you would like to run is (ex. InventoryBot.js) and paste the following:
~~~
#!/bin/bash
screen -dmLS BotManager node InventoryBot.js
~~~
- Make sure permissions are set appropriately
~~~
chmod 755 server.sh
~~~
- Finally, just run the script with
~~~
./server.sh
~~~
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

## Testing Policy
[![forthebadge](http://forthebadge.com/images/badges/fuck-it-ship-it.svg)](http://forthebadge.com)

I will ensure everything works, however I won't be building any unit-tests at this time.

---


## Credits:
- [Undeadkillz](https://github.com/Undeadkillz) | Add me on: **[Steam](http://steamcommunity.com/profiles/76561198042954517/)**
- All authors and helpers of the libraries listed above (with their respective library urls)

[![forthebadge](http://forthebadge.com/images/badges/powered-by-water.svg)](http://forthebadge.com)
[![forthebadge](http://forthebadge.com/images/badges/gluten-free.svg)](http://forthebadge.com)

\* Using this feature means you agree to Steam's API terms found at: [Steam API Terms](http://steamcommunity.com/dev/apiterms)