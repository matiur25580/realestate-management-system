import { useState, useEffect } from 'react';

export default function TenantRating({ api, user, toast, tenants, properties }) {
  const [myRatings, setMyRatings] = useState({ ratings: [], average: 0, count: 0 });
  const [tenantId, setTenantId] = useState('');
  const [propId, setPropId] = useState('');
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const role = String(user?.role || '').toLowerCase();

  const loadMine = async () => {
    try { const r = await api.get('/ratings/my'); setMyRatings(r.data); }
    catch (e) {}
  };
  useEffect(() => { if (role === 'tenant') loadMine(); }, []);

  const submit = async () => {
    if (!tenantId) return toast('Select a tenant', 'error');
    try {
      await api.post('/ratings', { tenantId, propertyId: propId || undefined, rating: stars, comment });
      toast('Rating submitted', 'success');
      setTenantId(''); setPropId(''); setComment(''); setStars(5);
    } catch (e) { toast(e.response?.data?.msg || 'Failed', 'error'); }
  };

  const starRow = (val, setVal) => (
    <div style={{ fontSize: 28, cursor: 'pointer' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} onClick={() => setVal(s)} style={{ color: s <= val ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
    </div>
  );

  if (role === 'tenant') {
    return (
      <div>
        <h3>My Ratings</h3>
        <div style={{ padding: 16, borderRadius: 10, background: '#fefce8', border: '1px solid #fde68a', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#d97706' }}>{myRatings.average.toFixed(1)}</div>
          <div style={{ color: '#f59e0b', fontSize: 22 }}>{'★'.repeat(Math.round(myRatings.average))}{myRatings.count === 0 && <span style={{ color: '#d1d5db' }}>★★★★★</span>}</div>
          <div style={{ fontSize: 13, color: '#888' }}>{myRatings.count} rating(s)</div>
        </div>
        {myRatings.ratings.map(r => (
          <div key={r._id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
            <div style={{ color: '#f59e0b' }}>{'★'.repeat(r.rating)}<span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - r.rating)}</span></div>
            <div style={{ fontSize: 13 }}>{r.comment || <i>No comment</i>}</div>
            <div style={{ fontSize: 12, color: '#888' }}>by {r.ratedBy?.fullName || '-'} {r.property?.title ? '| ' + r.property.title : ''}</div>
          </div>
        ))}
        {myRatings.count === 0 && <p style={{ color: '#888' }}>No ratings yet.</p>}
      </div>
    );
  }

  return (
    <div>
      <h3>Rate a Tenant</h3>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, maxWidth: 500 }}>
        <select value={tenantId} onChange={e => setTenantId(e.target.value)} style={{ padding: 8, borderRadius: 6, width: '100%', marginBottom: 10 }}>
          <option value="">Select tenant</option>
          {(tenants || []).map(t => <option key={t._id} value={t._id}>{t.fullName || t.name} ({t.email})</option>)}
        </select>
        <select value={propId} onChange={e => setPropId(e.target.value)} style={{ padding: 8, borderRadius: 6, width: '100%', marginBottom: 10 }}>
          <option value="">Select property (optional)</option>
          {(properties || []).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
        {starRow(stars, setStars)}
        <textarea placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginTop: 10 }} />
        <button onClick={submit} style={{ marginTop: 10, padding: '10px 20px', borderRadius: 6, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Submit Rating</button>
      </div>
    </div>
  );
}
