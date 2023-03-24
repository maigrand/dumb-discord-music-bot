import {ChatInputCommandInteraction, Guild, User} from 'discord.js'
import {AudioPlayer, getVoiceConnection} from '@discordjs/voice'
import {deleteInteractionReply, musicEmbed} from '@/util'
import {musicQueuePurge} from '@/redisClient'

export async function stopHandler(botUser: User, interaction: ChatInputCommandInteraction, guild: Guild, player: AudioPlayer) {
    await interaction.deferReply({ ephemeral: true })
    const connection = getVoiceConnection(guild.id)
    if (!connection) {
        const emb = await musicEmbed(botUser, 'Stop Command', 'Not playing!', interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })
        return
    }
    player.stop(true)
    connection.destroy()
    await musicQueuePurge(guild.id)
    const emb = await musicEmbed(botUser, 'Stop Command', 'Stopped.', interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })
    deleteInteractionReply(interaction)
}