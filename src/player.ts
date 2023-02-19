import {ChatInputCommandInteraction, TextChannel} from 'discord.js'
import {DiscordClient} from './client'
import {musicEmbed} from './embed'
import {deleteInteractionReply} from './utils'
import {autoPlaylistCounter} from '../options.json'
import {
    musicHistoryGetAll, musicHistoryGetRandom,
    musicHistoryPush,
    musicQueueGet,
    musicQueuePop,
    musicQueuePush,
    trackPush
} from './redisMethods'
import {createAudioResourceFromYtdl, search} from './modules/youtubeModule'
import {getVoiceConnection, joinVoiceChannel} from '@discordjs/voice'

export async function play(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const guild = discordClient.client.guilds.cache.get(interaction.guildId)
    const textChannel = guild.channels.cache.get(interaction.channelId) as TextChannel
    const member = guild.members.cache.get(interaction.user.id) ?? await guild.members.fetch(interaction.user.id)
    const query = interaction.options.getString('query')

    const searchResults = await search(query, member.id, textChannel.id, interaction.guildId)
    if (!searchResults) {
        const emb = await musicEmbed(discordClient, 'Play Command', `Track ${query} not found`, interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    const voiceChannel = member.voice.channel
    if (!voiceChannel) {
        const emb = await musicEmbed(discordClient, 'Play Command', 'Could not join your voice channel!', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    const title = searchResults[0].title
    const emb = await musicEmbed(discordClient, 'Play Command', title, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })
    deleteInteractionReply(interaction)

    await trackPush(discordClient.redisClient, searchResults[0])
    await musicQueuePush(discordClient.redisClient,guild.id, searchResults[0])
    await musicHistoryPush(discordClient.redisClient,guild.id, searchResults[0])

    let connection = getVoiceConnection(guild.id)
    if (!connection) {
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })

        await trackHandler(discordClient, guild.id)
        connection.subscribe(discordClient.player)
    }
}

export async function skip(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const connection = getVoiceConnection(interaction.guildId)
    if (!connection) {
        const emb = await musicEmbed(discordClient, 'Skip Command', 'No song is playing', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    const iAudioResource = await musicQueueGet(discordClient.redisClient, interaction.guild.id)
    if (!iAudioResource) {
        const emb = await musicEmbed(discordClient, 'Skip Command', 'No song in next', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    await trackHandler(discordClient, interaction.guildId)

    const emb = await musicEmbed(discordClient, 'Skip Command', iAudioResource.title, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })
    deleteInteractionReply(interaction)
}

export async function nowPlaying(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const connection = getVoiceConnection(interaction.guildId)
    if (!connection) {
        const emb = await musicEmbed(discordClient, 'Now Playing Command', 'No song is playing', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    const currentIAudioResource = discordClient.getCurrentTrack(interaction.guildId)
    if (!currentIAudioResource) {
        const emb = await musicEmbed(discordClient, 'Now Playing Command', 'No song is playing', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    const guild = interaction.guild
    const member = guild.members.cache.get(currentIAudioResource.requesterUserId) ?? await guild.members.fetch(currentIAudioResource.requesterUserId)
    const emb = await musicEmbed(discordClient, 'Now Playing Command', `${currentIAudioResource.title} requested by ${member.displayName}`, interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })
    deleteInteractionReply(interaction)
}

export async function history(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })
    const history = await musicHistoryGetAll(discordClient.redisClient, interaction.guild.id)

    if (!history) {
        const emb = await musicEmbed(discordClient, 'History Command', 'No history', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    const guild = interaction.guild
    let interactionContent = ''
    for (const audioResource of history) {
        const member = guild.members.cache.get(audioResource.requesterUserId) ?? await guild.members.fetch(audioResource.requesterUserId)
        interactionContent += `${audioResource.title} requested by ${member.displayName}\n`
    }
    const emb = await musicEmbed(discordClient, 'History command', interactionContent.toString(), interaction.user)
    await interaction.editReply({
        embeds: [emb],
    })

    deleteInteractionReply(interaction)
}

export async function stop(discordClient: DiscordClient, interaction: ChatInputCommandInteraction) {
    const connection = getVoiceConnection(interaction.guildId)
    if (!connection) {
        const emb = await musicEmbed(discordClient, 'Stop Command', 'No song is playing', interaction.user)
        await interaction.reply({
            embeds: [emb],
            ephemeral: true
        })

        deleteInteractionReply(interaction)

        return
    }

    discordClient.player.stop()
    connection.destroy()

    const emb = await musicEmbed(discordClient, 'Stop Command', 'Stopped', interaction.user)
    await interaction.reply({
        embeds: [emb],
        ephemeral: true
    })
    deleteInteractionReply(interaction)
}

export async function trackHandler(discordClient: DiscordClient, guildId: string) {
    const iAudioResource = await musicQueuePop(discordClient.redisClient, guildId)
    if (iAudioResource) {
        discordClient.setCurrentTrack(iAudioResource)
        const resource = createAudioResourceFromYtdl(iAudioResource)
        discordClient.player.play(resource)
    } else {
        if (discordClient.autoPlaylistCounter < autoPlaylistCounter) {
            const randomIAudioResource = await musicHistoryGetRandom(discordClient.redisClient, guildId)
            const resource = createAudioResourceFromYtdl(randomIAudioResource)
            discordClient.player.play(resource)
            discordClient.autoPlaylistCounter++
        } else {
            discordClient.player.stop()
            const connection = getVoiceConnection(guildId)
            connection.destroy()
        }
    }
}
