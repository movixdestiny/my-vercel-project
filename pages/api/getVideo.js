import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { tmdbid } = req.query;

    if (!tmdbid) {
        return res.status(400).json({ error: 'TMDB ID is required' });
    }

    // Fetch Netflix ID using the new API
    const apiUrl = `https://streaming-availability.p.rapidapi.com/get?output_language=en&tmdb_id=movie%2F${tmdbid}`;
    const apiHeaders = {
        'Accept': 'application/json',
        'x-rapidapi-key': '206f66123cmsh234489eccabe66ap1d53fejsnbd5b11c15c9c',
        'x-rapidapi-host': 'streaming-availability.p.rapidapi.com'
    };

    try {
        console.log(`Fetching data from API: ${apiUrl}`);
        const response = await fetch(apiUrl, { headers: apiHeaders });
        const data = await response.json();

        console.log('API Response:', JSON.stringify(data, null, 2));

        // Check if result and videoLink exist
        if (!data.result) {
            throw new Error('Result not found in API response');
        }

        if (!data.result.videoLink) {
            throw new Error('Video link not found in result');
        }

        // Extract the Netflix ID
        const netflixUrl = data.result.videoLink;
        console.log('Netflix URL:', netflixUrl);
        const netflixIdMatch = netflixUrl.match(/watch\/(\d+)/);
        if (!netflixIdMatch) {
            throw new Error('Netflix ID not found in video link');
        }
        const netflixId = netflixIdMatch[1];
        console.log('Netflix ID:', netflixId);

        // Fetch M3U8 playlist
        const m3u8Url = `https://proxy.smashystream.com/proxy/echo1/https://pcmirror.cc/hls/${netflixId}.m3u8`;
        console.log(`Fetching M3U8 playlist from URL: ${m3u8Url}`);
        const m3u8Response = await fetch(m3u8Url);
        const m3u8Data = await m3u8Response.text();

        console.log('M3U8 Playlist Data:', m3u8Data.substring(0, 500)); // Log first 500 chars for brevity

        // Filter M3U8 playlist for French audio and 720p video
        const filteredM3u8 = m3u8Data
            .split('\n')
            .filter(line => line.includes('LANGUAGE="fra"') || line.includes('720p'))
            .join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(filteredM3u8);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
