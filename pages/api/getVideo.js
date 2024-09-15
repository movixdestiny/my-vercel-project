import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { tmdbid } = req.query;

  if (!tmdbid) {
    return res.status(400).json({ error: 'tmdbid is required' });
  }

  try {
    // Step 1: Fetch Netflix ID
    const response = await fetch(`https://streaming-availability.p.rapidapi.com/shows/movie/${tmdbid}`, {
      headers: {
        'Accept': 'application/json',
        'x-rapidapi-key': '206f66123cmsh234489eccabe66ap1d53fejsnbd5b11c15c9c',
        'x-rapidapi-host': 'streaming-availability.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch Netflix ID' });
    }

    const data = await response.json();
    const netflixId = data.streamingOptions.find(option => option.type === 'subscription' && option.service === 'netflix')?.id;

    if (!netflixId) {
      return res.status(404).json({ error: 'Netflix ID not found' });
    }

    // Step 2: Fetch M3U8 Playlist
    const m3u8Response = await fetch(`https://proxy.smashystream.com/proxy/echo1/https://pcmirror.cc/hls/${netflixId}.m3u8`);

    if (!m3u8Response.ok) {
      return res.status(m3u8Response.status).json({ error: 'Failed to fetch M3U8 playlist' });
    }

    const m3u8Data = await m3u8Response.text();

    // Step 3: Filter M3U8 Playlist
    const filteredM3U8 = m3u8Data
      .split('\n')
      .filter(line => line.includes('LANGUAGE="fra"') || line.includes('720p.m3u8'))
      .join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(filteredM3U8);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
