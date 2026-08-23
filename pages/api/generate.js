export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { niche, type, variation, imageBase64, mediaType } = req.body;

  if (!type || !variation) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const systemPrompt = type === 'phone' ? getPhonePrompt(variation) : getPosterPrompt(variation);

  let messages;

  if (type === 'poster' && imageBase64) {
    messages = [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 }
        },
        {
          type: 'text',
          text: 'Look at this poster image carefully and generate a complete Etsy listing for it based on what you see.'
        }
      ]
    }];
  } else {
    messages = [{ role: 'user', content: 'Generate a listing for: ' + niche }];
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Anthropic error ' + response.status, details: data });
    }

    if (!data.content || !data.content[0]) {
      return res.status(500).json({ error: 'No content returned', data });
    }

    const text = data.content[0].text;
    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const descMatch = text.match(/DESCRIPTION:\s*([\s\S]+?)(?=\nTAGS:|$)/);
    const tagsMatch = text.match(/TAGS:\s*([\s\S]+)/);

    return res.status(200).json({
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
      tags: tagsMatch ? tagsMatch[1].trim() : ''
    });

  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed: ' + err.message });
  }
}

function getPhonePrompt(variation) {
  if (variation === '1') {
    return 'You are an Etsy SEO expert for phone cases. STRICT RULES:\n\nTITLE: [Niche] Phone Case [Simple Keywords] Cover\n- Always mention franchise for characters (e.g. "Levi Ackerman Phone Case Attack on Titan Anime Cover")\n- Simple searchable keywords only, never fandom slang or song names\n\nBRAND TAGS - always include one of these when relevant:\n- Disney: include "disney phone case"\n- Ghibli: include "ghibli phone case"\n- Star Wars: include "star wars case"\n- Sanrio: include "sanrio phone case"\n- F1: include "f1 phone case"\n- Marvel: include "marvel phone case"\n- Nintendo: include "nintendo phone case"\n- Anime: include "anime phone case"\n- Kpop: include "kpop phone case"\n\nTAGS: exactly 3 tags, each strictly under 20 characters including spaces, no repeated keywords between tags\n\nDESCRIPTION: "When you choose this [Full Title], you\'re picking a design inspired by [niche], blending [energy] and bold [aesthetic] vibes. while keeping your device protected and stylish [2-3 emojis]"\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3';
  }
  return 'You are an Etsy SEO expert for phone cases. STRICT RULES:\n\nTITLE: [Niche] Phone Case [Simple Keywords] Cover\n- Always mention franchise for characters\n- Simple searchable keywords only, never fandom slang or song names\n\nBRAND TAGS - always include one of these when relevant:\n- Disney: include "disney phone case"\n- Ghibli: include "ghibli phone case"\n- Star Wars: include "star wars case"\n- Sanrio: include "sanrio phone case"\n- F1: include "f1 phone case"\n- Marvel: include "marvel phone case"\n- Nintendo: include "nintendo phone case"\n- Anime: include "anime phone case"\n- Kpop: include "kpop phone case"\n\nTAGS: exactly 4 tags, each strictly under 20 characters including spaces, no repeated keywords between tags\nTag 1: [niche] phone case\nTag 2: [franchise] case\nTag 3: [keyword] cover\nTag 4: [niche alone]\n\nDESCRIPTION: "Add a [adjective] touch to your phone with this [niche] phone case inspired by [franchise]. Perfect for fans of [style], [aesthetic], and [theme], this case gives your phone a [look] while helping protect it from everyday scratches and minor bumps. A lovely gift idea for [fan type] and anyone who enjoys [description] for iPhone, Samsung Galaxy, and Google Pixel models."\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4';
}

