import {createClient} from 'redis'
import assert from 'node:assert/strict'
import {Track} from '@/types'

const REDIS_HOST = process.env.REDIS_HOST
const REDIS_PORT = process.env.REDIS_PORT

assert(REDIS_HOST, 'REDIS_HOST is not defined')
assert(REDIS_PORT, 'REDIS_PORT is not defined')

enum RedisKeys {
    HISTORY = 'history',
    QUEUE = 'queue',
    TRACKS = 'tracks',
    GUILDS = 'guilds',
    CURRENT_TRACK = 'currentTrack'
}

const redisClient = createClient({
    socket: {
        host: REDIS_HOST,
        port: Number(REDIS_PORT),
    }
})

redisClient.connect()
    .catch((e) => {
        throw e
    })

function getTrackKey(title: string) {
    return `${RedisKeys.TRACKS}:${title}`
}

function getQueueKey(guildId: string) {
    return `${RedisKeys.GUILDS}:${guildId}:${RedisKeys.QUEUE}`
}

function getHistoryKey(guildId: string) {
    return `${RedisKeys.GUILDS}:${guildId}:${RedisKeys.HISTORY}`
}

function getCurrentTrackKey(guildId: string) {
    return `${RedisKeys.GUILDS}:${guildId}:${RedisKeys.CURRENT_TRACK}`
}

async function musicQueuePush(guildId: string, track: Track) {
    const key = getQueueKey(guildId)
    await redisClient.rPush(key, track.title)
}

async function musicQueuePop(guildId: string): Promise<Track | null> {
    const key = getQueueKey(guildId)
    const trackTitle = await redisClient.lPop(key)
    if (!trackTitle) {
        return null
    }
    const rawTrack = await redisClient.get(getTrackKey(trackTitle))
    if (!rawTrack) {
        return null
    }
    return JSON.parse(rawTrack) as Track
}

async function musicHistoryPush(guildId: string, track: Track) {
    const key = getHistoryKey(guildId)
    await redisClient.sAdd(key, track.title)
}

async function musicTrackPush(track: Track) {
    const key = getTrackKey(track.title)
    await redisClient.set(key, JSON.stringify(track))
}

export async function trackPush(guildId: string, track: Track) {
    await musicTrackPush(track)
    await musicQueuePush(guildId, track)
    await musicHistoryPush(guildId, track)
}

export async function trackPop(guildId: string) {
    return await musicQueuePop(guildId)
}

export async function trackGet(title: string) {
    const key = getTrackKey(title)
    const rawTrack = await redisClient.get(key)
    if (!rawTrack) {
        return null
    }
    return JSON.parse(rawTrack) as Track
}

export async function musicQueuePurge(guildId: string) {
    const key = getQueueKey(guildId)
    await redisClient.del(key)
}

export async function setCurrentTrack(guildId: string, track: Track) {
    const key = getCurrentTrackKey(guildId)
    await redisClient.set(key, track.title)
}

export async function getCurrentTrack(guildId: string) {
    const key = getCurrentTrackKey(guildId);
    const trackTitle = await redisClient.get(key)
    if (!trackTitle) {
        return null
    }
    const rawTrack = await redisClient.get(getTrackKey(trackTitle))
    if (!rawTrack) {
        return null
    }
    return JSON.parse(rawTrack) as Track
}

export async function getQueue(guildId: string) {
    const key = getQueueKey(guildId)
    const rawData = await redisClient.lRange(key, 0, -1)
    return rawData
}

export async function getHistory(guildId: string) {
    const key = getHistoryKey(guildId)
    const rawData = await redisClient.sMembers(key)
    return rawData
}
