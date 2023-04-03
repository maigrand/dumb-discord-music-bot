import playdl from 'play-dl'
import {createAudioResource} from '@discordjs/voice'
import {Track, TrackMetadata} from '@/types'
import axios from 'axios'
import assert from 'node:assert/strict'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'
assert(YOUTUBE_API_KEY, 'YOUTUBE_API_KEY is not defined')

export async function search(query: string, requesterUserId: string): Promise<Track[] | null> {
    if (!query.includes('http') && !query.includes('https')) {
        return searchByName(query, requesterUserId)
    }

    const videoRegExp = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*v=|v\/)))([-a-zA-Z0-9_]{11,})/
    const videoMatch = query.match(videoRegExp)
    if (videoMatch && videoMatch[1]) {
        const videoId = videoMatch[1]
        const videoDetails = await getVideoDetails(videoId, 'snippet,contentDetails')
        return [{
            videoId,
            title: videoDetails.items[0].snippet.title,
            channelTitle: videoDetails.items[0].snippet.channelTitle,
            duration: YTDurationToSeconds(videoDetails.items[0].contentDetails.duration),
            url: YTVideoIdToUrl(videoId),
            requesterUserId,
        }]
    }

    const playlistRegExp = /^.*(youtu.be\/|list=)([^#&?]*).*/
    const playlistMatch = query.match(playlistRegExp)
    if (playlistMatch && playlistMatch[2]) {
        const playlistId = playlistMatch[2]
        return await getVideosFromPlaylist(playlistId, requesterUserId)
    }
    return null
}

async function getVideosFromPlaylist(playlistId: string, requesterUserId: string) {
    const searchParams = new URLSearchParams()
    searchParams.set('part', 'snippet')
    searchParams.set('key', YOUTUBE_API_KEY)
    searchParams.set('playlistId', playlistId)
    searchParams.set('maxResults', '50')
    const url = `${YOUTUBE_API_BASE_URL}/playlistItems?${searchParams.toString()}`
    const res = await axios.get(url)

    const tracks: Track[] = []
    let nextPage = null
    for (const item of res.data.items) {
        const videoDetails = await getVideoDetails(item.snippet.resourceId.videoId)
        if (videoDetails.items.length === 0) {
            continue
        }
        tracks.push({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            duration: YTDurationToSeconds(videoDetails.items[0].contentDetails.duration),
            url: YTVideoIdToUrl(item.snippet.resourceId.videoId),
            requesterUserId,
        })
        if (res.data.nextPageToken) {
            nextPage = res.data.nextPageToken
        }
    }

    while (nextPage != null) {
        searchParams.set('pageToken', nextPage)
        const url = `${YOUTUBE_API_BASE_URL}/playlistItems?${searchParams.toString()}`
        const res = await axios.get(url)

        for (const item of res.data.items) {
            const videoDetails = await getVideoDetails(item.snippet.resourceId.videoId)
            if (videoDetails.items.length === 0) {
                continue
            }
            tracks.push({
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                channelTitle: item.snippet.channelTitle,
                duration: YTDurationToSeconds(videoDetails.items[0].contentDetails.duration),
                url: YTVideoIdToUrl(item.snippet.resourceId.videoId),
                requesterUserId,
            })
            if (res.data.nextPageToken) {
                nextPage = res.data.nextPageToken
            } else {
                nextPage = null
            }
        }
    }

    return tracks
}

async function searchByName(query: string, requesterUserId: string) {
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

        //@TODO: multiple select
        break
    }
    return tracks
}

export async function createAudioResourceFromPlaydl(trackUrl: string, guildId: string, textChannelId: string) {
    const trackMetadata: TrackMetadata = {
        guildId,
        textChannelId
    }
    //number quality : Quality number. [ 0 = Lowest, 1 = Medium, 2 = Highest ]
    const stream = await playdl.stream(trackUrl, {
        quality: 1,
    })
    const resource = await createAudioResource<TrackMetadata>(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
        metadata: trackMetadata,
    })

    resource.volume?.setVolume(0.2)

    return resource
}

async function getVideoDetails(videoId: string, part: string = 'contentDetails') {
    const searchParams = new URLSearchParams()
    searchParams.set('part', part)
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
