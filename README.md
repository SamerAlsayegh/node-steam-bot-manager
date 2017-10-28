# About
A bot management wrapper tool for [Steam Community](http://www.steamcommunity.com) built with NodeJS. Allows users to customize bot actions to the needs of their websites. Whether you are looking for bots to message users when an in-game report occurs, or invite users to your group when they join your server, this tool offers a powerful & easy API.



[![npm version](https://badge.fury.io/js/node-steam-bot-manager.svg)](https://badge.fury.io/js/node-steam-bot-manager)



[![forthebadge](http://forthebadge.com/images/badges/uses-js.svg)](http://forthebadge.com)
[![forthebadge](http://forthebadge.com/images/badges/built-with-love.svg)](http://forthebadge.com)

## Features:
- GUI-Based Bot Control
- GUI-Based Messaging
- GUI-Based Trading
- 2-Factor Authentication Support + Setup
- Enable API-Key*
- Generate authentication codes on demand (for manual login)
- Manage multiple bots simultaneously
- Login using email/2-factor authentication
- API Support for third-party systems (Betting, Trading, and so on..)
- Event based interactions of a single bot or multiple
- Ability to upvote/downvote attachments on Steam Community
- Ability to import accounts into tool 
- Create new Steam accounts easily


## Requirements
- NodeJS (V6 is minimum)

## WIKI
#### Visit the [wiki](https://github.com/Undeadkillz/node-steam-bot-manager/wiki) for set-up, registration.

#### For Docs, please visit [our docs](http://undeadkillz.github.io/node-steam-bot-manager/docs)
 If you need further help with setting up the tool, please contact me on Steam, and I will try my best to help you.

## Examples:
You can check examples of bots you can build by navigating to the 'examples' folder in the root of the project.


## TODO:
- Expand API access

## Updates:
The update policy of this tool is that I will try to post an update every week to few weeks. In the event of large changes, there will be an announcement on ETA. Furthermore, if you happen to use the tool with a certain version of the API, and newer releases do not have the functionality you need, simply rollback using npm package manager. 
Versions are organized in such manner as of 1.0.50:
- X.0.0 (Complete release)
- 1.X.0 (Major release)
- 1.0.X (Bug fixes)


## Libraries used:
- [node-steamstore](https://github.com/DoctorMcKay/node-steamstore)
- [node-steam-totp](https://github.com/DoctorMcKay/node-steam-totp)
- [node-steam-tradeoffer-manager](https://github.com/DoctorMcKay/node-steam-tradeoffer-manager)
- [node-steamcommunity](https://github.com/DoctorMcKay/node-steamcommunity)
- Glob
- Jasmine
- jsdocs
- Winston
- Request
- Express
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
Stable versions via npm (incase your version contains certain bugs, try these builds):
- 1.0.46
- 1.0.56

#### Git Version
Frequently the Github source will not be the same version as the latest npm version. This is because the npm versions are often the stable ones. Github will contain the developmental and possibly even broken versions at times (official versions will be stated in the commit)

## Credits:
- [Undeadkillz](https://github.com/Undeadkillz) | Add me on: **[Steam](http://steamcommunity.com/profiles/76561198042954517/)**
- All authors and helpers of the libraries listed above (with their respective library urls)

[![forthebadge](http://forthebadge.com/images/badges/powered-by-water.svg)](http://forthebadge.com)
[![forthebadge](http://forthebadge.com/images/badges/gluten-free.svg)](http://forthebadge.com)


### Tracking
This tool has statistics built-in to allow only the main developer to track usage of the tool. This tracking is anonmous and if need be, can be disabled at will using the configuration. I may use the tracking to ensure certain functionality is working as intended, and also to ensure this tool is used (low usage, may mean that I do not need to keep updating).


## Sponsors
The following sponsors help promote further development of this tool.

### [Techie.Guru - Your personal tech curator](https://techie.guru)
[![Techie.Guru](https://i1.wp.com/techie.guru/wp-content/uploads/2017/06/cropped-1-e1497505364696.png)](https://techie.guru)

\* Using this feature means you agree to Steam's API terms found at: [Steam API Terms](http://steamcommunity.com/dev/apiterms)
