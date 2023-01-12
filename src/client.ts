import {Client, Guild, IntentsBitField, Partials, TextChannel} from 'discord.js'
import {Player, QueryType, Queue, Track} from 'discord-player'
import {queueInit, redisOptions} from '../options.json'
import {musicEmbed} from './embed'
import {createClient} from 'redis'
import {RedisKeys} from './redisKeys.enum'

const TOKEN = process.env.DISCORD_TOKEN

type IQueue = {
    channel: TextChannel | null
}

type ICurrentTrack = {
    title: string
    username: string
}

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
            const emb = await musicEmbed(this, 'Now playing', track.title, user)
            await queue.metadata.channel.send({embeds: [emb]})
            await this.setCurrentTrack({title: track.title, username: user.username})
        })
        this.player.on('trackEnd', async (queue: Queue<IQueue>, trackEnd) => {
            const rawData = await this.redisClient.lPop(RedisKeys.QUEUE)
            if (!rawData) {
                return
            }
            const data = JSON.parse(rawData)
            const track = new Track(this.player, data)
            queue.addTrack(track)

            if (!queue.playing) {
                await queue.play()
            }
        })
        this.player.on('queueEnd', async (queue: Queue<IQueue>) => {
            const his = await this.redisClient.sMembers(RedisKeys.HISTORY)
            const hisElem = JSON.parse(his[Math.floor(Math.random() * his.length)])

            const searchResult = await this.player.search(hisElem.title, {
                requestedBy: this.client.user,
                searchEngine: QueryType.AUTO
            })
            searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0])

            if (!queue.playing) {
                await queue.play()
            }
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

    private currentTrack: ICurrentTrack

    public getCurrentTrack(): ICurrentTrack {
        return this.currentTrack
    }

    public setCurrentTrack(currentTrack: ICurrentTrack): void {
        this.currentTrack = currentTrack
    }

    public async getHistory(): Promise<ICurrentTrack[]> {
        const redisHistory = await this.redisClient.sMembers(RedisKeys.HISTORY)
        const historyTracks: ICurrentTrack[] = []
        for (const rawElement of redisHistory) {
            const element = JSON.parse(rawElement)
            historyTracks.push({
                title: element.title,
                username: element.username
            })
        }
        return historyTracks
    }
}