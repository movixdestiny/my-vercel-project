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
        const response = await fetch(apiUrl, { headers: apiHeaders });
        const data = await response.json();

        console.log('API Response:', data);

        // Check if result and videoLink exist
        if (!data.result || !data.result.videoLink) {
            throw new Error('Video link not found in API response');
        }

        // Extract the Netflix ID
        const netflixUrl = data.result.videoLink;
        const netflixIdMatch = netflixUrl.match(/watch\/(\d+)/);
        if (!netflixIdMatch) {
            throw new Error('Netflix ID not found in video link');
        }
        const netflixId = netflixIdMatch[1];

        // Fetch M3U8 playlist
        const m3u8Url = `https://proxy.smashystream.com/proxy/echo1/https://pcmirror.cc/hls/${netflixId}.m3u8`;
        const m3u8Response = await fetch(m3u8Url);
        const m3u8Data = await m3u8Response.text();

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
