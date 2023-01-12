import {PlayerSearchResult, QueryType, Track} from 'discord-player'
import {ChatInputCommandInteraction, TextChannel} from 'discord.js'
import {DiscordClient} from './client'
import {musicEmbed} from './embed'
import {deleteInteractionReply} from './utils'
import {RedisKeys} from './redisKeys.enum'

export async function play(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const channel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const query = interaction.options.getString('query')

    const searchResult = await search(discordClient, interaction)

    if (!searchResult) {
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
        const emb = await musicEmbed(discordClient, 'Play Command', 'Could not join your voice channel!', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    if (searchResult.playlist) {
        for (const track of searchResult.tracks) {
            await discordClient.redisClient.lPush(RedisKeys.QUEUE, JSON.stringify({...track, source: track.source}))
        }
    } else {
        await discordClient.redisClient.lPush(RedisKeys.QUEUE, JSON.stringify({...searchResult.tracks[0], source: searchResult.tracks[0].source}))
    }

    await discordClient.redisClient.sAdd(RedisKeys.HISTORY, JSON.stringify({
        title: query,
        username: interaction.user.username
    }))

    const title = searchResult.playlist ? searchResult.playlist.title : searchResult.tracks[0].title
    const emb = await musicEmbed(discordClient, 'Play Command', title, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })

    deleteInteractionReply(interaction)

    if (!queue.playing) {
        const rawData = await discordClient.redisClient.lPop(RedisKeys.QUEUE)
        const data = JSON.parse(rawData)
        const track = new Track(discordClient.player, data)
        await queue.play(track)
    }
}

async function search(discordClient: DiscordClient, interaction: ChatInputCommandInteraction): Promise<PlayerSearchResult | null> {
    const query = interaction.options.getString('query')

    const searchResult = await discordClient.player
        .search(query, {
            requestedBy: interaction.user,
            searchEngine: QueryType.AUTO
        })
        .catch((e) => {
            console.error('searchResultError: ', e)
            return null
        })

    if (!searchResult || !searchResult.tracks.length) {
        const emb = await musicEmbed(discordClient, 'Play Command', `Track ${query} not found`, interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return null
    }

    return searchResult
}

export async function skip(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const channel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const queue = await discordClient.getQueue(guild, channel)

    queue.skip()

    const currentTrack = discordClient.getCurrentTrack()
    const emb = await musicEmbed(discordClient, 'Skip command', currentTrack.title, interaction.user)
    await interaction.reply({
        embeds: [emb]
    })

    deleteInteractionReply(interaction)
}

export async function nowPlaying(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const currentTrack = discordClient.getCurrentTrack()
    if (!currentTrack) {
        const emb = await musicEmbed(discordClient, 'Now playing command', 'Nothing played', interaction.user)
        await interaction.reply( {
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }
    const emb = await musicEmbed(discordClient, 'Now playing command', `${currentTrack.title} requested by ${currentTrack.username}`, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })

    deleteInteractionReply(interaction)
}

export async function history(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })
    const history = await discordClient.getHistory()
    if (history.length == 0) {
        const emb = await musicEmbed(discordClient, 'History command', 'Empty history', interaction.user)
        await interaction.editReply({
            embeds: [emb]
        })

        deleteInteractionReply(interaction)

        return
    }
    const interactionContent = history.map((track, index) => `${index+1}) ${track.title} requested by ${track.username}\n`)
    const emb = await musicEmbed(discordClient, 'History command', interactionContent.toString(), interaction.user)
    await interaction.editReply({
        embeds: [emb]
    })

    deleteInteractionReply(interaction)
}
