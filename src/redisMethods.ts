import {getHistoryKey, getQueueKey} from './redisKeys.enum'
import {IHistoryTrack, ITrack} from './types'

export async function musicQueuePush(redisClient, guildId: string, track: ITrack) {
    const rKey = getQueueKey(guildId)
    await redisClient.rPush(rKey, JSON.stringify(track))
}

export async function musicQueuePop(redisClient, guildId: string): Promise<ITrack> {
    const rKey = getQueueKey(guildId)
    const rawTrack = await redisClient.lPop(rKey)
    if (!rawTrack) {
        return null
    }
    return JSON.parse(rawTrack)
}

export async function musicQueuePurge(redisClient, guildId: string) {
    const rKey = getQueueKey(guildId)
    await redisClient.del(rKey)
}

export async function musicHistoryPush(redisClient, guildId: string, track: IHistoryTrack) {
    const rKey = getHistoryKey(guildId)
    await redisClient.sAdd(rKey, JSON.stringify(track))
}

export async function musicHistoryGetRandom(redisClient, guildId: string): Promise<ITrack> {
    const rKey = getHistoryKey(guildId)
    const rawHistoryTracks = await redisClient.sMembers(rKey)
    const rawHistoryTrack = rawHistoryTracks[Math.floor(Math.random() * rawHistoryTracks.length)]
    const historyTrack: IHistoryTrack = JSON.parse(rawHistoryTrack)
    return historyTrack.track
}

export async function musicHistoryGetAll(redisClient, guildId: string): Promise<ITrack[]> {
    const rKey = getHistoryKey(guildId)
    const rawHistory = await redisClient.sMembers(rKey)
    const tracks: ITrack[] = []
    for (const rawHistoryTrack of rawHistory) {
        const historyTrack: IHistoryTrack = JSON.parse(rawHistoryTrack)
        tracks.push(historyTrack.track)
    }
    return tracks
}
