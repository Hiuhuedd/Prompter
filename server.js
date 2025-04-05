require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for generating prompts and images
app.post('/api/generate-prompt', async (req, res) => {
  try {
    const { query, promptType } = req.body;

    // Validate request
    if (!query || !promptType) {
      return res.status(400).json({
        success: false,
        error: 'Query and prompt type are required'
      });
    }

    console.log(`Generating prompt for: "${query}" (${promptType})`);

    // Generate text prompt
    const { prompt, description } = await generateTextPrompt(query, promptType);
    
    // Generate image URL
    const imageUrl = await generateImageUrl(query, promptType);

    return res.json({
      success: true,
      prompt,
      description,
      imageUrl // This will always be a URL string
    });

  } catch (error) {
    console.error('Server Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error occurred',
      message: error.message
    });
  }
});

// Text prompt generation (same as before)
async function generateTextPrompt(query, promptType) {
  if (!process.env.AIML_API_KEY) {
    console.warn('No AIML_API_KEY, using fallback prompt');
    return generateFallbackPrompt(query, promptType);
  }

  try {
    const systemContent = getSystemPrompt(promptType);
    const apiResponse = await axios.post(
      'https://api.aimlapi.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: `Generate an optimized ${promptType} prompt for: ${query}` }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIML_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      prompt: apiResponse.data.choices[0].message.content.trim(),
      description: `This ${promptType} prompt helps generate content about "${query}"`
    };
  } catch (error) {
    console.error('Prompt generation failed:', error.message);
    return generateFallbackPrompt(query, promptType);
  }
}

// Generate image URL (either from API or placeholder)
async function generateImageUrl(query, promptType) {
  // If no API key, return placeholder immediately
  if (!process.env.STABILITY_API_KEY) {
    console.warn('No STABILITY_API_KEY, using placeholder');
    return getPlaceholderImageUrl(promptType);
  }

  try {

   return getUnsplashImage(query, promptType)
    const imagePrompt = createImagePrompt(query, promptType);
    
    // First try to generate with Stability AI
    const imageResponse = await axios.post(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        text_prompts: [{ text: imagePrompt, weight: 1.0 }],
        cfg_scale: 7.5,
        height: 1024,
        width: 1024,
        steps: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    // Convert base64 to a data URL
    const base64Data = imageResponse.data.artifacts[0].base64;
    return `data:image/png;base64,${base64Data}`;
    
  } catch (error) {
    console.error('Image generation failed:', error.message);
    
    // If generation fails, try to find a relevant image from a free API
    try {
      const unsplashUrl = await getUnsplashImage(query, promptType);
      if (unsplashUrl) return unsplashUrl;
    } catch (unsplashError) {
      console.error('Unsplash fallback failed:', unsplashError.message);
    }
    
    // Final fallback to placeholder
    return getPlaceholderImageUrl(promptType);
  }
}

// Try to get a relevant image from Unsplash
async function getUnsplashImage(query, promptType) {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) throw new Error('No Unsplash access key');
    
    const response = await axios.get(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      }
    );
    
    if (response.data.results.length > 0) {
      return response.data.results[0].urls.regular;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

// Helper functions
function getSystemPrompt(promptType) {
  const prompts = {
    creative: 'You are a creative writing expert. Generate detailed prompts for stories.',
    coding: 'You are a senior developer. Generate detailed coding prompts.',
    research: 'You are a research analyst. Generate thorough research prompts.',
    general: 'You are a knowledgeable assistant. Generate clear explanatory prompts.'
  };
  return prompts[promptType] || prompts.general;
}

function createImagePrompt(query, promptType) {
  const basePrompt = `${promptType} visualization: ${query}`;
  return basePrompt.length > 2000 
    ? `${promptType} scene: ${query.substring(0, 100)}` 
    : basePrompt;
}

function generateFallbackPrompt(query, type) {
  const prompts = {
    creative: `Write a detailed story about ${query} with vivid descriptions.`,
    coding: `Develop a complete solution for ${query} with well-commented code.`,
    research: `Analyze ${query} with supporting evidence and multiple perspectives.`,
    general: `Explain ${query} clearly with examples and practical applications.`
  };
  return {
    prompt: prompts[type] || prompts.general,
    description: `This ${type} prompt helps generate content about "${query}"`
  };
}

function getPlaceholderImageUrl(type) {
  const types = {
    creative: 'Creative+Writing',
    coding: 'Code+Generation',
    research: 'Research+Analysis',
    general: 'General+Prompt'
  };
  return `https://via.placeholder.com/1024x1024/cccccc/969696?text=${types[type] || types.general}`;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
});