import {ChatInputCommandInteraction, EmbedBuilder, User} from 'discord.js'

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
