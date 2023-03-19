import {ChatInputCommandInteraction, Guild} from 'discord.js'
import {AudioPlayer, getVoiceConnection} from '@discordjs/voice'

export async function stopHandler(interaction: ChatInputCommandInteraction, guild: Guild, player: AudioPlayer) {
    const connection = getVoiceConnection(guild.id)
    if (!connection) {
        await interaction.reply({
            content: 'Not playing!',
            ephemeral: true,
        })
        return
    }
    player.stop(true)
    connection.destroy()
    await interaction.reply({
        content: 'Stopped!',
        ephemeral: true,
    })
}