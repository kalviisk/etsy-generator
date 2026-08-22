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
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Generate a listing for: ' + niche }]
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
    return 'You are an expert Etsy SEO listing generator for phone cases. Generate optimized listings following these STRICT rules:\n\nTITLE FORMAT: [Niche] Phone Case [Simple Keywords] Cover\n- Keywords must be SIMPLE and DEFAULT\n- Always mention the franchise/show/game when listing a character\n- NEVER use song names, album names, lore terms, fandom slang\n\nBRAND TAG RULES:\n- Disney → always include "disney phone case"\n- Ghibli → always include "ghibli phone case"\n- Star Wars → always include "star wars case"\n- Sanrio → always include "sanrio phone case"\n- F1 → always include "f1 phone case"\n- Marvel → always include "marvel phone case"\n- Nintendo → always include "nintendo phone case"\n- Anime → include "anime phone case"\n- Kpop → include "kpop phone case"\n\nTAG RULES:\n- Every tag STRICTLY under 20 characters including spaces\n- NEVER repeat the same keyword across tags\n\n' + (variation === '1' ? 'VARIATION A — 3 TAGS:\nDESCRIPTION: "When you choose this [Full Title], you\'re picking a design inspired by [niche], blending [energy] and bold [aesthetic] vibes. while keeping your device protected and stylish [2-3 emojis]"\nTAGS: exactly 3, each under 20 chars\n\nOUTPUT FORMAT (respond with ONLY this):\nTITLE: [title]\nDESCRIPTION: [description]\nTAGS: [tag1], [tag2], [tag3]' : 'VARIATION B — 4 TAGS:\nDESCRIPTION: "Add a [adjective] touch to your phone with this [niche] phone case inspired by [franchise]. Perfect for fans of [style], [aesthetic], and [theme], this case gives your phone a [look] while helping protect it from everyday scratches and minor bumps. A lovely gift idea for [fan type], [fan type], and anyone who enjoys [description] for iPhone, Samsung Galaxy, and Google Pixel models."\nTAGS: exactly 4, each under 20 chars\n\nOUTPUT FORMAT (respond with ONLY this):\nTITLE: [title]\nDESCRIPTION: [description]\nTAGS: [tag1], [tag2], [tag3], [tag4]');
  } else {
    return 'You are an expert Etsy SEO listing generator for art posters.\n\n' + (variation === '1' ? 'VARIATION A:\nTITLE: keyword-dense, comma-separated, MUST be 135-140 characters. Keep adding keywords until you hit 135-140 chars.\nDESCRIPTION: engaging opening 2-3 sentences, then "Perfect for..." sentence, then visual details, then include EXACTLY:\n\n✨ Poster Details\n• Premium high-resolution print quality\n• [Niche]-inspired artwork\n• [Specific visual detail]\n• Perfect for bedrooms, gaming rooms, offices, home cinemas, and gallery walls\n• Poster only — frame NOT included\n\n📐 Sizes Available\nMetric:\n13×18 cm, 15×20 cm, 27×35 cm, 28×43 cm, A3 (29.7×42 cm), 30×40 cm, 30×45 cm, 40×50 cm, 40×60 cm, A2 (42×59.4 cm), 45×60 cm, 50×70 cm, A1 (59.4×84.1 cm), 60×80 cm, 60×90 cm, 70×100 cm, 75×100 cm\nInches:\n5×7", 6×8", 11×14", 11×17", 12×16", 12×18", 16×20", 16×24", 18×24", 20×28", 24×32", 24×36", 28×40", 30×40"\n\n🎁 Perfect Gift For\n[5-6 audience types]\n\n💾 Digital Download Option\nChoose digital download and receive a high-resolution printable file within 10 hours after purchase.\n\n🚚 Shipping\nFree worldwide shipping on all physical poster orders.\n\nTAGS: exactly 13 natural keyword phrases\n\nOUTPUT FORMAT (respond with ONLY this):\nTITLE: [title]\nDESCRIPTION: [description]\nTAGS: [tag1], [tag2], [tag3], [tag4], [tag5], [tag6], [tag7], [tag8], [tag9], [tag10], [tag11], [tag12], [tag13]' : 'VARIATION B:\nTITLE: 135-140 characters, can use ⭐ stars, keyword-rich\nDESCRIPTION: "Inspired by [franchise], this premium poster features [detailed description]." then "🔥 Love [theme] wall art? Explore more in our shop 🔥" then EXACTLY:\n\n🖤 Features & Craftsmanship\nDeluxe Matte Paper: Printed on premium 170 gsm (65 lb) matte stock with a smooth, non-reflective finish for crisp detail and a gallery-quality look\n[Aesthetic Name]: [visual style description]\nEco-Friendly Production: Printed on demand using responsibly sourced, high-quality materials\nSecure Packaging: Carefully rolled and shipped in a rigid protective tube to arrive in perfect condition\n\n📏 Available Sizes\nMetric:\n13×18 cm, 15×20 cm, 27×35 cm, 28×43 cm, A3 (29.7×42 cm), 30×40 cm, 30×45 cm, 40×50 cm, 40×60 cm, A2 (42×59.4 cm), 45×60 cm, 50×70 cm, A1 (59.4×84.1 cm), 60×80 cm, 60×90 cm, 70×100 cm, 75×100 cm\nInches:\n5×7", 6×8", 11×14", 11×17", 12×16", 12×18", 16×20", 16×24", 18×24", 20×28", 24×33", 24×32", 24×36", 28×40", 30×40"\nNeed a custom size? Message me anytime.\n\n⭐ Perfect For\nBedrooms, gaming rooms, movie rooms, offices, and entertainment spaces\nA gift for [fan type], [fan type], and [theme] enthusiasts\n\n📦 Shipping Info\nProcessing Time: Orders are prepared and shipped within 1 business day\nWorldwide Shipping: Available to customers worldwide\nSecure Packaging: Carefully rolled and shipped in a durable protective tube\nPlease Note: Frame not included.\n\n⭐ [Character]. [Short description]. [emoji]\n\nTAGS: exactly 13 natural keyword phrases\n\nOUTPUT FORMAT (respond with ONLY this):\nTITLE: [title]\nDESCRIPTION: [description]\nTAGS: [tag1], [tag2], [tag3], [tag4], [tag5], [tag6], [tag7], [tag8], [tag9], [tag10], [tag11], [tag12], [tag13]');
  }
}
