import {ChatInputCommandInteraction, Guild, User} from 'discord.js'
import {createAudioResourceFromPlaydl, search} from '@/modules/youtubeModule'
import {AudioPlayer, AudioPlayerStatus, getVoiceConnection, joinVoiceChannel} from '@discordjs/voice'
import {setCurrentTrack, trackPop, trackPush} from '@/redisClient'
import {networkStateChangeHandler} from '@/handlers/networkStateChangeHandler'
import {deleteInteractionReply, musicEmbed} from '@/util'

export async function playHandler(botUser: User, interaction: ChatInputCommandInteraction, guild: Guild, player: AudioPlayer) {
    await interaction.deferReply({ephemeral: true})
    const query = await interaction.options.getString('query')
    if (!query) {
        return
    }
    const tracks = await search(query, interaction.user.id)
    if (!tracks || tracks.length === 0) {
        const emb = await musicEmbed(botUser, 'Play Command', `Track ${query} not found`, interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })

        deleteInteractionReply(interaction)

        return
    }

    await trackPush(guild.id, tracks[0]!)

    const member = guild.members.cache.get(interaction.user.id) ?? await guild.members.fetch(interaction.user.id)
    const voiceChannel = member.voice.channel
    if (!voiceChannel) {
        const emb = await musicEmbed(botUser, 'Play Command', 'Could not join your voice channel!', interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })

        deleteInteractionReply(interaction)

        return
    }
    let connection = getVoiceConnection(guild.id)
    if (!connection) {
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })

        connection.on('stateChange', (oldState, newState) => {
            const oldNetworking = Reflect.get(oldState, 'networking')
            const newNetworking = Reflect.get(newState, 'networking')

            oldNetworking?.off('stateChange', networkStateChangeHandler)
            newNetworking?.on('stateChange', networkStateChangeHandler)
        })

        connection.subscribe(player)

        const track = await trackPop(guild.id)
        if (!track) {
            return
        }
        const resource = await createAudioResourceFromPlaydl(track.url, guild.id, interaction.channelId)
        await setCurrentTrack(guild.id, track)
        player.play(resource)

        const emb = await musicEmbed(botUser, 'Play Command', `Playing: ${track.title}`, interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })
        deleteInteractionReply(interaction)

        return
    }

    const emb = await musicEmbed(botUser, 'Play Command', `Added: ${tracks[0]?.title}`, interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })
    deleteInteractionReply(interaction)

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
