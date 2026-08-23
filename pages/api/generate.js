export default async function handler(req, res) { // v2
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
  const sizes = 'Metric:\n13\u00d718 cm, 15\u00d720 cm, 27\u00d735 cm, 28\u00d743 cm, A3 (29.7\u00d742 cm), 30\u00d740 cm, 30\u00d745 cm, 40\u00d750 cm, 40\u00d760 cm, A2 (42\u00d759.4 cm), 45\u00d760 cm, 50\u00d770 cm, A1 (59.4\u00d784.1 cm), 60\u00d780 cm, 60\u00d790 cm, 70\u00d7100 cm, 75\u00d7100 cm\nInches:\n5\u00d77", 6\u00d78", 11\u00d714", 11\u00d717", 12\u00d716", 12\u00d718", 16\u00d720", 16\u00d724", 18\u00d724", 20\u00d728", 24\u00d732", 24\u00d736", 28\u00d740", 30\u00d740"';

  if (variation === '1') {
    return 'You are an Etsy SEO expert for art posters. Look at the image and generate a listing EXACTLY matching this format:\n\nTITLE RULES:\n- Comma-separated keywords describing the poster content\n- MUST be between 135-140 characters total — count carefully, keep adding keywords until you reach 135-140 chars\n- Format: "[Subject] Poster, [Franchise/Artist] Wall Art, [Style] Print, [Color/Theme] Decor, [Audience] Fan Gift, [Style] Artwork Print"\n- Example (139 chars): "Sade No Ordinary Love Poster, Sade Adu Wall Art, Soul R&B Music Print, Red Bedroom Decor, Singer Fan Gift, Vintage Album Artwork Print"\n\nDESCRIPTION FORMAT - follow this EXACTLY:\n\nFirst write 2 sentences describing the artwork and its mood.\nThen write: "Perfect for [specific audiences], this poster adds [3 qualities] to any room."\nThen write 2 sentences about specific visual details (colors, composition, style) and which rooms it suits.\nThen add EXACTLY this block with bullet points and proper emoji headers:\n\n\u2728 Poster Details\n\u2022 Premium high-resolution print quality\n\u2022 [Subject from image]-inspired artwork\n\u2022 [One specific visual detail from the image]\n\u2022 Perfect for bedrooms, gaming rooms, offices, home cinemas, and gallery walls\n\u2022 Poster only \u2014 frame NOT included\n\n\ud83d\udcd0 Sizes Available\n' + sizes + '\n\n\ud83c\udf81 Perfect Gift For\n[List 6-7 specific audience types based on the image content], and [final type].\n\n\ud83d\udcbe Digital Download Option\nChoose digital download and receive a high-resolution printable file within 10 hours after purchase.\n\n\ud83d\ude9a Shipping\nFree worldwide shipping on all physical poster orders.\n\nTAGS: exactly 13 natural keyword phrases describing the poster\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13';
  }

  return 'You are an Etsy SEO expert for art posters. Look at the image and generate a listing EXACTLY matching this format:\n\nTITLE RULES:\n- MUST be between 135-140 characters total — count carefully\n- Keyword-rich, can start with \u2b50 [Subject] \u2014 [Franchise] [Type] Poster \u2b50\n- Keep adding keywords until 135-140 chars\n\nDESCRIPTION FORMAT - follow this EXACTLY:\n\nStart: "Inspired by [what you see], this premium poster features [detailed visual description of composition, colors, mood, details]."\nThen: "[Sentence about who it appeals to and what makes it a statement piece]."\nThen: "\ud83d\udd25 Love [theme] wall art and iconic [style]? Explore more [related styles] posters in our shop \ud83d\udd25"\nThen add EXACTLY:\n\n\ud83d\udd24 Features & Craftsmanship\nDeluxe Matte Paper: Printed on premium 170 gsm (65 lb) matte stock with a smooth, non-reflective finish for crisp detail and a gallery-quality look\n[Aesthetic Name from image]: [Describe the visual style, color palette, composition details]\nEco-Friendly Production: Printed on demand using responsibly sourced, high-quality materials\nSecure Packaging: Carefully rolled and shipped in a rigid protective tube to arrive in perfect condition\n\n\ud83d\udcd0 Available Sizes\n' + sizes + '\nNeed a custom size? Message me anytime.\n\n\u2b50 Perfect For\nBedrooms, gaming rooms, movie rooms, offices, and entertainment spaces with a [theme] centerpiece\nInteriors inspired by [subject], [franchise/style], and [related themes]\nA gift for [fan type 1], [fan type 2], [fan type 3], and [theme] enthusiasts\n\n\ud83d\udce6 Shipping Info\nProcessing Time: Orders are prepared and shipped within 1 business day\nWorldwide Shipping: Available to customers worldwide\nSecure Packaging: Carefully rolled and shipped in a durable protective tube to arrive in excellent condition\nPlease Note: Frame not included.\n\n\u2b50 [Subject from image]. [3-word description]. [One powerful word]. [relevant emoji]\n\nTAGS: exactly 13 natural keyword phrases\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13';
}
