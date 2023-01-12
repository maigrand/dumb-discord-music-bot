import {ChatInputCommandInteraction} from 'discord.js'

export function deleteInteractionReply(interaction: ChatInputCommandInteraction, timeOut: number = 10000) {
    try {
        setTimeout(() => {
            interaction.deleteReply()
        },  timeOut)
    } catch (e) {}
}