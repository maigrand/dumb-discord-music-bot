# Dumb Discord Music Bot
The Dumb Discord Music Bot is a simple bot for playing music in your Discord server. It uses the Discord.js library to provide basic music playing functionality.

# Installation
1. Install [Node.js](https://nodejs.org/en/download/)
2. Install [FFmpeg](https://ffmpeg.org/download.html)
3. Clone this repository
4. Run `npm install` in the repository directory
5. Create a Discord bot and invite it to your server
6. Copy env.example to .env and fill in the required fields
7. This bot required Youtube API key (https://developers.google.com/youtube/v3/getting-started)
8. This bot required redis server (https://redis.io/download) (or just run via docker)
9. Run `npm start register-commands` to register commands
10. Run `npm start dev` to start the bot

### or this bot can work with docker (see docker-compose.yml)

# Usage
To use the bot, simply invite it to your Discord server and type commands in any text channel:

* /play
* /stop
* /skip
* /nowplaying
* /history

# Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.