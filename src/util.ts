import {ChatInputCommandInteraction, EmbedBuilder, User, VoiceBasedChannel} from 'discord.js'
import {AudioPlayer, joinVoiceChannel} from '@discordjs/voice'
import {networkStateChangeHandler} from '@/handlers/networkStateChangeHandler'
import {Track} from '@/types'
import {setCurrentTrack, trackPop} from '@/redisClient'
import {createAudioResourceFromPlaydl} from '@/modules/youtubeModule'

export async function musicEmbed(botUser: User, title: string, description: string, user: User, thumbnail?: string): Promise<EmbedBuilder> {
    const embBuilder = new EmbedBuilder()
    embBuilder.setColor([255, 140, 0])
    embBuilder.setTitle(title)
    embBuilder.setAuthor({
        name: botUser.client.user.username,
        iconURL: botUser.client.user.avatarURL() ?? undefined,
    })
    embBuilder.setDescription(description)
    embBuilder.setTimestamp()
    embBuilder.setFooter({
        text: user.username,
        iconURL: user.displayAvatarURL() ?? undefined
    })
    if (thumbnail) {
        embBuilder.setThumbnail(thumbnail)
    }

    return embBuilder
}

export function deleteInteractionReply(interaction: ChatInputCommandInteraction, timeOut: number = 10000) {
    try {
        setTimeout(() => {
            interaction.deleteReply()
        }, timeOut)
    } catch (e) {
    }
}

export async function createVoiceConnection(voiceChannel: VoiceBasedChannel, player: AudioPlayer) {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    })

    connection.subscribe(player)

    connection.on('stateChange', (oldState, newState) => {
        const oldNetworking = Reflect.get(oldState, 'networking')
        const newNetworking = Reflect.get(newState, 'networking')

        oldNetworking?.off('stateChange', networkStateChangeHandler)
        newNetworking?.on('stateChange', networkStateChangeHandler)
    })
    return connection
}

export async function popAndPlay(guildId: string, player: AudioPlayer, interactionChannelId: string): Promise<Track | null> {
    const track = await trackPop(guildId)
    if (!track) {
        return null
    }
    const resource = await createAudioResourceFromPlaydl(track.url, guildId, interactionChannelId)
    await setCurrentTrack(guildId, track)
    player.play(resource)
    return track
}
