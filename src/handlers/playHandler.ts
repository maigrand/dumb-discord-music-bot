import {ChatInputCommandInteraction, Guild, User} from 'discord.js'
import {search} from '@/modules/youtubeModule'
import {AudioPlayer, AudioPlayerStatus, getVoiceConnection} from '@discordjs/voice'
import {getQueue, trackPush} from '@/redisClient'
import {createVoiceConnection, deleteInteractionReply, musicEmbed, popAndPlay} from '@/util'

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

    for (const track of tracks) {
        await trackPush(guild.id, track)
    }

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
        await createVoiceConnection(voiceChannel, player)

        const track = await popAndPlay(guild.id, player, interaction.channelId)
        if (!track) {
            return
        }

        const emb = await musicEmbed(botUser, 'Play Command', `Playing: ${track.title}`, interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })
        deleteInteractionReply(interaction)

        return
    }

    const trackTitles = await getQueue(guild.id)
    const emb = await musicEmbed(botUser, 'Play Command', `Added: ${tracks[0]?.title}\nIn queue: ${trackTitles.length}`, interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })
    deleteInteractionReply(interaction)

    if (player.state.status === AudioPlayerStatus.Idle) {
        await popAndPlay(guild.id, player, interaction.channelId)
    }
}
