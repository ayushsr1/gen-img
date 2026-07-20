import axios from 'axios';

function normalizeSize(size) {
  if (size === '1024x768') return '1024x1024';
  return size;
}

async function generateWithOpenAI(prompt, size, quality) {
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

async function generateWithPollinations(prompt, size, quality) {
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
  const {
    prompt,
    style = 'professional',
    size = '1024x768',
    quality = 'high',
    imageProvider,
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    const provider = imageProvider || process.env.IMAGE_PROVIDER || 'openai';
    let imageUrl = null;

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      imageUrl = await generateWithOpenAI(prompt, size, quality);
    } else {
      imageUrl = await generateWithPollinations(prompt, size, quality);
    }

    if (!imageUrl) {
      throw new Error('No image URL returned from the selected provider');
    }

    return res.json({
      success: true,
      imageUrl,
      prompt,
      provider,
      style,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Image generation failed',
      details: error.message,
    });
  }
}