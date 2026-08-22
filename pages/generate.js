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
        model: 'claude-haiku-4-5-20251001',
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

${variation === '1' ? `VARIATION A — 3 TAGS:
DESCRIPTION: "When you choose this [Full Title], you're picking a design inspired by [niche], blending [energy] and bold [aesthetic] vibes. while keeping your device protected and stylish [2-3 emojis]"
TAGS: exactly 3, each under 20 chars`
: `VARIATION B — 4 TAGS:
DESCRIPTION: "Add a [adjective] touch to your phone with this [niche] phone case inspired by [franchise]. Perfect for fans of [style], [aesthetic], and [theme], this case gives your phone a [look] while helping protect it from everyday scratches and minor bumps. A lovely gift idea for [fan type], [fan type], and anyone who enjoys [description] for iPhone, Samsung Galaxy, and Google Pixel models."
TAGS: exactly 4, each under 20 chars`}

OUTPUT FORMAT (respond with ONLY this):
TITLE: [title here]
DESCRIPTION: [description here]
TAGS: [tag1], [tag2], [tag3]${variation === '2' ? ', [tag4]' : ''}`;
  } else {
    return `You are an expert Etsy SEO listing generator for art posters.

${variation === '1' ? `VARIATION A:
TITLE: keyword-dense, comma-separated, MUST be 135-140 characters exactly. Keep adding keywords until you hit 135-140 chars.
DESCRIPTION: engaging opening 2-3 sentences, then "Perfect for..." sentence, then visual details paragraph, then:

✨ Poster Details
• Premium high-resolution print quality
• [Niche]-inspired artwork
• [Specific visual detail]
• Perfect for bedrooms, gaming rooms, offices, home cinemas, and gallery walls
• Poster only — frame NOT included

📐 Sizes Available
Metric:
13×18 cm, 15×20 cm, 27×35 cm, 28×43 cm, A3 (29.7×42 cm), 30×40 cm, 30×45 cm, 40×50 cm, 40×60 cm, A2 (42×59.4 cm), 45×60 cm, 50×70 cm, A1 (59.4×84.1 cm), 60×80 cm, 60×90 cm, 70×100 cm, 75×100 cm
Inches:
5×7", 6×8", 11×14", 11×17", 12×16", 12×18", 16×20", 16×24", 18×24", 20×28", 24×32", 24×36", 28×40", 30×40"

🎁 Perfect Gift For
[5-6 audience types]

💾 Digital Download Option
Choose digital download and receive a high-resolution printable file within 10 hours after purchase.

🚚 Shipping
Free worldwide shipping on all physical poster orders.

TAGS: exactly 13 natural keyword phrases`
: `VARIATION B:
TITLE: 135-140 characters, can use ⭐ decorative stars, keyword-rich
DESCRIPTION: "Inspired by [franchise], this premium poster features [detailed description]." then shop promo line, then:

🖤 Features & Craftsmanship
Deluxe Matte Paper: Printed on premium 170 gsm (65 lb) matte stock with a smooth, non-reflective finish for crisp detail and a gallery-quality look
[Aesthetic Name]: [visual style description]
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

⭐ [Character]. [Short description]. [One word]. [emoji]

TAGS: exactly 13 natural keyword phrases`}

OUTPUT FORMAT (respond with ONLY this):
TITLE: [title here]
DESCRIPTION: [description here]
TAGS: [tag1], [tag2], [tag3], [tag4], [tag5], [tag6], [tag7], [tag8], [tag9], [tag10], [tag11], [tag12], [tag13]`;
  }
}
