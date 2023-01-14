enum RedisKeys {
    HISTORY = 'history',
    QUEUE = 'queue'
}

export function getHistoryKey(guildId: string) {
    return `${guildId}-${RedisKeys.HISTORY}`
}

export function getQueueKey(guildId: string) {
    return `${guildId}-${RedisKeys.QUEUE}`
}
