import { useState, useEffect } from 'react';

const SLOTS = ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM'];

export default function Visits({ api, user, toast, properties }) {
  const [list, setList] = useState([]);
  const [propId, setPropId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(SLOTS[0]);
  const [notes, setNotes] = useState('');
  const role = String(user?.role || '').toLowerCase();
  const isStaff = ['admin', 'agent', 'owner'].includes(role);

  const load = async () => {
    try { const r = await api.get('/visits/my'); setList(r.data); }
    catch (e) { toast('Failed to load visits', 'error'); }
  };
  useEffect(() => { load(); }, []);

  const book = async () => {
    if (!propId) return toast('Select a property', 'error');
    if (!date) return toast('Pick a date', 'error');
    try {
      await api.post('/visits', { propertyId: propId, date, timeSlot: slot, notes });
      toast('Visit booked', 'success');
      setPropId(''); setDate(''); setNotes(''); load();
    } catch (e) { toast(e.response?.data?.msg || 'Booking failed', 'error'); }
  };

  const update = async (id, status) => {
    try { await api.put('/visits/' + id, { status }); toast('Visit ' + status, 'success'); load(); }
    catch (e) { toast('Update failed', 'error'); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this visit?')) return;
    try { await api.delete('/visits/' + id); toast('Visit cancelled', 'success'); load(); }
    catch (e) { toast(e.response?.data?.msg || 'Cancel failed', 'error'); }
  };

  const stColor = { pending: '#d97706', confirmed: '#059669', cancelled: '#dc2626', completed: '#2563eb' };

  return (
    <div>
      <h3>Site Visits</h3>
      {!isStaff && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px' }}>Book a Visit</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={propId} onChange={e => setPropId(e.target.value)} style={{ padding: 8, borderRadius: 6, minWidth: 180 }}>
              <option value="">Select property</option>
              {(properties || []).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ padding: 8, borderRadius: 6 }} />
            <select value={slot} onChange={e => setSlot(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
              {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ padding: 8, borderRadius: 6, minWidth: 160 }} />
            <button onClick={book} style={{ padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>Book Visit</button>
          </div>
        </div>
      )}
      <h4 style={{ margin: '0 0 12px' }}>{isStaff ? 'All Visit Requests' : 'My Visits'}</h4>
      {list.length === 0 ? <p style={{ color: '#888' }}>No visits yet.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {list.map(v => (
            <div key={v._id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{v.property?.title || 'Property'}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 10px', borderRadius: 10, background: stColor[v.status] + '22', color: stColor[v.status], fontWeight: 600 }}>{v.status}</span>
                <div style={{ fontSize: 13, color: '#555' }}>{new Date(v.date).toLocaleDateString()} | {v.timeSlot}</div>
                <div style={{ fontSize: 12, color: '#888' }}>Tenant: {v.tenant?.fullName || '-'} {v.agent?.fullName ? '| Agent: ' + v.agent.fullName : ''} {v.notes ? '| ' + v.notes : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {isStaff && v.status === 'pending' && (<>
                  <button onClick={() => update(v._id, 'confirmed')} style={{ padding: '6px 12px', borderRadius: 6, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer' }}>Confirm</button>
                  <button onClick={() => update(v._id, 'cancelled')} style={{ padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Reject</button>
                </>)}
                {isStaff && v.status === 'confirmed' && (
                  <button onClick={() => update(v._id, 'completed')} style={{ padding: '6px 12px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>Complete</button>
                )}
                {!isStaff && v.status === 'pending' && (
                  <button onClick={() => cancel(v._id)} style={{ padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
