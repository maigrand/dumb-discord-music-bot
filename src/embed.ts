import {EmbedBuilder, User} from 'discord.js'
import {DiscordClient} from './client'

export async function musicEmbed(discordClient: DiscordClient, title, description, user: User): Promise<EmbedBuilder> {
    const embBuilder = new EmbedBuilder();
    embBuilder.setColor([255,140,0])
    embBuilder.setTitle(title)
    embBuilder.setAuthor({
        name: discordClient.client.user.username,
        iconURL: discordClient.client.user.avatarURL(),
    })
    embBuilder.setDescription(description)
    embBuilder.setTimestamp()
    console.log('us', user)
    embBuilder.setFooter({
        text: user.username,
        iconURL: user.displayAvatarURL() ?? undefined
    })

    return embBuilder
}