import axios from 'axios';

export default async function handler(req, res) {
  const { text, imageUrl, profileIds } = req.body;

  if (!text || !imageUrl || !profileIds) {
    return res.status(400).json({ 
      error: 'text, imageUrl, profileIds required' 
    });
  }

  try {
    const results = {};

    for (const [platform, profileId] of Object.entries(profileIds)) {
      const payload = {
        text: text,
        profile_ids: [profileId],
        media: { link: imageUrl },
      };

      try {
        const response = await axios.post(
          'https://api.bufferapp.com/1/updates/create.json',
          payload,
          {
            headers: {
              'Authorization': `Bearer ${process.env.BUFFER_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        results[platform] = {
          success: true,
          postId: response.data.update.id,
        };
      } catch (error) {
        results[platform] = {
          success: false,
          error: error.message,
        };
      }
    }

    return res.json({
      success: true,
      results: results,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Buffer posting failed',
      details: error.message,
    });
  }
}