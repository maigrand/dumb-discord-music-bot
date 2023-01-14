enum RedisKeys {
    HISTORY = 'history',
    QUEUE = 'queue',
    TRACKS = 'tracks',
    GUILDS = 'guilds',
}

export function getTrackKey(title: string) {
    return `${RedisKeys.TRACKS}:${title}`
}

export function getQueueKey(guildId: string) {
    return `${RedisKeys.GUILDS}:${guildId}:${RedisKeys.QUEUE}`
}

export function getHistoryKey(guildId: string) {
    return `${RedisKeys.GUILDS}:${guildId}:${RedisKeys.HISTORY}`
}
