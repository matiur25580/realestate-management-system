import { useState, useEffect } from 'react';

export default function PnLReport({ api, user, toast }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({ income: 0, expenses: 0, incomeItems: [], expenseItems: [] });

  useEffect(() => { load(); }, [month]);

  const load = async () => {
    try {
      const [rents, exps] = await Promise.all([
        api.get('/rents/my').catch(() => ({ data: [] })),
        api.get('/expenses/my').catch(() => api.get('/expenses').catch(() => ({ data: [] })))
      ]);
      const rentList = Array.isArray(rents.data) ? rents.data : [];
      const expList = Array.isArray(exps.data) ? exps.data : [];
      const inMonth = (d) => d && new Date(d).toISOString().slice(0, 7) === month;
      const inc = rentList.filter(r => inMonth(r.paidAt || r.createdAt) && (r.status === 'paid' || r.paid));
      const exp = expList.filter(e => inMonth(e.date || e.createdAt));
      const income = inc.reduce((s, r) => s + Number(r.amount || 0), 0);
      const expenses = exp.reduce((s, e) => s + Number(e.amount || 0), 0);
      setData({ income, expenses, incomeItems: inc, expenseItems: exp });
    } catch (e) { toast('Failed to load P&L', 'error'); }
  };

  const profit = data.income - data.expenses;
  const card = (label, val, color) => (
    <div style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 10, background: color + '15', border: '1px solid ' + color + '44' }}>
      <div style={{ fontSize: 13, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>₹{Number(val).toLocaleString('en-IN')}</div>
    </div>
  );

  return (
    <div>
      <h3>Profit & Loss Report</h3>
      <div style={{ marginBottom: 16 }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
        <button onClick={() => window.print()} style={{ marginLeft: 8, padding: '8px 16px', borderRadius: 6, background: '#4b5563', color: '#fff', border: 'none', cursor: 'pointer' }}>Print / PDF</button>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {card('Income (Rent)', data.income, '#059669')}
        {card('Expenses', data.expenses, '#dc2626')}
        {card(profit >= 0 ? 'Net Profit' : 'Net Loss', profit, profit >= 0 ? '#2563eb' : '#d97706')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h4>Income ({data.incomeItems.length})</h4>
          {data.incomeItems.map((r, i) => (
            <div key={i} style={{ padding: 8, borderBottom: '1px solid #eee', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{r.property?.title || 'Rent'}</span><strong style={{ color: '#059669' }}>+₹{Number(r.amount || 0).toLocaleString('en-IN')}</strong>
            </div>
          ))}
          {data.incomeItems.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No income this month.</p>}
        </div>
        <div>
          <h4>Expenses ({data.expenseItems.length})</h4>
          {data.expenseItems.map((e, i) => (
            <div key={i} style={{ padding: 8, borderBottom: '1px solid #eee', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{e.title || e.description || 'Expense'}</span><strong style={{ color: '#dc2626' }}>-₹{Number(e.amount || 0).toLocaleString('en-IN')}</strong>
            </div>
          ))}
          {data.expenseItems.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No expenses this month.</p>}
        </div>
      </div>
    </div>
  );
}
