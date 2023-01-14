import {ChatInputCommandInteraction} from 'discord.js'
import {Track} from 'discord-player'
import {ITrack} from './types'

export function deleteInteractionReply(interaction: ChatInputCommandInteraction, timeOut: number = 10000) {
    try {
        setTimeout(() => {
            interaction.deleteReply()
        },  timeOut)
    } catch (e) {}
}

export function transformTrack(track: Track): ITrack {
    return {
        id: track.id,
        description: track.description,
        title: track.title,
        author: track.author,
        url: track.url,
        thumbnail: track.thumbnail,
        duration: track.duration,
        views: track.views,
        requestedBy: track.requestedBy,
        source: track.source
    };
}
