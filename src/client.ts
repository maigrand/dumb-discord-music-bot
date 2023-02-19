import {Client, IntentsBitField, Partials, TextChannel} from 'discord.js'
import {redisOptions} from '../options.json'
import {musicEmbed} from './embed'
import {createClient} from 'redis'
import {AudioPlayerStatus, createAudioPlayer, NoSubscriberBehavior} from '@discordjs/voice'
import {IAudioResource} from './types'
import {trackHandler} from './player'

const TOKEN = process.env.DISCORD_TOKEN

export class DiscordClient {
    constructor () {
        this.login(TOKEN)
        this.registerEvents()
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

    public player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        }
    })

    private currentIAudioResources: IAudioResource[] = []

    public getCurrentTrack(guildId: string) {
        return this.currentIAudioResources.find((iAudioResource) => iAudioResource.requesterGuildId === guildId)
    }

    public setCurrentTrack(iAudioResource: IAudioResource) {
        this.currentIAudioResources.push(iAudioResource)
    }

    //@TODO: поддержать мульти-серверность
    public autoPlaylistCounter: number = 0

    private registerEvents() {
        this.redisClient.on('error', (e) => {
            console.error('Redis Client Error:', e)
        })
        this.player.on('error', (e) => {
            console.error('Player Error:', e)
            throw e
        })
        this.player.on(AudioPlayerStatus.Playing, async (oldState, newState) => {
            const iCurrentTrack = newState.resource.metadata as IAudioResource
            await this.nowPlayingHandler(iCurrentTrack)
        })
        this.player.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
            if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
                const iAudioResource = oldState.resource.metadata as IAudioResource
                await trackHandler(this, iAudioResource.requesterGuildId)
            }
        })
    }

    private async nowPlayingHandler(iAudioResource: IAudioResource) {
        const guild = this.client.guilds.cache.get(iAudioResource.requesterGuildId)
        const member = guild.members.cache.get(iAudioResource.requesterUserId) ?? await guild.members.fetch(iAudioResource.requesterUserId)
        const textChannel = this.client.channels.cache.get(iAudioResource.requesterTextChannelId) as TextChannel
        const emb = await musicEmbed(this, 'Now playing', iAudioResource.title, member.user)
        await textChannel.send({embeds: [emb]})
    }
}