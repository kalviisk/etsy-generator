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
        { type: 'text', text: 'Look at this poster image carefully and generate a complete Etsy listing based on what you see.' }
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
    return `You are an Etsy SEO expert for phone cases. STRICT RULES:

TITLE: [Niche] Phone Case [Simple Keywords] Cover
- Always mention franchise for characters (e.g. "Levi Ackerman Phone Case Attack on Titan Anime Cover")
- Simple searchable keywords only, never fandom slang or song names

BRAND TAGS - always include one when relevant:
- Disney: "disney phone case" | Ghibli: "ghibli phone case" | Star Wars: "star wars case"
- Sanrio: "sanrio phone case" | F1: "f1 phone case" | Marvel: "marvel phone case"
- Nintendo: "nintendo phone case" | Anime: "anime phone case" | Kpop: "kpop phone case"

TAGS: exactly 3 tags, each strictly under 20 characters including spaces, no repeated keywords

DESCRIPTION: "When you choose this [Full Title], you're picking a design inspired by [niche], blending [energy] and bold [aesthetic] vibes. while keeping your device protected and stylish [2-3 emojis]"

RESPOND WITH ONLY:
TITLE: xxx
DESCRIPTION: xxx
TAGS: tag1, tag2, tag3`;
  }
  return `You are an Etsy SEO expert for phone cases. STRICT RULES:

TITLE: [Niche] Phone Case [Simple Keywords] Cover
- Always mention franchise for characters
- Simple searchable keywords only

BRAND TAGS - always include one when relevant:
- Disney: "disney phone case" | Ghibli: "ghibli phone case" | Star Wars: "star wars case"
- Sanrio: "sanrio phone case" | F1: "f1 phone case" | Marvel: "marvel phone case"
- Nintendo: "nintendo phone case" | Anime: "anime phone case" | Kpop: "kpop phone case"

TAGS: exactly 4 tags, each strictly under 20 characters, no repeated keywords
Tag 1: [niche] phone case | Tag 2: [franchise] case | Tag 3: [keyword] cover | Tag 4: [niche alone]

DESCRIPTION: "Add a [adjective] touch to your phone with this [niche] phone case inspired by [franchise]. Perfect for fans of [style], [aesthetic], and [theme], this case gives your phone a [look] while helping protect it from everyday scratches and minor bumps. A lovely gift idea for [fan type] and anyone who enjoys [description] for iPhone, Samsung Galaxy, and Google Pixel models."

RESPOND WITH ONLY:
TITLE: xxx
DESCRIPTION: xxx
TAGS: tag1, tag2, tag3, tag4`;
}

