import {ChatInputCommandInteraction, Guild, User} from 'discord.js'
import {getQueue} from '@/redisClient'
import {deleteInteractionReply, musicEmbed} from '@/util'

export async function queueHandler(botUser: User, interaction: ChatInputCommandInteraction, guild: Guild) {
    await interaction.deferReply({ephemeral: true})
    const trackTitles = await getQueue(guild.id)
    if (!trackTitles || trackTitles.length === 0) {
        const emb = await musicEmbed(botUser, 'Queue Command', 'Queue is empty', interaction.user)
        await interaction.editReply({
            embeds: [emb],
        })

        deleteInteractionReply(interaction)

        return
    }
    let out = trackTitles.join('\n')
    if (out.length >= 4096) {
        out = out.substring(0, 4093) + '...'
    }
    const emb = await musicEmbed(botUser, 'Queue Command', out, interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })
}