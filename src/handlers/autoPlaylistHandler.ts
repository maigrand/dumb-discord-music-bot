import {ChatInputCommandInteraction, Guild, User} from 'discord.js'
import {getHistory, setCurrentTrack, trackGet, trackPop, trackPush} from '@/redisClient'
import {deleteInteractionReply, musicEmbed} from '@/util'
import {AudioPlayer, AudioPlayerStatus, getVoiceConnection, joinVoiceChannel} from '@discordjs/voice'
import {networkStateChangeHandler} from '@/handlers/networkStateChangeHandler'
import {createAudioResourceFromPlaydl} from '@/modules/youtubeModule'

export async function autoPlaylistHandler(botUser: User, interaction: ChatInputCommandInteraction, guild: Guild, player: AudioPlayer) {
    await interaction.deferReply({ephemeral: true})

    const count = interaction.options.getInteger('count')!

    const member = guild.members.cache.get(interaction.user.id) ?? await guild.members.fetch(interaction.user.id)
    const voiceChannel = member.voice.channel
    if (!voiceChannel) {
        const emb = await musicEmbed(botUser, 'AutoPlaylist Command', 'Could not join your voice channel!', interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })

        deleteInteractionReply(interaction)

        return
    }

    const trackTitles = await getHistory(guild.id)
    if (!trackTitles || trackTitles.length === 0) {
        const emb = await musicEmbed(botUser, 'AutoPlaylist command', 'History is empty', interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })

        deleteInteractionReply(interaction)

        return
    }

    let out = ''
    let addedIndex: number[] = []
    while (addedIndex.length !== count) {
        const randomIndex = Math.floor(Math.random() * trackTitles.length)
        if (addedIndex.includes(randomIndex)) {
            if (count <= trackTitles.length) {
                continue
            }
        }
        const randomTrack = await trackGet(trackTitles[randomIndex]!)
        if (!randomTrack) {
            continue
        }
        await trackPush(guild.id, randomTrack)
        out += randomTrack.title + '\n'
        addedIndex.push(randomIndex)
    }

    if (out.length >= 4096) {
        out = out.substring(0, 4093) + '...'
    }
    const emb = await musicEmbed(botUser, 'AutoPlaylist command', out, interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })
    deleteInteractionReply(interaction)

    let connection = getVoiceConnection(guild.id)
    if (!connection) {
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })

        connection.subscribe(player)

        connection.on('stateChange', (oldState, newState) => {
            const oldNetworking = Reflect.get(oldState, 'networking')
            const newNetworking = Reflect.get(newState, 'networking')

            oldNetworking?.off('stateChange', networkStateChangeHandler)
            newNetworking?.on('stateChange', networkStateChangeHandler)
        })

        const track = await trackPop(guild.id)
        if (!track) {
            return
        }
        const resource = await createAudioResourceFromPlaydl(track.url, guild.id, interaction.channelId)
        await setCurrentTrack(guild.id, track)
        player.play(resource)
    }

    if (player.state.status === AudioPlayerStatus.Idle) {
        const track = await trackPop(guild.id)
        if (!track) {
            return
        }
        const resource = await createAudioResourceFromPlaydl(track.url, guild.id, interaction.channelId)
        await setCurrentTrack(guild.id, track)
        player.play(resource)
    }
}