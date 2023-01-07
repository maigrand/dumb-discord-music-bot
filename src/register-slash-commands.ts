import 'dotenv/config'
import {REST, Routes, ApplicationCommandOptionType, SlashCommandBuilder, PermissionsBitField} from 'discord.js'

const TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID

const commands = [
    {
        name: 'play',
        description: 'Play a song!',
        options: [
            {
                name: 'query',
                type: ApplicationCommandOptionType.String,
                description: 'The song you want to play',
                required: false
            }
        ]
    },
    {
        name: 'stop',
        description: 'Stop a song!',
    },
    {
        name: 'skip',
        description: 'Skip a song!',
    },
    {
        name: 'nowplaying',
        description: 'Now playing song'
    },
    {
        name: 'register',
        description: 'admin only'
    },
    {
        name: 'history'
    }
]

export const commandsNames = commands.map((command) => command.name)

const commands2 = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song!')
        .addStringOption(option => {
            option.setName('query')
            option.setDescription('WIP')
            option.setRequired(true)
            return option
        }),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop a song!'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip a song!'),
    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Now playing song'),
    new SlashCommandBuilder()
        .setName('history')
        .setDescription('Show 20 last tracks'),
    new SlashCommandBuilder()
        .setName('register')
        .setDescription('admin only')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
]

const rest = new REST({version: '10'}).setToken(TOKEN)

async function registerSlashCommands() {
    if (!process.argv.includes('--register')) {
        return
    }
    try {
        console.log('Started refreshing application [/] commands.')

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands2 })

        console.log('Successfully reloaded application [/] commands.')
    } catch (error) {
        console.error(error)
    }
}

registerSlashCommands()
    .catch((e) => console.error(e))
