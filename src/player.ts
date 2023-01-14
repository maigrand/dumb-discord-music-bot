import {Player, PlayerSearchResult, QueryType, Track} from 'discord-player'
import {ChatInputCommandInteraction, TextChannel, User} from 'discord.js'
import {DiscordClient} from './client'
import {musicEmbed} from './embed'
import {deleteInteractionReply, transformTrack} from './utils'
import {ITrack} from './types'
import {musicHistoryGetAll, musicHistoryPush, musicQueuePop, musicQueuePush, trackPush} from './redisMethods'

export async function play(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const channel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const query = interaction.options.getString('query')

    const searchResult = await search(discordClient.player, query, interaction.user)

    if (!searchResult) {
        const emb = await musicEmbed(discordClient, 'Play Command', `Track ${query} not found`, interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

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

    for (const track of searchResult.tracks) {
        const iTrack: ITrack = transformTrack(track)
        await trackPush(discordClient.redisClient, iTrack)
        await musicQueuePush(discordClient.redisClient, guild.id, iTrack)
        await musicHistoryPush(discordClient.redisClient, guild.id, iTrack)
        if (!searchResult.playlist) {
            break
        }
    }

    const title = searchResult.playlist ? searchResult.playlist.title : searchResult.tracks[0].title
    const emb = await musicEmbed(discordClient, 'Play Command', title, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })

    deleteInteractionReply(interaction)

    if (!queue.playing) {
        const iTrack: ITrack = await musicQueuePop(discordClient.redisClient, guild.id)
        const track = new Track(discordClient.player, iTrack)
        queue.addTrack(track)
        await queue.play()
    }
}

async function search(player: Player, query: string, user: User): Promise<PlayerSearchResult | null> {
    const searchResult = await player
        .search(query, {
            requestedBy: user,
            searchEngine: QueryType.AUTO
        })
        .catch((e) => {
            console.error('searchResultError: ', e)
            return null
        })

    if (!searchResult || !searchResult.tracks.length) {
        return null
    }

    return searchResult
}

export async function skip(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const channel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const queue = await discordClient.getQueue(guild, channel)

    queue.skip()

    const currentTrack = discordClient.currentTrack
    const emb = await musicEmbed(discordClient, 'Skip command', currentTrack.title, interaction.user)
    await interaction.reply({
        embeds: [emb]
    })

    deleteInteractionReply(interaction)
}

export async function nowPlaying(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const currentTrack = discordClient.currentTrack
    if (!currentTrack) {
        const emb = await musicEmbed(discordClient, 'Now playing command', 'Nothing played', interaction.user)
        await interaction.reply( {
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }
    const emb = await musicEmbed(discordClient, 'Now playing command', `${currentTrack.title} requested by ${currentTrack.requestedBy.username}`, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })

    deleteInteractionReply(interaction)
}

export async function history(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })
    const history = await musicHistoryGetAll(discordClient.redisClient, interaction.guildId)
    if (history.length == 0) {
        const emb = await musicEmbed(discordClient, 'History command', 'Empty history', interaction.user)
        await interaction.editReply({
            embeds: [emb]
        })

        deleteInteractionReply(interaction)

        return
    }
    const interactionContent = history.map((track, index) => `${index+1}) ${track.title} requested by ${track.requestedBy.username}\n`)
    const emb = await musicEmbed(discordClient, 'History command', interactionContent.toString(), interaction.user)
    await interaction.editReply({
        embeds: [emb]
    })

    deleteInteractionReply(interaction)
}

export async function stop(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const channel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const queue = discordClient.getQueue(guild, channel)

    queue.stop()
    queue.destroy(true)

    const emb = await musicEmbed(discordClient, 'Stop Command', 'Stopped', interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })

    deleteInteractionReply(interaction)
}
