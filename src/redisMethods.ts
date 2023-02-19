import {getHistoryKey, getQueueKey, getTrackKey} from './redisKeys'
import {IAudioResource} from './types'

export async function trackPush(redisClient, iAudioResource: IAudioResource) {
    const rKey = getTrackKey(iAudioResource.title)
    await redisClient.set(rKey, JSON.stringify(iAudioResource))
}

export async function musicQueuePush(redisClient, guildId: string, iAudioResource: IAudioResource) {
    const rKey = getQueueKey(guildId)
    await redisClient.rPush(rKey, iAudioResource.title)
}

export async function musicQueuePop(redisClient, guildId: string): Promise<IAudioResource> {
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

export async function musicQueueGet(redisClient, guildId: string): Promise<IAudioResource> {
    const rKey = getQueueKey(guildId)
    const trackTitle = await redisClient.lIndex(rKey, 0)
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

export async function musicHistoryPush(redisClient, guildId: string, iAudioResource: IAudioResource) {
    const rKey = getHistoryKey(guildId)
    await redisClient.sAdd(rKey, iAudioResource.title)
}

export async function musicHistoryGetRandom(redisClient, guildId: string): Promise<IAudioResource> {
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

export async function musicHistoryGetAll(redisClient, guildId: string): Promise<IAudioResource[]> {
    const rKey = getHistoryKey(guildId)
    const historyTrackIds = await redisClient.sMembers(rKey)
    const iAudioResources: IAudioResource[] = []
    for (const historyTrackId of historyTrackIds) {
        const rawITrack = await redisClient.get(getTrackKey(historyTrackId))
        const iTrack = JSON.parse(rawITrack)
        iAudioResources.push(iTrack)
    }
    return iAudioResources
}
