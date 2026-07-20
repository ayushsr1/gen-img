import axios from 'axios';

const BUFFER_URL = 'https://api.bufferapp.com/1/updates/create.json';

function normalizeSize(size) {
  if (size === '1024x768') return '1024x1024';
  return size;
}

async function generateImage(prompt, size, quality, provider) {
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
        prompt,
        size: normalizeSize(size),
        quality,
        n: 1,
        response_format: 'url',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data?.data?.[0]?.url;
  }

  const response = await axios.post(
    'https://api.pollinations.ai/v1/images/generation',
    {
      prompt,
      size,
      quality,
      n: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.POLLINATION_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.data[0]?.url || response.data.url;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    prompt,
    text,
    profileIds,
    scheduleAt,
    style = 'professional',
    size = '1024x768',
    quality = 'high',
    imageProvider,
  } = req.body;

  if (!prompt || !text || !profileIds || Object.keys(profileIds).length === 0) {
    return res.status(400).json({
      error: 'prompt, text, and profileIds are required',
    });
  }

  try {
    const provider = imageProvider || process.env.IMAGE_PROVIDER || 'openai';
    const imageUrl = await generateImage(prompt, size, quality, provider);

    if (!imageUrl) {
      throw new Error('Image generation returned no URL');
    }

    const results = {};

    for (const [platform, profileId] of Object.entries(profileIds)) {
      const payload = {
        text,
        profile_ids: [profileId],
        media: { link: imageUrl },
      };

      if (scheduleAt) {
        payload.schedule_at = scheduleAt;
      }

      try {
        const response = await axios.post(BUFFER_URL, payload, {
          headers: {
            Authorization: `Bearer ${process.env.BUFFER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        results[platform] = {
          success: true,
          postId: response.data?.update?.id || response.data?.id,
          response: response.data,
        };
      } catch (error) {
        results[platform] = {
          success: false,
          error: error.response?.data || error.message,
        };
      }
    }

    return res.json({
      success: true,
      imageUrl,
      provider,
      results,
      style,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to generate image or post to Buffer',
      details: error.response?.data || error.message,
    });
  }
}
