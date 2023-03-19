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

export async function trackGet(guildId: string) {
    return await musicQueuePop(guildId)
}

export async function musicQueuePurge(guildId: string) {
    const key = getQueueKey(guildId)
    await redisClient.del(key)
}
