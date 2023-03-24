import {
    ActivityType,
    Client,
    Events,
    IntentsBitField,
    Partials,
    REST,
    SlashCommandBuilder,
    TextChannel,
    Routes
} from 'discord.js'
import assert from 'node:assert/strict'
import {playHandler} from '@/handlers/playHandler'
import {AudioPlayer, AudioPlayerStatus, getVoiceConnection, NoSubscriberBehavior} from '@discordjs/voice'
import {Track, TrackMetadata} from '@/types'
import {getCurrentTrack, setCurrentTrack, trackPop} from '@/redisClient'
import {createAudioResourceFromPlaydl} from '@/modules/youtubeModule'
import {stopHandler} from '@/handlers/stopHandler'
import {emptyChannelHandler} from '@/handlers/emptyChannelHandler'
import {skipHandler} from '@/handlers/skipHandler'
import {musicEmbed} from '@/util'
import {queueHandler} from '@/handlers/queueHandler'
import {historyHandler} from '@/handlers/historyHandler'
import {autoPlaylistHandler} from '@/handlers/autoPlaylistHandler'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!

assert(DISCORD_TOKEN, 'DISCORD_TOKEN is not defined')
assert(DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID is not defined')

const start = async() => {
    try {
        const client = new Client({
            partials: [Partials.Message, Partials.Channel, Partials.Reaction],
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMessages,
                // IntentsBitField.Flags.GuildMessageReactions,
                // IntentsBitField.Flags.GuildMembers,
                // IntentsBitField.Flags.GuildPresences,
                IntentsBitField.Flags.GuildVoiceStates,
                IntentsBitField.Flags.MessageContent,
            ],
        })

        await client.login(DISCORD_TOKEN)

        let players: Map<string, AudioPlayer> = new Map()

        client.once(Events.ClientReady,  (client) => {
            const d = new Date()
            console.log(`${d.toUTCString()} ready ${client.user.tag}`)
            client.user.setPresence({
                activities: [{name: 'music', type: ActivityType.Listening}]
            })
            players = createPlayers(client)
            registerCommands(client)
                .catch((e) => console.error(e))
        })

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) {
                return
            }
            if (!interaction.guildId) {
                return
            }
            const guild = client.guilds.cache.get(interaction.guildId)
            if (!guild) {
                return
            }
            const player = players.get(guild.id)

            const clientUser = client.user

            if (interaction.commandName === 'play') {
                await playHandler(clientUser!, interaction, guild, player!)
            } else if (interaction.commandName === 'stop') {
                await stopHandler(clientUser!, interaction, guild, player!)
            } else if (interaction.commandName === 'skip') {
                await skipHandler(clientUser!, interaction, player!)
            } else if (interaction.commandName === 'queue') {
                await queueHandler(clientUser!, interaction, guild)
            } else if (interaction.commandName === 'history') {
                await historyHandler(clientUser!, interaction, guild)
            } else if (interaction.commandName === 'autoplaylist') {
                await autoPlaylistHandler(clientUser!, interaction, guild, player!)
            }
        })

        client.on(Events.VoiceStateUpdate, async (oldState) => {
            const guild = client.guilds.cache.get(oldState.guild.id)
            if (!guild) {
                return
            }
            const player = players.get(guild.id)
            if (!player) {
                return
            }
            await emptyChannelHandler(guild, player)
        })
    } catch (e) {
        throw e
    }
}

function createPlayers(client: Client): Map<string, AudioPlayer> {
    const players = new Map<string, AudioPlayer>()
    for (const guild of client.guilds.cache.values()) {
        const player = new AudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            }
        })

        player.on('error', (e) => {
            throw e
        })

        player.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
            if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
                const trackMetadata = oldState.resource.metadata as TrackMetadata
                const connection = getVoiceConnection(trackMetadata.guildId)
                if (!connection) {
                    return
                }
                const track: Track | null = await trackPop(trackMetadata.guildId)
                if (!track) {
                    return
                }
                await setCurrentTrack(trackMetadata.guildId, track)
                const resource = await createAudioResourceFromPlaydl(track.url, trackMetadata.guildId, trackMetadata.textChannelId)
                if (!resource) {
                    return
                }
                player.play(resource)
            }
        })

        player.on(AudioPlayerStatus.Playing, async (_, newState) => {
            const botUser = client.user
            if (!botUser) {
                return
            }
            const trackMetadata = newState.resource.metadata as TrackMetadata
            const currentTrack = await getCurrentTrack(trackMetadata.guildId)
            if (!currentTrack) {
                return
            }
            const guild = client.guilds.cache.get(trackMetadata.guildId)
            if (!guild) {
                return
            }
            const requesterMember = guild.members.cache.get(currentTrack.requesterUserId) ?? await guild.members.fetch(currentTrack.requesterUserId)
            if (!requesterMember) {
                return
            }

            const emb = await musicEmbed(botUser, 'Now Playing', currentTrack.title, requesterMember.user)
            const textChannel = guild.channels.cache.get(trackMetadata.textChannelId) as TextChannel
            await textChannel.send({embeds: [emb]})
        })

        players.set(guild.id, player)
    }

    return players
}

async function registerCommands(client: Client) {
    const rest = new REST({version: '10'}).setToken(DISCORD_TOKEN)

    const commands = [
        new SlashCommandBuilder()
            .setName('play')
            .setDescription('Play a song!')
            .addStringOption(option => {
                option.setName('query')
                option.setDescription('query')
                option.setRequired(true)
                return option
            }),
        new SlashCommandBuilder()
            .setName('stop')
            .setDescription('Stop a queue!'),
        new SlashCommandBuilder()
            .setName('skip')
            .setDescription('Skip a song!'),
        new SlashCommandBuilder()
            .setName('nowplaying')
            .setDescription('Now playing song'),
        new SlashCommandBuilder()
            .setName('history')
            .setDescription('Show history'),
        new SlashCommandBuilder()
            .setName('queue')
            .setDescription('Show queue'),
        new SlashCommandBuilder()
            .setName('autoplaylist')
            .setDescription('autoplaylist')
            .addIntegerOption(option => {
                option.setName('count')
                option.setDescription('count')
                option.setRequired(true)
                return option
            })
    ]

    console.log('Started refreshing application [/] commands.')

    rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [] })
        .then(() => console.log('Successfully deleted all global application commands.'))
        .catch(console.error)

    for (const guild of client.guilds.cache.values()) {
        rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guild.id), { body: commands })
            .then(() => console.log('Successfully reloaded application [/] commands.'))
    }
}

process.on('unhandledRejection', (e) => {
    console.error(e)
    process.exit(1)
})

start()
    .catch((e) => console.error(e))
