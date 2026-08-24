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
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: 'Look at this poster image carefully and generate a complete Etsy listing for it based on what you see.' }
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
        model: 'claude-sonnet-4-6',
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
    let titleMatch = text.match(/TITLE:\s*(.+)/);
    const descMatch = text.match(/DESCRIPTION:\s*([\s\S]+?)(?=\nTAGS:|$)/);
    const tagsMatch = text.match(/TAGS:\s*([\s\S]+)/);

    let title = titleMatch ? titleMatch[1].trim() : '';

    // If poster title is too short, retry
    if (type === 'poster' && title.length < 130) {
      const retryResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: 'This Etsy poster title is only ' + title.length + ' characters: "' + title + '". It MUST be 135-140 characters. Add more comma-separated keyword phrases at the end like "[Color] Wall Decor, [Style] Art Print, [Room] Poster Art, [Audience] Gift" until it reaches 135-140 characters. Reply with ONLY the new complete title, nothing else.'
          }]
        })
      });
      const retryData = await retryResponse.json();
      if (retryData.content && retryData.content[0]) {
        const newTitle = retryData.content[0].text.trim().replace(/^["']|["']$/g, '');
        if (newTitle.length >= 130) title = newTitle.slice(0, 140);
      }
    }

    // Enforce 20 char tag limit, keep exactly 13
    let tags = tagsMatch ? tagsMatch[1].trim() : '';
    let tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0 && t.length <= 20);
    // Truncate tags that are slightly over 20 chars instead of removing them
    let allTags = tags.split(',').map(t => {
      const trimmed = t.trim();
      return trimmed.length <= 20 ? trimmed : trimmed.slice(0, 20).trim();
    }).filter(t => t.length > 0);
    tags = allTags.slice(0, 13).join(', ');

    return res.status(200).json({ title, description: descMatch ? descMatch[1].trim() : '', tags });

  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed: ' + err.message });
  }
}

function getPhonePrompt(variation) {
  const brandTags = 'BRAND TAGS - always include one when relevant:\n- Disney: "disney phone case" | Ghibli: "ghibli phone case" | Star Wars: "star wars case"\n- Sanrio: "sanrio phone case" | F1: "f1 phone case" | Marvel: "marvel phone case"\n- Nintendo: "nintendo phone case" | Anime: "anime phone case" | Kpop: "kpop phone case"';

  if (variation === '1') {
    return 'You are an Etsy SEO expert for phone cases.\n\nTITLE: [Niche] Phone Case [Simple Keywords] Cover\n- Always mention franchise for characters (e.g. "Levi Ackerman Phone Case Attack on Titan Anime Cover")\n- Simple searchable keywords only\n\n' + brandTags + '\n\nTAGS: exactly 3 tags, each STRICTLY under 20 characters including spaces, no repeated keywords\n\nDESCRIPTION: "When you choose this [Full Title], you\'re picking a design inspired by [niche], blending [energy] and bold [aesthetic] vibes. while keeping your device protected and stylish [2-3 emojis]"\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3';
  }
  return 'You are an Etsy SEO expert for phone cases.\n\nTITLE: [Niche] Phone Case [Simple Keywords] Cover\n- Always mention franchise for characters\n- Simple searchable keywords only\n\n' + brandTags + '\n\nTAGS: exactly 4 tags, each STRICTLY under 20 characters including spaces, no repeated keywords\nTag 1: [niche] phone case | Tag 2: [franchise] case | Tag 3: [keyword] cover | Tag 4: [niche alone]\n\nDESCRIPTION: "Add a [adjective] touch to your phone with this [niche] phone case inspired by [franchise]. Perfect for fans of [style], [aesthetic], and [theme], this case gives your phone a [look] while helping protect it from everyday scratches and minor bumps. A lovely gift idea for [fan type] and anyone who enjoys [description] for iPhone, Samsung Galaxy, and Google Pixel models."\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4';
}

