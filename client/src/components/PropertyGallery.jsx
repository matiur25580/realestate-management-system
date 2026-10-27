import { useState } from 'react';

export default function PropertyGallery({ property, height }) {
  const imgs = (property.images && property.images.length ? property.images : (property.image ? [property.image] : [])).filter(Boolean);
  const [idx, setIdx] = useState(0);
  if (imgs.length === 0) return <div style={{ height: height || 180, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No image</div>;
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <img src={imgs[idx]} alt="" style={{ width: '100%', height: height || 180, objectFit: 'cover', borderRadius: 8 }} />
        {imgs.length > 1 && (<>
          <button onClick={() => setIdx((idx - 1 + imgs.length) % imgs.length)} style={{ position: 'absolute', left: 6, top: '45%', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}>‹</button>
          <button onClick={() => setIdx((idx + 1) % imgs.length)} style={{ position: 'absolute', right: 6, top: '45%', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}>›</button>
          <span style={{ position: 'absolute', bottom: 6, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 8 }}>{idx + 1}/{imgs.length}</span>
        </>)}
      </div>
      {imgs.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, overflowX: 'auto' }}>
          {imgs.map((im, i) => (
            <img key={i} src={im} onClick={() => setIdx(i)} style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === idx ? '2px solid #2563eb' : '2px solid transparent' }} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageUrlInput({ images, setImages }) {
  const [url, setUrl] = useState('');
  const add = () => {
    if (!url.trim()) return;
    setImages([...(images || []), url.trim()]); setUrl('');
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input placeholder="Paste image URL" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
        <button type="button" onClick={add} style={{ padding: '8px 14px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>+ Add</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(images || []).map((im, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={im} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6 }} alt="" />
            <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11 }}>x</button>
          </div>
        ))}
      </div>
    </div>
  );
}
