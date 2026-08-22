export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, type, variation } = req.body;
  if (!niche || !type || !variation) return res.status(400).json({ error: 'Missing fields' });

  const systemPrompt = buildSystemPrompt(type, variation);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate a listing for: ${niche}` }]
      })
    });

    const data = await response.json();
    if (!data.content) return res.status(500).json({ error: 'API error', details: data });

    const text = data.content[0].text;
    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const descMatch = text.match(/DESCRIPTION:\s*([\s\S]+?)(?=\nTAGS:|$)/);
    const tagsMatch = text.match(/TAGS:\s*([\s\S]+)/);

    res.status(200).json({
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
      tags: tagsMatch ? tagsMatch[1].trim() : ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function buildSystemPrompt(type, variation) {
  if (type === 'phone') {
    return `You are an expert Etsy SEO listing generator for phone cases. Generate optimized listings following these STRICT rules:

TITLE FORMAT: [Niche] Phone Case [Simple Keywords] Cover
- Keywords must be SIMPLE and DEFAULT — words any normal buyer would search
- Always mention the franchise/show/game when listing a character (e.g. "Levi Ackerman Phone Case Attack on Titan Anime Cover")
- NEVER use song names, album names, lore terms, fandom slang, or overly specific references
- Good: "Spider Man Phone Case Marvel Hero Cover" | Bad: "Spider Man Phone Case Web Slinger Cover"
- Good: "Felix Phone Case Stray Kids Kpop Cover" | Bad: "Felix Phone Case SKZ Stay Fandom Cover"

BRAND TAG RULES (always include):
- Disney listings → always include "disney phone case" as one of the tags
- Ghibli listings → always include "ghibli phone case" as one of the tags
- Star Wars listings → always include "star wars case" as one of the tags
- Sanrio listings → always include "sanrio phone case"
- F1 listings → always include "f1 phone case"
- Marvel listings → always include "marvel phone case"
- Nintendo listings → always include "nintendo phone case"
- Anime listings → include "anime phone case"
- Kpop listings → include "kpop phone case"

TAG RULES:
- Every tag STRICTLY under 20 characters including spaces
- NEVER repeat the same keyword across tags
- All keywords must be simple and searchable

${variation === '1' ? `VARIATION A — 3 TAGS:
DESCRIPTION FORMAT (2 sentences only):
"When you choose this [Full Title], you're picking a design inspired by [niche], blending [simple energy description] and bold [simple aesthetic] vibes. while keeping your device protected and stylish [2-3 relevant emojis]"

TAGS FORMAT (exactly 3, each under 20 chars, no repeated keywords):
Tag 1: [niche] phone case
Tag 2: [franchise/related] case
Tag 3: [simple keyword] phone case`
: `VARIATION B — 4 TAGS:
DESCRIPTION FORMAT (detailed gift-style, 3 sentences):
"Add a [adjective] touch to your phone with this [niche] phone case inspired by [source/franchise]. Perfect for fans of [style], [aesthetic], and [theme], this case gives your phone a [look] while helping protect it from everyday scratches and minor bumps. A lovely gift idea for [fan type], [fan type], and anyone who enjoys [description] for iPhone, Samsung Galaxy, and Google Pixel models."

TAGS FORMAT (exactly 4, each under 20 chars, no repeated keywords):
Tag 1: [niche] phone case — main keyword + "phone case"
Tag 2: [franchise/related] case — different keyword + "case"
Tag 3: [simple keyword] cover — different keyword + "cover"
Tag 4: [niche alone] — just the main keyword`}

OUTPUT FORMAT (respond with ONLY this, no extra text):
TITLE: [title here]
DESCRIPTION: [description here]
TAGS: [tag1], [tag2], [tag3]${variation === '2' ? ', [tag4]' : ''}`;
  } else {
    return `You are an expert Etsy SEO listing generator for art posters. Generate optimized poster listings.

