import {Client, Guild, IntentsBitField, Partials, TextChannel} from 'discord.js'
import {Player, Queue, Track} from 'discord-player'
import {queueInit, redisOptions, autoPlaylistCounter} from '../options.json'
import {musicEmbed} from './embed'
import {createClient} from 'redis'
import {IQueue, ITrack} from './types'
import {transformTrack} from './utils'
import {musicHistoryGetRandom, musicQueuePop, musicQueuePurge} from './redisMethods'

const TOKEN = process.env.DISCORD_TOKEN

export class DiscordClient {
    constructor () {
        this.login(TOKEN)
        this.registerPlayerEvents()
        this.redisClient.connect()
    }

    public client = new Client({
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

    public redisClient = createClient({
        ...redisOptions
    })

    private login(token: string) {
        this.client.login(token)
            .catch((e) => console.error(e))
    }

    public player = new Player(this.client)

    public currentTrack: ITrack

    public autoPlaylistCounter: number = 0

    private registerPlayerEvents() {
        this.player.on('error', (queue, error) => {
            console.log(`[${queue.guild.name}] Error emitted from the queue: ${error.message}`)
        })
        this.player.on('connectionError', (queue, error) => {
            console.log(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`)
        })
        this.player.on('trackStart', async (queue: Queue<IQueue>, track) => {
            const guildMember = queue.guild.members.cache.get(track.requestedBy.id) ?? await queue.guild.members.fetch(track.requestedBy.id)
            const user = guildMember.user
            const emb = await musicEmbed(this, 'Now playing', track.title, user, track.thumbnail)
            await queue.metadata.channel.send({embeds: [emb]})
            this.currentTrack = transformTrack(track)
        })
        this.player.on('trackEnd', async (queue: Queue<IQueue>, trackEnd) => {
            const iTrack: ITrack = await musicQueuePop(this.redisClient, queue.guild.id)
            if (!iTrack) {
                return
            }
            const track = new Track(this.player, iTrack)
            queue.addTrack(track)
            if (!queue.playing) {
                await queue.play()
            }
        })
        this.player.on('queueEnd', async (queue: Queue<IQueue>) => {
            const iTrack: ITrack = await musicHistoryGetRandom(this.redisClient, queue.guild.id)
            if (!iTrack) {
                return
            }
            if (this.autoPlaylistCounter >= autoPlaylistCounter) {
                return
            }
            const track = new Track(this.player, iTrack)
            queue.addTrack(track)
            this.autoPlaylistCounter++
            if (!queue.playing) {
                await queue.play()
            }
        })
        this.player.on('botDisconnect', async (queue: Queue<IQueue>) => {
            await musicQueuePurge(this.redisClient, queue.guild.id)
        })
        this.player.on('channelEmpty', async (queue: Queue<IQueue>) => {
            await musicQueuePurge(this.redisClient, queue.guild.id)
        })
        this.redisClient.on('error', (e) => {
            console.error('Redis Client Error:', e)
        })
    }

    public getQueue(guild: Guild, channel: TextChannel): Queue<IQueue> {
        return this.player.createQueue(guild, {
            ...queueInit,
            ytdlOptions: {
                filter: 'audioonly',
                highWaterMark: 1 << 30,
                dlChunkSize: 0,
            },
            metadata: {
                channel: channel
            }
        })
    }
}