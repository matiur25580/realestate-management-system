import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);
let idc = 0;

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id)=> setToasts(t=>t.filter(x=>x.id!==id)), []);
  const push = useCallback((type,msg)=>{
    const id = ++idc;
    setToasts(t=>[...t,{id,type,msg}]);
    setTimeout(()=>remove(id), 3500);
  },[remove]);
  const api = {
    success:(m)=>push('success',m),
    error:(m)=>push('error',m),
    info:(m)=>push('info',m),
  };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:8,width:'min(92vw,380px)'}}>
        {toasts.map(t=>(
          <div key={t.id} className="toast-in" style={{
            padding:'12px 16px',borderRadius:'10px',fontSize:'14px',fontWeight:'600',
            color:'#fff',boxShadow:'0 8px 24px rgba(0,0,0,0.35)',
            background: t.type==='success' ? '#16a34a' : t.type==='error' ? '#dc2626' : '#2563eb',
            display:'flex',alignItems:'center',gap:10
          }}>
            <span>{t.type==='success'?'✅':t.type==='error'?'❌':'ℹ️'}</span>
            <span style={{flex:1}}>{t.msg}</span>
            <span onClick={()=>remove(t.id)} style={{cursor:'pointer',opacity:0.8}}>✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(){
  const ctx = useContext(ToastContext);
  if(!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
