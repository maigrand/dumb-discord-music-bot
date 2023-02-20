# Dumb Discord Music Bot
This is a basic Discord music bot project written in TypeScript using the Discord.js library. The bot allows users to play and control music tracks through chat commands. The bot connects to a Redis database to store the music queue and history.

# Installation
1. Clone this repository
2. Run `npm install` in the repository directory
3. Create a Discord bot and invite it to your server (https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
4. Copy env.example to .env and fill in the required fields
5. This bot required Youtube API key (https://developers.google.com/youtube/v3/getting-started)
6. This bot required redis server (https://redis.io/download) (or just run via docker)
7. Run `npm start register-commands` to register commands 
8. Run `npm start dev` to start the bot

### or run via docker (see docker-compose.yml)

# Commands
The bot recognizes the following slash commands:

* `/play` <query>: Searches for a track and adds it to the queue.
* `/skip`: Skips the current track.
* `/nowplaying`: Shows the currently playing track.
* `/history`: Shows the previously played tracks.
* `/stop`: Stops playing music and clears the queue.

# Dependencies
This project relies on the following dependencies:

* `discord.js`: The main library for interacting with the Discord API.
* `@discordjs/voice`: A library for connecting to voice channels and streaming audio.
* `dotenv`: A library for loading environment variables from a .env file.
* `redis`: A library for interacting with a Redis database.
* `libsodium-wrappers`: a library for encryption and decryption
* `ytdl-core`: A library for downloading and parsing YouTube videos.
* `ffmpeg-static`: A library for audio encoding
* `axios`: A library for interact with the YouTube API

# Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.