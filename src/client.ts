import {Client, Guild, GuildMember, IntentsBitField, Partials, TextChannel} from 'discord.js'
import {Player, Queue} from 'discord-player'

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
            await queue.metadata.channel.send(`🎶 | Now playing **${track.title}**!`)
            await this.setCurrentTrack({title: track.title})
        })
    }

    public getQueue(guild: Guild, channel: TextChannel): Queue<IQueue> {
        return this.player.createQueue(guild, {
            leaveOnEnd: false,
            leaveOnStop: false,
            leaveOnEmpty: false,
            leaveOnEmptyCooldown: 1000,
            leaveOnEndCooldown: 1000,
            autoSelfDeaf: true,
            ytdlOptions: {
                filter: 'audioonly',
                highWaterMark: 1 << 30,
                dlChunkSize: 0,
            },
            initialVolume: 20,
            bufferingTimeout: 3000,
            spotifyBridge: true,
            disableVolume: false,
            volumeSmoothness: 0.5,
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
}