function getPosterPrompt(variation) {
  if (variation === '1') {
    return 'You are an Etsy SEO expert for art posters. Look at the image provided and generate a complete listing.\n\nSTRICT RULES:\n\nTITLE: comma-separated keywords describing what you see in the image. CRITICAL: must be EXACTLY 135-140 characters. Count every character. Keep adding descriptive keywords with commas until you reach 135-140 characters. Never submit a title under 130 characters.\n\nDESCRIPTION: Write 2-3 engaging sentences describing what you see in the poster image. Then "Perfect for [audiences who would love this], this poster adds [visual qualities] to any room." Then one more paragraph about the specific visual elements, colors, mood, and which rooms it suits. Then add EXACTLY this block:\n\nPoster Details\nPremium high-resolution print quality\n[describe the main subject from the image]-inspired artwork\n[one specific visual detail you see in the image]\nPerfect for bedrooms, gaming rooms, offices, home cinemas, and gallery walls\nPoster only - frame NOT included\n\nSizes Available\nMetric: 13x18 cm, 15x20 cm, 27x35 cm, 28x43 cm, A3 (29.7x42 cm), 30x40 cm, 30x45 cm, 40x50 cm, 40x60 cm, A2 (42x59.4 cm), 45x60 cm, 50x70 cm, A1 (59.4x84.1 cm), 60x80 cm, 60x90 cm, 70x100 cm, 75x100 cm\nInches: 5x7, 6x8, 11x14, 11x17, 12x16, 12x18, 16x20, 16x24, 18x24, 20x28, 24x32, 24x36, 28x40, 30x40\n\nPerfect Gift For\n[List 5-6 specific audience types based on what you see]\n\nDigital Download Option\nChoose digital download and receive a high-resolution printable file within 10 hours after purchase.\n\nShipping\nFree worldwide shipping on all physical poster orders.\n\nTAGS: exactly 13 natural keyword phrases describing the poster content\n\nIMPORTANT: Add relevant emojis throughout the description to make it more engaging.\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13';
  }
  return 'You are an Etsy SEO expert for art posters. Look at the image provided and generate a complete listing.\n\nSTRICT RULES:\n\nTITLE: CRITICAL: must be EXACTLY 135-140 characters. Keyword-rich, can use star symbols. Keep adding keywords until you reach 135-140 characters. Never submit under 130 characters.\n\nDESCRIPTION: Start with "Inspired by [what you see in the image], this premium poster features [detailed description of the visual elements, colors, composition, mood]." Then "[Final sentence about who it appeals to and what makes it striking]." Then add "Love [theme] wall art? Explore more in our shop!" Then add EXACTLY:\n\nFeatures and Craftsmanship\nDeluxe Matte Paper: Printed on premium 170 gsm matte stock with a smooth non-reflective finish for crisp detail and gallery-quality look\n[Aesthetic style you see in the image]: [describe the visual style, colors, details]\nEco-Friendly Production: Printed on demand using responsibly sourced high-quality materials\nSecure Packaging: Carefully rolled and shipped in a rigid protective tube\n\nAvailable Sizes\nMetric: 13x18 cm, 15x20 cm, 27x35 cm, 28x43 cm, A3 (29.7x42 cm), 30x40 cm, 30x45 cm, 40x50 cm, 40x60 cm, A2 (42x59.4 cm), 45x60 cm, 50x70 cm, A1 (59.4x84.1 cm), 60x80 cm, 60x90 cm, 70x100 cm, 75x100 cm\nInches: 5x7, 6x8, 11x14, 11x17, 12x16, 12x18, 16x20, 16x24, 18x24, 20x28, 24x33, 24x32, 24x36, 28x40, 30x40\nNeed a custom size? Message me anytime.\n\nPerfect For\nBedrooms, gaming rooms, movie rooms, offices, and entertainment spaces\nA gift for [specific fan types based on the image] enthusiasts\n\nShipping Info\nProcessing Time: Orders prepared and shipped within 1 business day\nWorldwide Shipping: Available to customers worldwide\nSecure Packaging: Rolled and shipped in a durable protective tube\nFrame not included.\n\nIMPORTANT: Add relevant emojis throughout the description to make it engaging.\n\nTAGS: exactly 13 natural keyword phrases based on what you see in the image\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13';
}
