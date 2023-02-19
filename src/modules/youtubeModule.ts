import axios from 'axios'
import ytdl from 'ytdl-core'

import {IAudioResource} from '../types'
import {createAudioResource} from '@discordjs/voice'

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export async function search(query: string, requesterUserId: string, requesterTextChannelId: string, requesterGuildId: string) {
    const searchParams = new URLSearchParams()
    searchParams.set('part', 'snippet')
    searchParams.set('type', 'video')
    searchParams.set('key', YOUTUBE_API_KEY)
    searchParams.set('q', query)
    searchParams.set('maxResults', '5')
    const url = `${YOUTUBE_API_BASE_URL}/search?${searchParams.toString()}`
    const res = await axios.get(url)

    const iAudioResources: IAudioResource[] = []
    for (const item of res.data.items) {
        const videoDetails = await getVideoDetails(item.id.videoId)
        iAudioResources.push({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            duration: YTDurationToSeconds(videoDetails.items[0].contentDetails.duration),
            url: YTVideoIdToUrl(item.id.videoId),
            requesterUserId,
            requesterTextChannelId,
            requesterGuildId,
        })
    }
    return iAudioResources
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

function YTDurationToSeconds(duration): number {
    let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    match = match.slice(1).map(function(x) {
        if (x != null) {
            return x.replace(/\D/, '');
        }
    });

    const hours = (parseInt(match[0]) || 0);
    const minutes = (parseInt(match[1]) || 0);
    const seconds = (parseInt(match[2]) || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

function YTVideoIdToUrl(videoId: string) {
    return `https://www.youtube.com/watch?v=${videoId}`
}

export function createAudioResourceFromYtdl(iAudioResource: IAudioResource) {
    const ytdlResource = ytdl(iAudioResource.url, {
        filter: 'audioonly',
        highWaterMark: 1 << 30,
        //quality: 'highestaudio',
        dlChunkSize: 0,
    })
    const resource = createAudioResource<IAudioResource>(ytdlResource, {
        inlineVolume: true,
        metadata: iAudioResource,
    })
    resource.volume.setVolume(0.1)

    return resource
}
