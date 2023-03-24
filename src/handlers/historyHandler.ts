import {ChatInputCommandInteraction, Guild, User} from 'discord.js'
import {deleteInteractionReply, musicEmbed} from '@/util'
import {getHistory} from '@/redisClient'

export async function historyHandler(botUser: User, interaction: ChatInputCommandInteraction, guild: Guild) {
    await interaction.deferReply({ephemeral: true})
    const trackTitles = await getHistory(guild.id)
    if (!trackTitles || trackTitles.length === 0) {
        const emb = await musicEmbed(botUser, 'History Command', 'History is empty', interaction.user)
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
    const emb = await musicEmbed(botUser, 'History Command', out, interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })
}