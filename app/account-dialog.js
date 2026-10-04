'use client';
import {useEffect,useRef,useState} from 'react';
export default function AccountDialog({onClose,onAuthenticated,request}) {
  const dialog=useRef(null),[mode,setMode]=useState('login'),[pending,setPending]=useState(false),[error,setError]=useState('');
  useEffect(()=>{dialog.current.showModal();},[]);
  async function submit(event){
    event.preventDefault();if(pending)return;setPending(true);setError('');
    const fields=new FormData(event.currentTarget),body={email:fields.get('email'),password:fields.get('password')};
    if(mode==='register')body.name=fields.get('name');
    try{const result=await request('/api/auth/'+mode,{method:'POST',body});await onAuthenticated(result.user);}
    catch(error){setError(error.message);setPending(false);}
  }
  return <dialog ref={dialog} className="account-dialog" aria-labelledby="account-title" onCancel={event=>{if(pending)event.preventDefault();else onClose();}}><button type="button" className="dialog-close" aria-label="Fechar" disabled={pending} onClick={onClose}>×</button><p className="overline">CONTA</p><h2 id="account-title">{mode==='login'?'Entrar':'Criar conta'}</h2><p className="account-description">Salve suas aulas concluídas e seus códigos para continuar depois.</p><form key={mode} onSubmit={submit}>{mode==='register'&&<label>Nome<input name="name" autoComplete="name" minLength={2} maxLength={80} required disabled={pending}/></label>}<label>E-mail<input type="email" name="email" autoComplete="email" maxLength={254} required disabled={pending}/></label><label>Senha<input type="password" name="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='register'?12:1} maxLength={128} required disabled={pending}/></label>{mode==='register'&&<small>Mínimo de 12 caracteres.</small>}<p className="account-error" role="alert">{error}</p><button className="primary account-submit" disabled={pending}>{pending?'Aguarde…':mode==='login'?'Entrar':'Criar conta'}</button></form><p className="account-switch">{mode==='login'?'Ainda não tem conta?':'Já tem conta?'} <button disabled={pending} onClick={()=>{setMode(mode==='login'?'register':'login');setError('');}}>{mode==='login'?'Criar conta':'Entrar'}</button></p></dialog>;
}
