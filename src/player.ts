import {QueryType} from 'discord-player'
import {ChatInputCommandInteraction, TextChannel} from 'discord.js'
import {DiscordClient} from './client'
import {musicEmbed} from './embed'

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
        const emb = await musicEmbed(discordClient, 'Play Command', `Track ${query} not found`, interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
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
        const emb = await musicEmbed(discordClient, 'Play Command', 'Could not join your voice channel!', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })
        return
    }

    searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0])

    const title = searchResult.playlist ? searchResult.playlist.title : searchResult.tracks[0].title
    const emb = await musicEmbed(discordClient, 'Play Command', title, interaction.user)
    await interaction.reply({
        embeds: [emb],
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

    const currentTrack = discordClient.getCurrentTrack()
    const emb = await musicEmbed(discordClient, 'Skip command', currentTrack.title, interaction.user)
    await interaction.reply({
        embeds: [emb]
    })

    setTimeout(() => {
        interaction.deleteReply()
    }, 10000)
}

export async function nowPlaying(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const currentTrack = discordClient.getCurrentTrack()
    if (!currentTrack) {
        const emb = await musicEmbed(discordClient, 'Now playing command', 'Nothing played', interaction.user)
        await interaction.reply( {
            embeds: [emb],
            ephemeral: true
        })
        return
    }
    const emb = await musicEmbed(discordClient, 'Now playing command', `${currentTrack.title} requested by ${currentTrack.username}`, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })
}

export async function history(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })
    const history = discordClient.getHistory()
    if (history.length == 0) {
        const emb = await musicEmbed(discordClient, 'History command', 'Empty history', interaction.user)
        await interaction.editReply({
            embeds: [emb]
        })
        return
    }
    const interactionContent = history.map((track, index) => `${index+1}) ${track.title} requested by ${track.username}\n`)
    const emb = await musicEmbed(discordClient, 'History command', interactionContent.toString(), interaction.user)
    await interaction.editReply({
        embeds: [emb]
    })
}