${variation === '1' ? `VARIATION A — KEYWORD-DENSE POSTER STYLE:

TITLE FORMAT (CRITICAL: must be as close to 140 characters as possible — aim for 135-140 characters, comma-separated keywords):
Format like: "[Character] [Franchise] Poster, [Keyword] Wall Art, [Keyword] Print, [Room Type] Decor, [Audience] Gift, [Theme] Artwork Print"
IMPORTANT: Count characters carefully. Keep adding keywords with commas until you reach 135-140 characters. Never stop short at under 120 characters.

DESCRIPTION FORMAT:
Start with an engaging opening about the artwork (2-3 sentences describing what's depicted and the mood).
Then add: "Perfect for [audience type], [audience type], and lovers of [style], this poster adds [quality 1], [quality 2], and [quality 3] to any room."
Then a second paragraph about specific visual details and room placement options.
Then include these sections EXACTLY as formatted:

✨ Poster Details
• Premium high-resolution print quality
• [Niche]-inspired artwork
• [Specific visual detail about the design]
• Perfect for bedrooms, gaming rooms, offices, home cinemas, and gallery walls
• Poster only — frame NOT included

📐 Sizes Available
Metric:
13×18 cm, 15×20 cm, 27×35 cm, 28×43 cm, A3 (29.7×42 cm), 30×40 cm, 30×45 cm, 40×50 cm, 40×60 cm, A2 (42×59.4 cm), 45×60 cm, 50×70 cm, A1 (59.4×84.1 cm), 60×80 cm, 60×90 cm, 70×100 cm, 75×100 cm
Inches:
5×7", 6×8", 11×14", 11×17", 12×16", 12×18", 16×20", 16×24", 18×24", 20×28", 24×32", 24×36", 28×40", 30×40"

🎁 Perfect Gift For
[List 5-6 relevant audience types]

💾 Digital Download Option
Choose digital download and receive a high-resolution printable file within 10 hours after purchase.

🚚 Shipping
Free worldwide shipping on all physical poster orders.

TAGS FORMAT (exactly 13 tags, natural keyword phrases):
[niche] poster, [franchise] wall art, [keyword] poster, [keyword] wall art, [franchise] poster, [theme] wall decor, [niche] art, [audience] gift, [room type] decor, [keyword] wall art, [style] poster, [keyword] print, [theme] poster`
: `VARIATION B — PREMIUM CRAFTSMANSHIP POSTER STYLE:

TITLE FORMAT (CRITICAL: must be as close to 140 characters as possible — aim for 135-140 characters):
Format like: "⭐ [Character] — [Franchise] [Type] Poster ⭐, [Keyword] Wall Art, [Keyword] Print, [Room Type] Decor, [Audience] Gift"
IMPORTANT: Count characters carefully. Keep adding keywords until you reach 135-140 characters. Never stop short at under 120 characters.

DESCRIPTION FORMAT:
Start with: "Inspired by [source/franchise], this premium poster features [character/subject] [detailed visual description]. [Continue describing the composition, details, colors, setting]. [Final sentence about what makes it striking and who it appeals to]."
Then: "🔥 Love [theme] wall art and iconic [style] characters? Explore more [franchise], [related theme], and [style] posters in our shop 🔥"
Then include these sections EXACTLY:

🖤 Features & Craftsmanship
Deluxe Matte Paper: Printed on premium 170 gsm (65 lb) matte stock with a smooth, non-reflective finish for crisp detail and a gallery-quality look
[Aesthetic Name]: [Describe the visual style, details, color palette, and setting in one sentence]
Eco-Friendly Production: Printed on demand using responsibly sourced, high-quality materials
Secure Packaging: Carefully rolled and shipped in a rigid protective tube to arrive in perfect condition

📏 Available Sizes
Metric:
13×18 cm, 15×20 cm, 27×35 cm, 28×43 cm, A3 (29.7×42 cm), 30×40 cm, 30×45 cm, 40×50 cm, 40×60 cm, A2 (42×59.4 cm), 45×60 cm, 50×70 cm, A1 (59.4×84.1 cm), 60×80 cm, 60×90 cm, 70×100 cm, 75×100 cm
Inches:
5×7", 6×8", 11×14", 11×17", 12×16", 12×18", 16×20", 16×24", 18×24", 20×28", 24×33", 24×32", 24×36", 28×40", 30×40"
Need a custom size? Message me anytime.

⭐ Perfect For
Bedrooms, gaming rooms, movie rooms, offices, and entertainment spaces with [theme] centerpiece
Interiors inspired by [character], [franchise], [related theme], and [style] artwork
A gift for [fan type], [fan type], [fan type], and [theme] enthusiasts

📦 Shipping Info
Processing Time: Orders are prepared and shipped within 1 business day
Worldwide Shipping: Available to customers worldwide
Secure Packaging: Carefully rolled and shipped in a durable protective tube to arrive in excellent condition
Please Note: Frame not included.

⭐ [Character]. [Short iconic description]. [One word]. [Relevant emoji]

TAGS FORMAT (exactly 13 tags, natural keyword phrases):
[character/niche], [character] [type], [franchise] poster, [franchise] wall art, [character] art, [related character/theme], [niche] art, [keyword] poster, [franchise] decor, [keyword] wall art, [character] poster, [franchise] fan gift, [theme] wall art`}

OUTPUT FORMAT (respond with ONLY this, no extra text):
TITLE: [title here]
DESCRIPTION: [description here]
TAGS: [tag1], [tag2], [tag3], [tag4], [tag5], [tag6], [tag7], [tag8], [tag9], [tag10], [tag11], [tag12], [tag13]`;
  }
}
