import {ChatInputCommandInteraction, Guild} from 'discord.js'
import {createAudioResourceFromPlaydl, search} from '@/modules/youtubeModule'
import {AudioPlayer, getVoiceConnection, joinVoiceChannel} from '@discordjs/voice'
import {trackGet, trackPush} from '@/redisClient'
import {networkStateChangeHandler} from '@/handlers/networkStateChangeHandler'

export async function playHandler(interaction: ChatInputCommandInteraction, guild: Guild, player: AudioPlayer) {
    await interaction.deferReply({ephemeral: true})
    const query = await interaction.options.getString('query')
    if (!query) {
        return
    }
    const tracks = await search(query, interaction.user.id)
    if (!tracks || tracks.length === 0) {
        return
    }

    await trackPush(guild.id, tracks[0]!)

    const member = guild.members.cache.get(interaction.user.id) ?? await guild.members.fetch(interaction.user.id)
    const voiceChannel = member.voice.channel
    if (!voiceChannel) {
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

        const track = await trackGet(guild.id)
        if (!track) {
            return
        }
        const resource = await createAudioResourceFromPlaydl(track.url, guild.id)

        player.play(resource)
        await interaction.editReply({
            content: 'Playing!',
        })
        return
    }

    await interaction.editReply({
        content: 'Added!',
    })
}
