import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

const inpS = { width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:'6px', border:'1px solid var(--app-border)', background:'var(--app-bg)', color:'var(--app-text)', fontSize:'13px', outline:'none', marginBottom:'6px' };

export default function NotificationBell({ role }){
  const [notifs,setNotifs]=useState([]);
  const [open,setOpen]=useState(false);
  const [bTitle,setBTitle]=useState(''); const [bMsg,setBMsg]=useState(''); const [bRole,setBRole]=useState('');
  const toast=useToast();
  const load=async()=>{ try{ const r=await api.get('/notifications'); setNotifs(r.data||[]); }catch(e){} };
  useEffect(()=>{ load(); const t=setInterval(load,30000); return ()=>clearInterval(t); },[]);
  const unread=notifs.filter(n=>!n.isRead).length;
  const markRead=async(id)=>{ try{ await api.put('/notifications/'+id+'/read'); setNotifs(ns=>ns.map(x=>x._id===id?{...x,isRead:true}:x)); }catch(e){} };
  const markAll=async()=>{ try{ await api.put('/notifications/read-all'); setNotifs(ns=>ns.map(x=>({...x,isRead:true}))); }catch(e){} };
  const broadcast=async()=>{
    if(!bTitle.trim()||!bMsg.trim()) return toast.error('Title and message required');
    try{
      const r=await api.post('/notifications/broadcast',{ title:bTitle.trim(), message:bMsg.trim(), role:bRole||undefined });
      toast.success(r.data.msg||'Broadcast sent'); setBTitle(''); setBMsg(''); setBRole(''); load();
    }catch(e){ toast.error(e.response?.data?.msg||'Failed'); }
  };
  const icon=n=>n.type==='success'?'✅':n.type==='warning'?'⚠️':'ℹ️';
  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(!open)} title="Notifications" style={{width:42,height:42,borderRadius:'50%',border:'1px solid var(--app-border)',background:'var(--app-card)',color:'var(--app-text)',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
        🔔
        {unread>0 && <span style={{position:'absolute',top:-4,right:-4,minWidth:20,height:20,borderRadius:10,background:'#ef4444',color:'#fff',fontSize:11,fontWeight:'bold',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px'}}>{unread}</span>}
      </button>
      {open && (
        <div style={{position:'absolute',top:50,right:0,width:'min(86vw,340px)',maxHeight:420,overflowY:'auto',background:'var(--app-card)',border:'1px solid var(--app-border)',borderRadius:12,boxShadow:'0 12px 32px rgba(0,0,0,0.4)',zIndex:200}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderBottom:'1px solid var(--app-border)',position:'sticky',top:0,background:'var(--app-card)'}}>
            <b>Notifications{unread>0?` (${unread})`:''}</b>
            <button onClick={markAll} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:12,fontWeight:'600'}}>Mark all read</button>
          </div>
          {role==='admin' && (
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--app-border)'}}>
              <div style={{fontSize:12,fontWeight:'700',marginBottom:6}}>📢 Broadcast Announcement</div>
              <input value={bTitle} onChange={e=>setBTitle(e.target.value)} placeholder="Title" className="auth-inp" style={inpS} />
              <input value={bMsg} onChange={e=>setBMsg(e.target.value)} placeholder="Message" className="auth-inp" style={inpS} />
              <div style={{display:'flex',gap:6}}>
                <select value={bRole} onChange={e=>setBRole(e.target.value)} className="auth-inp" style={{...inpS,flex:1,marginBottom:0}}>
                  <option value="">All users</option><option value="admin">Admins</option><option value="agent">Agents</option><option value="owner">Owners</option><option value="tenant">Tenants</option><option value="maintenance">Maintenance</option>
                </select>
                <button onClick={broadcast} style={{padding:'8px 14px',background:'#3b82f6',border:'none',color:'#fff',borderRadius:'6px',cursor:'pointer',fontWeight:'700',fontSize:13}}>Send</button>
              </div>
            </div>
          )}
          {notifs.length===0
            ? <p style={{padding:20,textAlign:'center',color:'var(--app-muted)',fontSize:13}}>No notifications yet</p>
            : notifs.map(n=>(
              <div key={n._id} onClick={()=>markRead(n._id)} style={{padding:'10px 14px',borderBottom:'1px solid var(--app-border)',cursor:'pointer',background:n.isRead?'transparent':'rgba(59,130,246,0.08)'}}>
                <div style={{fontWeight:'700',fontSize:13}}>{icon(n)} {n.title}</div>
                <div style={{fontSize:12,color:'var(--app-muted)',marginTop:2}}>{n.message}</div>
                <div style={{fontSize:11,color:'var(--app-muted)',marginTop:4}}>{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
