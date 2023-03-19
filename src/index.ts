import {ActivityType, Client, Events, IntentsBitField, Partials} from 'discord.js'
import assert from 'node:assert/strict'
import {playHandler} from '@/handlers/playHandler'
import {AudioPlayer, AudioPlayerStatus, getVoiceConnection, NoSubscriberBehavior} from '@discordjs/voice'
import {Track, TrackMetadata} from '@/types'
import {trackGet} from '@/redisClient'
import { createAudioResourceFromPlaydl } from '@/modules/youtubeModule'
import {stopHandler} from '@/handlers/stopHandler'
import {emptyChannelHandler} from '@/handlers/emptyChannelHandler'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
assert(DISCORD_TOKEN, 'DISCORD_TOKEN is not defined')

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
                    const track: Track | null = await trackGet(trackMetadata.guildId)
                    if (!track) {
                        return
                    }
                    const resource = await createAudioResourceFromPlaydl(track.url, trackMetadata.guildId)
                    if (!resource) {
                        return
                    }
                    player.play(resource)
                }
            })

            players.set(guild.id, player)
        }

        client.on('ready',  () => {
            const clientUser = client.user
            const d = new Date()
            console.log(`${d.toUTCString()} ready ${clientUser?.tag}`)
            clientUser?.setPresence({
                activities: [{name: 'music', type: ActivityType.Listening}]
            })
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

            if (interaction.commandName === 'play') {
                await playHandler(interaction, guild, player!)
            } else if (interaction.commandName === 'stop') {
                await stopHandler(interaction, guild, player!)
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

process.on('unhandledRejection', (e) => {
    console.error(e)
    process.exit(1)
})

start()
    .catch((e) => console.error(e))
