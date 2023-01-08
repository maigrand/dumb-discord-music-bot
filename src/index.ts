import 'dotenv/config'
import {DiscordClient} from './client'
import {Events} from 'discord.js'
import {commandsNames} from './register-slash-commands'
import {history, nowPlaying, play, skip} from './player'

const start = async () => {
    try {
        const discordClient = new DiscordClient()
        const client = discordClient.client

        client.on(Events.ClientReady, async (e) => {
            const d = new Date()
            console.log(`${d.toUTCString()} ready ${client.user.tag}`)
        })

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) {
                return
            }

            if (!commandsNames.includes(interaction.commandName)) {
                return
            }

            if (interaction.commandName === 'play') {
                await play(discordClient, interaction)
            } else if (interaction.commandName === 'skip') {
                await skip(discordClient, interaction)
            } else if (interaction.commandName === 'nowplaying') {
                await nowPlaying(discordClient, interaction)
            } else if (interaction.commandName === 'history') {
                await history(discordClient, interaction)
            }
        })

    } catch (e) {
        console.error(e)
    }
}

process.on('unhandledRejection', (e) => {
    console.error(e)
    process.exit(1)
})

start()
