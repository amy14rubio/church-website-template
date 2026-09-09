const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const CHANNEL_HANDLE = '@your-church-handle'
const API_BASE = 'https://www.googleapis.com/youtube/v3'
const PAGE_SIZE = 24

export interface YoutubeVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
}

export interface YoutubePlaylist {
  playlistId: string
  title: string
  thumbnailUrl: string
  itemCount: number
}

// What the picker hands back — either a single video or a whole
// playlist, chosen from the picker's two tabs.
export type YoutubeSelection =
  | { kind: 'video'; video: YoutubeVideo }
  | { kind: 'playlist'; playlist: YoutubePlaylist }

// A "load more" page — nextPageToken is null once the channel has no
// further videos/playlists left to fetch.
export interface YoutubePage<T> {
  items: T[]
  nextPageToken: string | null
}

// The real youtube.com URL for a video/playlist — used to preview
// something before saving it (opens in a new tab; YouTube's own player
// isn't something worth re-embedding just for a quick look).
export function youtubeWatchUrl(youtubeId: string, kind: 'video' | 'playlist'): string {
  return kind === 'playlist' ? `https://www.youtube.com/playlist?list=${youtubeId}` : `https://www.youtube.com/watch?v=${youtubeId}`
}

interface ChannelsListResponse {
  items?: { id?: string; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[]
}

interface PlaylistItemsResponse {
  items?: {
    snippet: {
      title: string
      publishedAt: string
      resourceId: { videoId: string }
      thumbnails?: { medium?: { url: string }; default?: { url: string } }
    }
  }[]
  nextPageToken?: string
}

interface PlaylistsListResponse {
  items?: {
    id: string
    snippet: { title: string; thumbnails?: { medium?: { url: string }; default?: { url: string } } }
    contentDetails?: { itemCount?: number }
  }[]
  nextPageToken?: string
}

interface ChannelInfo {
  channelId: string
  uploadsPlaylistId: string
}

// Cached for the session — neither value changes, no reason to
// re-resolve them on every picker open.
let cachedChannelInfo: ChannelInfo | null = null

async function getChannelInfo(): Promise<ChannelInfo> {
  if (cachedChannelInfo) return cachedChannelInfo

  const res = await fetch(
    `${API_BASE}/channels?part=id,contentDetails&forHandle=${encodeURIComponent(CHANNEL_HANDLE)}&key=${API_KEY}`,
  )
  if (!res.ok) throw new Error('No se pudo conectar con YouTube.')
  const data: ChannelsListResponse = await res.json()
  const channelId = data.items?.[0]?.id
  const uploadsPlaylistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!channelId || !uploadsPlaylistId) throw new Error('No se encontró el canal de YouTube.')

  cachedChannelInfo = { channelId, uploadsPlaylistId }
  return cachedChannelInfo
}

export async function fetchChannelVideos(pageToken?: string): Promise<YoutubePage<YoutubeVideo>> {
  const { uploadsPlaylistId } = await getChannelInfo()
  const pageParam = pageToken ? `&pageToken=${pageToken}` : ''

  const res = await fetch(
    `${API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${PAGE_SIZE}${pageParam}&key=${API_KEY}`,
  )
  if (!res.ok) throw new Error('No se pudieron cargar los videos.')
  const data: PlaylistItemsResponse = await res.json()

  return {
    items: (data.items ?? []).map((item) => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
      publishedAt: item.snippet.publishedAt,
    })),
    nextPageToken: data.nextPageToken ?? null,
  }
}

// The first video in a playlist, by playlist order — used when a
// picker flow wants "just one video" out of a playlist pick (e.g. the
// home teachings carousel imports a playlist selection as its first
// video, since that carousel plays one plain video per slot rather than
// embedding a whole playlist).
export async function fetchFirstPlaylistVideo(playlistId: string): Promise<YoutubeVideo> {
  const res = await fetch(`${API_BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1&key=${API_KEY}`)
  if (!res.ok) throw new Error('No se pudo cargar el primer video de la lista.')
  const data: PlaylistItemsResponse = await res.json()
  const item = data.items?.[0]
  if (!item) throw new Error('La lista de reproducción está vacía.')

  return {
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
    publishedAt: item.snippet.publishedAt,
  }
}

// The channel's own curated playlists (e.g. a whole teaching series) —
// distinct from the single big "uploads" playlist fetchChannelVideos
// reads from.
export async function fetchChannelPlaylists(pageToken?: string): Promise<YoutubePage<YoutubePlaylist>> {
  const { channelId } = await getChannelInfo()
  const pageParam = pageToken ? `&pageToken=${pageToken}` : ''

  const res = await fetch(
    `${API_BASE}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=${PAGE_SIZE}${pageParam}&key=${API_KEY}`,
  )
  if (!res.ok) throw new Error('No se pudieron cargar las listas de reproducción.')
  const data: PlaylistsListResponse = await res.json()

  return {
    items: (data.items ?? []).map((item) => ({
      playlistId: item.id,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
      itemCount: item.contentDetails?.itemCount ?? 0,
    })),
    nextPageToken: data.nextPageToken ?? null,
  }
}
