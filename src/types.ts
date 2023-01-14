import {TextChannel, User} from 'discord.js'
import {TrackSource} from 'discord-player'

export type IQueue = {
    channel: TextChannel | null
}

export type ITrack = {
    id: string
    description: string
    title: string
    author: string
    url: string
    thumbnail: string
    duration: string
    views: number
    requestedBy: User
    source: TrackSource
}

export type IHistoryTrack = {
    titleKey: string
    track: ITrack
}
