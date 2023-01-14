import {EmbedBuilder, User} from 'discord.js'
import {DiscordClient} from './client'

export async function musicEmbed(discordClient: DiscordClient, title, description, user: User, thumbnail?: string): Promise<EmbedBuilder> {
    const embBuilder = new EmbedBuilder();
    embBuilder.setColor([255,140,0])
    embBuilder.setTitle(title)
    embBuilder.setAuthor({
        name: discordClient.client.user.username,
        iconURL: discordClient.client.user.avatarURL(),
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