import {Client, Guild, GuildMember, IntentsBitField, Partials, TextChannel} from 'discord.js'
import {Player, Queue} from 'discord-player'
import { queueInit } from '../options.json'
import {musicEmbed} from './embed'

const TOKEN = process.env.DISCORD_TOKEN

type IQueue = {
    channel: TextChannel | null
}

type ICurrentTrack = {
    title: string
    //author: GuildMember
}

export class DiscordClient {
    constructor () {
        this.login(TOKEN)
        this.registerPlayerEvents()
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
            const emb = await musicEmbed(this, 'Now playing', track.title)
            await queue.metadata.channel.send({embeds: [emb]})
            await this.setCurrentTrack({title: track.title})
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
        this.history.push(currentTrack)
        if (this.history.length > 20) {
            this.history.shift()
        }
    }

    public getHistory(): ICurrentTrack[] {
        return this.history
    }
}