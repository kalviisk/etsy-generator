import { useState, useRef } from 'react';

export default function Home() {
  const [type, setType] = useState('phone');
  const [variation, setVariation] = useState('1');
  const [niche, setNiche] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState({});
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const varDescriptions = {
    phone: {
      '1': '10 phone model tags + 3 niche tags • Type niche',
      '2': '10 phone model tags + 3 niche tags • Upload image'
    },
    poster: {
      '1': '13 tags • Keyword-dense title • Full poster details',
      '2': '13 tags • Premium craftsmanship description'
    }
  };

  const needsImage = (type === 'poster') || (type === 'phone' && variation === '2');
  const needsText = type === 'phone' && variation === '1';

  const handleFile = (file) => {
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const generate = async () => {
    if (needsText && !niche.trim()) return;
    if (needsImage && !image) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let body;
      if (needsImage) {
        const base64 = await toBase64(image);
        body = JSON.stringify({ type, variation, imageBase64: base64, mediaType: image.type || 'image/jpeg' });
      } else {
        body = JSON.stringify({ niche: niche.trim(), type, variation });
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyField = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const text = `TITLE:\n${result.title}\n\nDESCRIPTION:\n${result.description}\n\nTAGS:\n${result.tags}`;
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, all: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, all: false })), 2000);
  };

  const charCount = result?.title?.length || 0;
  const charColor = charCount > 140 ? '#e65100' : (charCount >= 130 ? '#388e3c' : '#aaa');

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.h1}>Etsy Listing Generator</h1>
        <p style={s.subtitle}>Generate optimized titles, descriptions and tags instantly</p>

        <div style={s.card}>
          <div style={s.label}>Product Type</div>
          <div style={s.tabs}>
            {['phone', 'poster'].map(t => (
              <div key={t} style={{ ...s.tab, ...(type === t ? s.tabOn : {}) }}
                onClick={() => { setType(t); setVariation('1'); setResult(null); setImage(null); setImagePreview(null); setNiche(''); }}>
                {t === 'phone' ? '📱 Phone Case' : '🖼️ Poster'}
              </div>
            ))}
          </div>

          <div style={s.label}>Variation</div>
          <div style={s.tabs}>
            {['1', '2'].map(v => (
              <div key={v} style={{ ...s.varTab, ...(variation === v ? s.varTabOn : {}) }}
                onClick={() => { setVariation(v); setResult(null); setImage(null); setImagePreview(null); }}>
                Variation {v === '1' ? 'A' : 'B'}
              </div>
            ))}
          </div>
          <div style={s.varDesc}>{varDescriptions[type][variation]}</div>

          {needsText && (
            <>
              <div style={s.label}>Niche / Topic</div>
              <div style={s.row}>
                <input type="text" value={niche} onChange={e => setNiche(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generate()}
                  placeholder="e.g. Stitch, LOTR, Lando Norris..."
                  style={s.input} />
                <button onClick={generate} disabled={loading}
                  style={{ ...s.btn, ...(loading ? s.btnOff : {}) }}>
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </>
          )}

          {needsImage && (
            <>
              <div style={s.label}>{type === 'phone' ? 'Phone Case Image' : 'Poster Image'}</div>
              <input type="file" accept="image/*" ref={fileRef}
                onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
              <div
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}) }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" style={s.preview} />
                ) : (
                  <div style={s.dropText}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                    <div>Click or drag & drop image here</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>JPG, PNG, WEBP supported</div>
                  </div>
                )}
              </div>
              <div style={s.row}>
                {image && <div style={{ flex: 1, fontSize: '13px', color: '#666' }}>{image.name}</div>}
                <button onClick={generate} disabled={loading || !image}
                  style={{ ...s.btn, ...(!image || loading ? s.btnOff : {}), marginLeft: 'auto' }}>
                  {loading ? 'Analyzing...' : 'Generate'}
                </button>
              </div>
            </>
          )}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {result && (
          <div style={s.card}>
            {[
              { key: 'title', label: 'Title', value: result.title },
              { key: 'description', label: 'Description', value: result.description },
              { key: 'tags', label: 'Tags', value: result.tags }
            ].map(({ key, label, value }) => (
              <div key={key} style={s.outSection}>
                <div style={s.outLabel}>
                  <span>{label}</span>
                  <button onClick={() => copyField(key, value)}
                    style={{ ...s.copyBtn, ...(copied[key] ? s.copyBtnOn : {}) }}>
                    {copied[key] ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div style={s.outText}>{value}</div>
                {key === 'title' && (
                  <div style={{ fontSize: '11px', marginTop: '4px', color: charColor, fontWeight: charColor === '#388e3c' ? 500 : 400 }}>
                    {charCount} / 140 characters {charCount >= 130 && charCount <= 140 ? '✓' : charCount > 140 ? '(too long!)' : ''}
                  </div>
                )}
              </div>
            ))}
            <button onClick={copyAll} style={s.copyAll}>
              {copied.all ? '✓ Copied All!' : 'Copy All'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f5f5f0', minHeight: '100vh', padding: '24px' },
  container: { maxWidth: '800px', margin: '0 auto' },
  h1: { fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' },
  subtitle: { fontSize: '14px', color: '#888', marginBottom: '28px' },
  card: { background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', border: '1px solid #e8e8e4' },
  label: { fontSize: '13px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px' },
  tab: { flex: 1, padding: '10px', border: '1.5px solid #e0e0da', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#666', textAlign: 'center' },
  tabOn: { borderColor: '#1a1a1a', background: '#1a1a1a', color: 'white' },
  varTab: { flex: 1, padding: '9px', border: '1.5px solid #e0e0da', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#666', textAlign: 'center' },
  varTabOn: { borderColor: '#555', background: '#555', color: 'white' },
  varDesc: { fontSize: '12px', color: '#aaa', marginBottom: '16px', padding: '8px 12px', background: '#f9f9f7', borderRadius: '6px' },
  row: { display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' },
  input: { flex: 1, padding: '11px 14px', border: '1.5px solid #e0e0da', borderRadius: '8px', fontSize: '15px', color: '#1a1a1a', outline: 'none' },
  btn: { padding: '11px 22px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnOff: { background: '#ccc', cursor: 'not-allowed' },
  dropzone: { border: '2px dashed #e0e0da', borderRadius: '10px', padding: '20px', cursor: 'pointer', textAlign: 'center', marginBottom: '8px', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf8', transition: 'all 0.15s' },
  dropzoneActive: { borderColor: '#1a1a1a', background: '#f0f0ec' },
  dropText: { color: '#888', fontSize: '14px' },
  preview: { maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#c62828', marginBottom: '16px' },
  outSection: { marginBottom: '16px' },
  outLabel: { fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  outText: { background: '#f9f9f7', border: '1px solid #e8e8e4', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: '#1a1a1a', lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: '40px' },
  copyBtn: { padding: '4px 10px', border: '1px solid #e0e0da', borderRadius: '5px', background: 'white', fontSize: '12px', color: '#666', cursor: 'pointer' },
  copyBtnOn: { background: '#e8f5e9', borderColor: '#a5d6a7', color: '#388e3c' },
  copyAll: { width: '100%', padding: '10px', border: '1.5px solid #e0e0da', borderRadius: '8px', background: 'white', fontSize: '14px', color: '#555', cursor: 'pointer', marginTop: '4px' }
};