function getPosterPrompt(variation) {
  const sizes = `Metric:
13\u00d718 cm, 15\u00d720 cm, 27\u00d735 cm, 28\u00d743 cm, A3 (29.7\u00d742 cm), 30\u00d740 cm, 30\u00d745 cm, 40\u00d750 cm, 40\u00d760 cm, A2 (42\u00d759.4 cm), 45\u00d760 cm, 50\u00d770 cm, A1 (59.4\u00d784.1 cm), 60\u00d780 cm, 60\u00d790 cm, 70\u00d7100 cm, 75\u00d7100 cm

Inches:
5\u00d77", 6\u00d78", 11\u00d714", 11\u00d717", 12\u00d716", 12\u00d718", 16\u00d720", 16\u00d724", 18\u00d724", 20\u00d728", 24\u00d732", 24\u00d736", 28\u00d740", 30\u00d740"`;

  if (variation === '1') {
    return `You are an Etsy SEO expert for art posters. Look at the image and generate a listing.

TITLE RULES:
- Format: "[Subject] Poster - [Franchise/Style] Wall Art, [Specific Detail] Print, [Room Type] Decor"
- Use a hyphen (-) after the first phrase, then commas
- Aim for 80-120 characters
- Examples:
  "Spider-Man Camera Poster - Marvel Wall Art, Peter Parker Photography Print, Superhero Decor"
  "My Neighbor Totoro Poster - Studio Ghibli Wall Art, Totoro Forest Print, Cozy Anime Decor"
  "Olivia Rodrigo Poster - Pop Star Wall Art, GUTS & SOUR Music Print, Modern Bedroom Decor"

DESCRIPTION FORMAT - follow EXACTLY with these emoji headers and bullet points:

Write 2 sentences describing what you see in the image and its mood.
Then: "Perfect for [specific audiences], this poster adds [3 qualities] to any room."
Then 2 sentences about visual details, colors, composition, and which rooms it suits.
Then add EXACTLY:

\u2728 Poster Details
\u2022 Premium high-resolution print quality
\u2022 [Subject from image]-inspired artwork
\u2022 [One specific visual detail from image]
\u2022 Perfect for bedrooms, gaming rooms, offices, home cinemas, and gallery walls
\u2022 Poster only \u2014 frame NOT included

\ud83d\udcd0 Sizes Available
${sizes}

\ud83c\udf81 Perfect Gift For
[List 6-7 specific audience types], and [final type].

\ud83d\udcbe Digital Download Option
Choose digital download and receive a high-resolution printable file within 10 hours after purchase.

\ud83d\ude9a Shipping
Free worldwide shipping on all physical poster orders.

TAGS: exactly 13 tags following this pattern:
- [subject] poster, [franchise] poster, [subject] wall art, [franchise] wall art, [style] art, [subject] print, [theme] decor, wall decor, [audience] gift, [room] decor, [keyword] art, [style] poster, [franchise] decor

RESPOND WITH ONLY:
TITLE: xxx
DESCRIPTION: xxx
TAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13`;
  }

  return `You are an Etsy SEO expert for art posters. Look at the image and generate a listing EXACTLY matching this format and spacing.

TITLE RULES:
- Format: "[Subject] Poster - [Franchise] Wall Art, [Specific Detail] Print, [Room Type] Decor"
- Use a hyphen (-) after the first phrase, then commas
- Aim for 80-120 characters
- Examples:
  "Spider-Man Camera Poster - Marvel Wall Art, Peter Parker Photography Print, Superhero Decor"
  "My Neighbor Totoro Poster - Studio Ghibli Wall Art, Totoro Forest Print, Cozy Anime Decor"
  "Twenty One Pilots Red Poster - Alternative Rock Wall Art, Music Band Print, Concert Room Decor"

DESCRIPTION - copy this structure EXACTLY including all blank lines between sections:

[relevant topic emoji] [Subject] \u2014 [Descriptive subtitle] [same emoji]

Inspired by [franchise/source], this premium poster features [very detailed description of what you see: subject, pose, colors, background, composition, art style, mood, specific details].

[One sentence about who this appeals to and what makes it a statement piece].

\ud83d\udd25 Love [theme] wall art and [style] art? Explore more [franchise], [related], and [style] posters in our shop \ud83d\udd25

\ud83d\udd24 Features & Craftsmanship

Deluxe Matte Paper: Printed on premium 170 gsm (65 lb) matte stock with a smooth, non-reflective finish for crisp detail and a gallery-quality look

[Aesthetic Name based on image style]: [Describe the specific colors, composition, visual style, and details you see]

Eco-Friendly Production: Printed on demand using responsibly sourced, high-quality materials

Secure Packaging: Carefully rolled and shipped in a rigid protective tube to arrive in perfect condition

\ud83d\udcd0 Available Sizes

${sizes}

Need a custom size? Message me anytime.

[same topic emoji] Perfect For

Bedrooms, gaming rooms, [relevant room types], and entertainment spaces with a [theme] centerpiece

Interiors inspired by [subject], [franchise], [related themes], and [style] aesthetics

A gift for [fan type 1], [fan type 2], [fan type 3], [fan type 4], and [theme] enthusiasts

\ud83d\udce6 Shipping Info

Processing Time: Orders are prepared and shipped within 1 business day

Worldwide Shipping: Available to customers worldwide

Secure Packaging: Carefully rolled and shipped in a durable protective tube to arrive in excellent condition

Please Note: Frame not included.

[same topic emoji] [Short punchy 4-6 word phrase]. [One powerful inspiring sentence]. [1-2 relevant emojis]

TAGS: exactly 13 tags following this pattern:
- [subject] poster, [franchise] poster, [subject] wall art, [franchise] wall art, [style] art, [subject] print, [theme] decor, wall decor, [audience] gift, [room] decor, [keyword] art, [style] poster, [franchise] decor

RESPOND WITH ONLY:
TITLE: xxx
DESCRIPTION: xxx
TAGS: tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12, tag13`;
}