function getPosterPrompt(variation) {
  const sizes = 'Metric:\n13\u00d718 cm, 15\u00d720 cm, 27\u00d735 cm, 28\u00d743 cm, A3 (29.7\u00d742 cm), 30\u00d740 cm, 30\u00d745 cm, 40\u00d750 cm, 40\u00d760 cm, A2 (42\u00d759.4 cm), 45\u00d760 cm, 50\u00d770 cm, A1 (59.4\u00d784.1 cm), 60\u00d780 cm, 60\u00d790 cm, 70\u00d7100 cm, 75\u00d7100 cm\nInches:\n5\u00d77", 6\u00d78", 11\u00d714", 11\u00d717", 12\u00d716", 12\u00d718", 16\u00d720", 16\u00d724", 18\u00d724", 20\u00d728", 24\u00d732", 24\u00d736", 28\u00d740", 30\u00d740"';

  const titleRules = 'TITLE RULES - CRITICAL:\n- Comma-separated keywords, NO hyphens\n- MUST be 135-140 characters — count every character and keep adding keywords until you reach 135-140\n- Good example (139 chars): "Rip Curl Surfing Poster, Billabong Wave Wall Art, Vintage Surf Magazine Print, Beach House Decor, Surfer Gift, Coastal Bedroom Art"\n- Good example (138 chars): "Sade No Ordinary Love Poster, Sade Adu Wall Art, Soul R&B Music Print, Red Bedroom Decor, Singer Fan Gift, Vintage Album Artwork Print"\n- If under 130 chars, KEEP ADDING keyword phrases until 135-140';

  const tagRules = 'TAGS - CRITICAL RULES:\n- Exactly 13 tags\n- Each tag STRICTLY under 20 characters including spaces\n- NEVER repeat the same keyword across tags\n- Mix search intents: subject name, franchise/artist, art style, room type, color/mood, audience type, print type\n- Good example (anime poster): "apothecary diaries, maomao poster, anime wall art, botanical anime art, palace mystery art, manga room decor, oriental wall art, historical anime, apothecary decor, tea room poster, anime fan gift, maomao wall art, elegant anime print"\n- BAD: repeating subject 3+ times like "little prince poster, little prince print, little prince decor"\n- Each tag = different buyer search';

  if (variation === '1') {
    return 'You are an Etsy SEO expert for art posters. Look at the image and generate a listing.\n\n' + titleRules + '\n\nDESCRIPTION FORMAT - follow EXACTLY:\n\nWrite 2 sentences describing the artwork and mood.\nThen: "Perfect for [specific audiences], this poster adds [3 qualities] to any room."\nThen 2 sentences about visual details, colors, composition, and room placement.\nThen add EXACTLY:\n\n\u2728 Poster Details\n\u2022 Premium high-resolution print quality\n\u2022 [Subject from image]-inspired artwork\n\u2022 [One specific visual detail from image]\n\u2022 Perfect for bedrooms, gaming rooms, offices, home cinemas, and gallery walls\n\u2022 Poster only \u2014 frame NOT included\n\n\ud83d\udcd0 Sizes Available\n' + sizes + '\n\n\ud83c\udf81 Perfect Gift For\n[List 6-7 specific audience types], and [final type].\n\n\ud83d\udcbe Digital Download Option\nChoose digital download and receive a high-resolution printable file within 10 hours after purchase.\n\n\ud83d\ude9a Shipping\nFree worldwide shipping on all physical poster orders.\n\n' + tagRules + '\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13';
  }

  return 'You are an Etsy SEO expert for art posters. Look at the image and generate a listing.\n\n' + titleRules + '\n\nDESCRIPTION FORMAT - follow EXACTLY:\n\nStart: "Inspired by [what you see], this premium poster features [detailed visual description of composition, colors, mood]."\nThen: "[Sentence about who it appeals to and what makes it a statement piece]."\nThen: "\ud83d\udd25 Love [theme] wall art? Explore more in our shop \ud83d\udd25"\nThen add EXACTLY:\n\n\ud83d\udd24 Features & Craftsmanship\nDeluxe Matte Paper: Printed on premium 170 gsm (65 lb) matte stock with a smooth, non-reflective finish for crisp detail and a gallery-quality look\n[Aesthetic Name]: [Describe visual style, color palette, composition]\nEco-Friendly Production: Printed on demand using responsibly sourced, high-quality materials\nSecure Packaging: Carefully rolled and shipped in a rigid protective tube to arrive in perfect condition\n\n\ud83d\udcd0 Available Sizes\n' + sizes + '\nNeed a custom size? Message me anytime.\n\n\u2b50 Perfect For\nBedrooms, gaming rooms, movie rooms, offices, and entertainment spaces\nInteriors inspired by [subject], [franchise/style], and [related themes]\nA gift for [fan type 1], [fan type 2], and [theme] enthusiasts\n\n\ud83d\udce6 Shipping Info\nProcessing Time: Orders are prepared and shipped within 1 business day\nWorldwide Shipping: Available to customers worldwide\nSecure Packaging: Carefully rolled and shipped in a durable protective tube\nPlease Note: Frame not included.\n\n\u2b50 [Subject]. [3-word description]. [One word]. [emoji]\n\n' + tagRules + '\n\nRESPOND WITH ONLY:\nTITLE: xxx\nDESCRIPTION: xxx\nTAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13';
}
