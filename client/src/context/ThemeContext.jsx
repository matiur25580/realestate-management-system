import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }){
  const [theme, setTheme] = useState(()=>{
    try { return localStorage.getItem('theme') || 'dark'; }
    catch(e){ return 'dark'; }
  });
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme);
    try{ localStorage.setItem('theme', theme); }catch(e){}
  },[theme]);
  const toggleTheme = ()=> setTheme(t => t === 'dark' ? 'light' : 'dark');
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(){
  const ctx = useContext(ThemeContext);
  if(!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
