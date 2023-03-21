import playdl from 'play-dl'
import {createAudioResource} from '@discordjs/voice'
import {Track, TrackMetadata} from '@/types'
import axios from 'axios'
import assert from 'node:assert/strict'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'
assert(YOUTUBE_API_KEY, 'YOUTUBE_API_KEY is not defined')

export async function search(query: string, requesterUserId: string) {
    const searchParams = new URLSearchParams()
    searchParams.set('part', 'snippet')
    searchParams.set('type', 'video')
    searchParams.set('key', YOUTUBE_API_KEY)
    searchParams.set('q', query)
    searchParams.set('maxResults', '5')
    const url = `${YOUTUBE_API_BASE_URL}/search?${searchParams.toString()}`
    const res = await axios.get(url)

    const tracks: Track[] = []
    for (const item of res.data.items) {
        const videoDetails = await getVideoDetails(item.id.videoId)
        tracks.push({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            duration: YTDurationToSeconds(videoDetails.items[0].contentDetails.duration),
            url: YTVideoIdToUrl(item.id.videoId),
            requesterUserId,
        })
    }
    return tracks
}

export async function createAudioResourceFromPlaydl(trackUrl: string, guildId: string, textChannelId: string) {
    const trackMetadata: TrackMetadata = {
        guildId,
        textChannelId
    }
    const stream = await playdl.stream(trackUrl)
    const resource = await createAudioResource<TrackMetadata>(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
        metadata: trackMetadata,
    })

    resource.volume?.setVolume(0.2)

    return resource
}

async function getVideoDetails(videoId: string) {
    const searchParams = new URLSearchParams()
    searchParams.set('part', 'contentDetails')
    searchParams.set('key', YOUTUBE_API_KEY)
    searchParams.set('id', videoId)
    const url = `${YOUTUBE_API_BASE_URL}/videos?${searchParams.toString()}`
    const res = await axios.get(url)

    return res.data
}

function YTDurationToSeconds(duration: string) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    if (!match) {
        return 0
    }

    const transformMatch = match.slice(1).map((x) => {
        if (x != null) {
            return x.replace(/\D/, '');
        }
        return x
    })

    const hours = transformMatch[0] ? parseInt(transformMatch[0]) : 0
    const minutes = transformMatch[1] ? parseInt(transformMatch[1]) : 0
    const seconds = transformMatch[2] ? parseInt(transformMatch[2]) : 0

    return hours * 3600 + minutes * 60 + seconds;
}

function YTVideoIdToUrl(videoId: string) {
    return `https://www.youtube.com/watch?v=${videoId}`
}
