import { useEffect, useState } from 'react';
const pad = (n)=> String(n).padStart(2,'0');
export default function LiveDateTime(){
  const [now,setNow]=useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); },[]);
  const date = pad(now.getDate())+'.'+pad(now.getMonth()+1)+'.'+now.getFullYear();
  let h = now.getHours(); const ap = h>=12 ? 'PM' : 'AM'; h = h%12 || 12;
  const time = pad(h)+'.'+pad(now.getMinutes())+'.'+pad(now.getSeconds())+' '+ap;
  return (
    <div style={{textAlign:'center',lineHeight:'1.35',padding:'6px 14px',background:'var(--app-card)',border:'1px solid var(--app-border)',borderRadius:'10px'}}>
      <div style={{fontWeight:'800',fontSize:'15px',letterSpacing:'1px'}}>📅 {date}</div>
      <div style={{fontSize:'13px',color:'var(--app-muted)',letterSpacing:'1px'}}>🕐 {time}</div>
    </div>
  );
}
