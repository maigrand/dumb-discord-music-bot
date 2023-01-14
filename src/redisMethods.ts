import {getHistoryKey, getQueueKey, getTrackKey} from './redisKeys'
import {ITrack} from './types'

export async function trackPush(redisClient, iTrack: ITrack) {
    const rKey = getTrackKey(iTrack.title)
    await redisClient.set(rKey, JSON.stringify(iTrack))
}

export async function musicQueuePush(redisClient, guildId: string, track: ITrack) {
    const rKey = getQueueKey(guildId)
    await redisClient.rPush(rKey, track.title)
}

export async function musicQueuePop(redisClient, guildId: string): Promise<ITrack> {
    const rKey = getQueueKey(guildId)
    const trackTitle = await redisClient.lPop(rKey)
    if (!trackTitle) {
        return null
    }
    const rawITrack = await redisClient.get(getTrackKey(trackTitle))
    if (!rawITrack) {
        return null
    }
    return JSON.parse(rawITrack)
}

export async function musicQueuePurge(redisClient, guildId: string) {
    const rKey = getQueueKey(guildId)
    await redisClient.del(rKey)
}

export async function musicHistoryPush(redisClient, guildId: string, track: ITrack) {
    const rKey = getHistoryKey(guildId)
    await redisClient.sAdd(rKey, track.title)
}

export async function musicHistoryGetRandom(redisClient, guildId: string): Promise<ITrack> {
    const rKey = getHistoryKey(guildId)
    const trackTitle = await redisClient.sRandMember(rKey)
    if (!trackTitle) {
        return null
    }
    const rawITrack = await redisClient.get(getTrackKey(trackTitle))
    if (!rawITrack) {
        return null
    }
    return JSON.parse(rawITrack)
}

export async function musicHistoryGetAll(redisClient, guildId: string): Promise<ITrack[]> {
    const rKey = getHistoryKey(guildId)
    const historyTrackIds = await redisClient.sMembers(rKey)
    const iTracks: ITrack[] = []
    for (const historyTrackId of historyTrackIds) {
        const rawITrack = await redisClient.get(getTrackKey(historyTrackId))
        const iTrack = JSON.parse(rawITrack)
        iTracks.push(iTrack)
    }
    return iTracks
}
