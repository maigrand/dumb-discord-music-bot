import { Guild} from 'discord.js'
import {getQueue} from '@/redisClient'

export async function queueHandler(guild: Guild) {
    await getQueue(guild.id)
}