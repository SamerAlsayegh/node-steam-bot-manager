# NodeJS Bot Management Tool
A bot management tool for [Steam Community](http://www.steamcommunity.com) which uses NodeJS.




# CAUTION:
#### I do not recommend running any bots in production mode, as there are possibly many caveats I have not yet discovered. Until further notice, I recommend only trying out the functionality and reporting any problems you encounter.

## Demo:
TODO: None available yet.

## Features:
- Talk to people on the Bot's friends list
- Trade with people on the Bot's friends list.
- Set-up 2-factor-authentication (including the phone-number if not yet on account)
- Handle API sign-up process*
- Manage multiple bots at once
- Calculate the inventory worth (relative to Steam Market prices) using another system I am currently working on.

## TODO:
- Add 1-to-1 trades
- Add auto-confirming trades (Checks will be made in place to avoid getting ripped off.)
- Add registration account checking
-
## Set-up:
~~~
git clone https://github.com/Undeadkillz/node-steam-bot-manager
node install
node index.js
~~~
---
### Registering a Bot:
- Choose 'register' option from main menu (use arrow keys to navigate the menu)
- Enter the username of the bot [The credentials are not yet checked, so be sure of the credentials.]
- Enter the password of the bot [The credentials are not yet checked, so be sure of the credentials.]
- You will then be shown the main menu but the bot is now added.
- Use arrow keys to choose the bot you want to manage.

### Management tools:
 - Chat (1-to-1 chats | or you may program your own handlers)
 - Send trade (1-to-1 trades | or you may program your own handlers)
 - Calculate Inventory (quick run-through of inventory worth - not yet completed)
 - Logout (logout of chat - Working on fixing some functionality)
 - Manage
    - Enable/Disable 2-factor-authentication
    - Generate the auth-code (for 2-factor-authentication)
    - Retrieve API key
 - Delete (delete account - but does not unregister the 2-factor-authentication if enabled.)


## Scope of the project
The scope of this project is to be like a SteamBot alternative for NodeJS.



## Libraries used:
- [colors.js](https://github.com/marak/colors.js/)
- [node-steamstore](https://github.com/DoctorMcKay/node-steamstore)
- [node-steam-totp](https://github.com/DoctorMcKay/node-steam-totp)
- [node-steam-tradeoffer-manager](https://github.com/DoctorMcKay/node-steam-tradeoffer-manager)
- [node-steamcommunity](https://github.com/DoctorMcKay/node-steamcommunity)
- [jsdoc](https://github.com/jsdoc3/jsdoc)

## How to contribute:
~~~
git clone https://github.com/Undeadkillz/node-steam-bot-manager # Clone project files locally
node install # To install the tool and dependancies
~~~
Submit a pull-request with the desired changes and I (Samer A.) will check your changes before accepting/declining them. Sometime, I will write up more informative 'How to contribute' section.

---


## Credits:
- [Undeadkillz](https://github.com/Undeadkillz)
- All authors and helpers of the libraries listed above (with their respective library urls)



\* Using this feature means you agree to Steam's API terms found at: [Steam API Terms](http://steamcommunity.com/dev/apiterms)