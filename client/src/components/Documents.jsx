import { useState, useEffect } from 'react';

const toBase64 = f => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f);
});

export default function Documents({ api, user, toast }) {
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { const r = await api.get('/documents/my'); setDocs(r.data); }
    catch (e) { toast('Failed to load documents', 'error'); }
  };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!title.trim()) return toast('Enter document title', 'error');
    if (!file) return toast('Choose a file', 'error');
    setLoading(true);
    try {
      const dataUrl = await toBase64(file);
      await api.post('/documents', { title: title.trim(), category, fileData: dataUrl, fileName: file.name, mimeType: file.type });
      toast('Document uploaded', 'success');
      setTitle(''); setFile(null); setCategory('other'); load();
    } catch (e) { toast(e.response?.data?.msg || 'Upload failed', 'error'); }
    setLoading(false);
  };

  const download = async (d) => {
    try {
      const r = await api.get('/documents/' + d._id + '/download');
      const a = document.createElement('a');
      a.href = r.data.fileData; a.download = r.data.fileName || d.title;
      a.click(); toast('Download started', 'success');
    } catch (e) { toast('Download failed', 'error'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this document?')) return;
    try { await api.delete('/documents/' + id); toast('Deleted', 'success'); load(); }
    catch (e) { toast('Delete failed', 'error'); }
  };

  const catLabel = { lease_agreement: 'Lease Agreement', id_proof: 'ID Proof', property_paper: 'Property Paper', rent_receipt: 'Rent Receipt', other: 'Other' };

  return (
    <div>
      <h3>Document Vault</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input placeholder="Document title" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 180 }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          {Object.entries(catLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="file" onChange={e => setFile(e.target.files[0])} style={{ maxWidth: 220 }} />
        <button onClick={upload} disabled={loading} style={{ padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {docs.length === 0 ? <p style={{ color: '#888' }}>No documents yet.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {docs.map(d => (
            <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{d.title}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10 }}>{catLabel[d.category] || d.category}</span>
                <div style={{ fontSize: 12, color: '#888' }}>{d.fileName} {d.property?.title ? ' | ' + d.property.title : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => download(d)} style={{ padding: '6px 12px', borderRadius: 6, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer' }}>Download</button>
                <button onClick={() => del(d._id)} style={{ padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
