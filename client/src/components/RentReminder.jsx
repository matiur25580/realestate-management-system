import { useState, useEffect } from 'react';

export default function RentReminder({ api, toast }) {
  const [due, setDue] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/rents/my').catch(() => ({ data: [] }));
        const list = Array.isArray(r.data) ? r.data : [];
        const now = new Date();
        const upcoming = list.filter(x => {
          if (x.status === 'paid' || x.paid) return false;
          const d = new Date(x.dueDate || x.createdAt);
          const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        });
        setDue(upcoming);
      } catch (e) {}
    })();
  }, []);

  if (due.length === 0) return null;
  const overdue = due.filter(x => new Date(x.dueDate || x.createdAt) < new Date());

  return (
    <div style={{ padding: 14, borderRadius: 10, marginBottom: 16, background: overdue.length ? '#fef2f2' : '#fffbeb', border: '1px solid ' + (overdue.length ? '#fecaca' : '#fde68a') }}>
      <div style={{ fontWeight: 700, color: overdue.length ? '#dc2626' : '#d97706', marginBottom: 8 }}>
        {overdue.length ? '⚠️ ' + overdue.length + ' rent overdue!' : '⏰ ' + due.length + ' rent due soon'}
      </div>
      {due.map((x, i) => (
        <div key={i} style={{ fontSize: 13, padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
          <span>{x.property?.title || 'Rent'} | due {new Date(x.dueDate || x.createdAt).toLocaleDateString()}</span>
          <strong>₹{Number(x.amount || 0).toLocaleString('en-IN')}</strong>
        </div>
      ))}
    </div>
  );
}
