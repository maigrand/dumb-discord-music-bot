import {Client, Guild, IntentsBitField, Partials, TextChannel} from 'discord.js'
import {Player, QueryType, Queue, Track} from 'discord-player'
import {queueInit, redisOptions} from '../options.json'
import {musicEmbed} from './embed'
import {createClient} from 'redis'

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
            const emb = await musicEmbed(this, 'Now playing', track.title, track.requestedBy)
            await queue.metadata.channel.send({embeds: [emb]})
            await this.setCurrentTrack({title: track.title, username: track.requestedBy.username})
        })
        this.player.on('trackEnd', async (queue: Queue<IQueue>, track) => {
            //
        })
        this.player.on('queueEnd', async (queue: Queue<IQueue>) => {
            const his = await this.redisClient.sMembers('history')
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

    private history: ICurrentTrack[] = []

    public getCurrentTrack(): ICurrentTrack {
        return this.currentTrack
    }

    public setCurrentTrack(currentTrack: ICurrentTrack): void {
        this.currentTrack = currentTrack
        //this.history.push(currentTrack)
        // if (this.history.length > 20) {
        //     this.history.shift()
        // }
    }

    public async getHistory(): Promise<ICurrentTrack[]> {
        const hisFromRedis = await this.redisClient.sMembers('history')
        const his: ICurrentTrack[] = []
        for (const el of hisFromRedis) {
            const element = JSON.parse(el)
            his.push({
                title: element.title,
                username: element.username
            })
        }
        return his
        //return this.history
    }
}