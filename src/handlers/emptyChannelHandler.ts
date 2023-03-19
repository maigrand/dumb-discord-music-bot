import {AudioPlayer, getVoiceConnection} from '@discordjs/voice'
import {Collection, Guild, GuildMember} from 'discord.js'
import {musicQueuePurge} from '@/redisClient'

export async function emptyChannelHandler(guild: Guild, player: AudioPlayer) {
    const connection = getVoiceConnection(guild.id)
    if (!connection) {
        return
    }
    const voiceChannelId = connection?.joinConfig.channelId
    const voiceChannel = guild.channels.cache.get(voiceChannelId!) ?? await guild.channels.fetch(voiceChannelId!)
    if (!voiceChannel) {
        return
    }
    const members = voiceChannel.members as Collection<string, GuildMember>
    if (members.size === 1) {
        player.stop()
        connection.destroy()
        await musicQueuePurge(guild.id)
    }
}