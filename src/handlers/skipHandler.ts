import {ChatInputCommandInteraction, User} from 'discord.js'
import {AudioPlayer} from '@discordjs/voice'
import {deleteInteractionReply, musicEmbed} from '@/util'

export async function skipHandler(botUser: User, interaction: ChatInputCommandInteraction, player: AudioPlayer) {
    await interaction.deferReply({ephemeral: true})
    player.stop()

    const emb = await musicEmbed(botUser, 'Skip Command', 'Skipped', interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })
    deleteInteractionReply(interaction)
}
