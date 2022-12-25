import {QueryType} from 'discord-player'
import {ChatInputCommandInteraction, TextChannel} from 'discord.js'
import {DiscordClient} from './client'

export async function play(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const channel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const query = interaction.options.getString('query')

    const searchResult = await discordClient.player
        .search(query, {
            requestedBy: interaction.user,
            searchEngine: QueryType.AUTO
        })
        .catch((e) => {
            console.error('searchResultError: ', e)
        })

    if (!searchResult || !searchResult.tracks.length) {
        await interaction.reply({
            content: `❌ | Track **${query}** not found!`
        })
        return
    }

    const queue = await discordClient.getQueue(guild, channel)

    const member = guild.members.cache.get(interaction.user.id) ?? await guild.members.fetch(interaction.user.id)

    try {
        if (!queue.connection) {
            await queue.connect(member.voice.channel)
        }
    } catch (e) {
        await discordClient.player.deleteQueue(guild.id)
        await interaction.reply({
            content: 'Could not join your voice channel!'
        })
    }

    searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0])

    const title = searchResult.playlist ? searchResult.playlist.title : searchResult.tracks[0].title
    await interaction.reply({
        content: `loading ${title}`,
        ephemeral: true
    })

    if (!queue.playing) {
        await queue.play()
    }
}

export async function skip(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const channel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const queue = await discordClient.getQueue(guild, channel)

    queue.skip()

    await interaction.reply({
        content: `skipped song`
    })
}
