'use client';
import {useState,useEffect,useRef} from 'react';
import {lessons} from './lessons';
import AccountDialog from './account-dialog';
import LearningView from './learning-view';
import {gradeAnswer} from '../lib/grading.mjs';
import {reviewCode} from '../lib/code-review.mjs';
async function request(path,{method='GET',body}={}){
 const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const result=await response.json();if(!response.ok){const error=new Error(result.error||'Não foi possível concluir.');error.status=response.status;throw error;}return result;
}
export default function Page(){
 const [current,setCurrent]=useState(0),[completed,setCompleted]=useState([]),[drafts,setDrafts]=useState({}),[code,setCode]=useState(lessons[0].code),[output,setOutput]=useState(lessons[0].code),[choice,setChoice]=useState(null),[feedback,setFeedback]=useState(''),[runCount,setRunCount]=useState(0);
 const [user,setUser]=useState(null),[accountReady,setAccountReady]=useState(false),[loadingAccount,setLoadingAccount]=useState(true),[showAccount,setShowAccount]=useState(false),[accountError,setAccountError]=useState(''),[saveStatus,setSaveStatus]=useState(''),[busy,setBusy]=useState(false),[answering,setAnswering]=useState(false);
 const userRef=useRef(null),saveQueue=useRef(Promise.resolve()),mounted=useRef(true),answerGeneration=useRef(0);
 const [correctAnswer,setCorrectAnswer]=useState(false);
 const [track,setTrack]=useState(null),[stage,setStage]=useState('study');
 const [codeReview,setCodeReview]=useState(null),[reviewing,setReviewing]=useState(false);
 const lesson=lessons[current];
 function report(error){if(!mounted.current)return;setAccountError(error.message);setSaveStatus('Não foi possível salvar.');if(error.status===401){userRef.current=null;setUser(null);setAccountReady(false);}}
 function queueSave(index,value){
  const owner=userRef.current;if(!owner||!accountReady)return Promise.resolve();
  setSaveStatus('Salvando…');
  const task=saveQueue.current.catch(()=>{}).then(async()=>{
   if(userRef.current!==owner)return;
   await request('/api/progress',{method:'PUT',body:{lessonId:lessons[index].id,code:value}});
   if(mounted.current&&userRef.current===owner){setSaveStatus('Código salvo na sua conta.');setAccountError('');}
  });saveQueue.current=task;return task;
 }
 async function loadAccount(account){
  userRef.current=account.id;setUser(account);setAccountReady(false);setLoadingAccount(true);
  try{
   const saved=await request('/api/progress');if(!mounted.current)return;
   const index=Math.max(0,lessons.findIndex(item=>item.id===saved.lastLesson));
   const recovered=Object.fromEntries(lessons.flatMap((item,i)=>Object.hasOwn(saved.drafts,item.id)?[[i,saved.drafts[item.id]]]:[]));
   setCompleted(lessons.flatMap((item,i)=>saved.completed.includes(item.id)?[i]:[]));setDrafts(recovered);setCurrent(index);setCode(recovered[index]??lessons[index].code);setOutput(recovered[index]??lessons[index].code);setChoice(null);setCorrectAnswer(false);setFeedback('');setRunCount(0);setTrack(null);setStage('study');setAccountReady(true);setAccountError('');setSaveStatus('Progresso recuperado da sua conta.');
  }catch(error){report(error);}finally{if(mounted.current)setLoadingAccount(false);}
 }
 useEffect(()=>{mounted.current=true;request('/api/auth/me').then(result=>{if(!mounted.current)return;if(result.user)return loadAccount(result.user);setLoadingAccount(false);}).catch(error=>{report(error);setLoadingAccount(false);});return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  if(!user||!accountReady||busy)return;
  const timer=setTimeout(()=>queueSave(current,code).catch(report),1200);
  return()=>clearTimeout(timer);
 },[code,current,user?.id,accountReady,busy]);
 function open(index){if(busy||loadingAccount||answering)return;setTrack(lessons[index].topic);setStage('study');setCodeReview(null);setCorrectAnswer(false);answerGeneration.current++;setAnswering(false);queueSave(current,code).catch(report);setDrafts(previous=>({...previous,[current]:code}));setCurrent(index);const next=drafts[index]??lessons[index].code;setCode(next);setOutput(next);setChoice(null);setFeedback('');setRunCount(0);}
 async function answer(index){
  if(answering||busy||loadingAccount)return;setCorrectAnswer(false);setChoice(index);const generation=++answerGeneration.current;
  if(!user){try{const result=gradeAnswer(lesson,index);setFeedback(result.feedback);setCorrectAnswer(result.correct);if(result.correct){setCompleted(previous=>previous.includes(current)?previous:[...previous,current]);setFeedback(result.feedback+' Entre para salvar o progresso.');}}catch(error){setFeedback(error.message);}return;}
  if(!accountReady){setFeedback('Aguarde a recuperação do seu progresso.');return;}
  setAnswering(true);setFeedback('Conferindo sua resposta…');
  try{await queueSave(current,code);const result=await request('/api/progress',{method:'POST',body:{lessonId:lesson.id,answer:index}});if(generation!==answerGeneration.current)return;setFeedback(result.feedback);setCorrectAnswer(result.correct);if(result.correct)setCompleted(previous=>previous.includes(current)?previous:[...previous,current]);}
  catch(error){if(generation===answerGeneration.current){report(error);setChoice(null);setFeedback('Sua resposta não foi salva. Tente novamente.');}}
  finally{if(generation===answerGeneration.current)setAnswering(false);}
 }
 async function logout(){
  setBusy(true);try{await queueSave(current,code);await saveQueue.current;await request('/api/auth/logout',{method:'POST'});userRef.current=null;setUser(null);setAccountReady(false);setCompleted([]);setDrafts({});setCurrent(0);setCode(lessons[0].code);setOutput(lessons[0].code);setChoice(null);setCorrectAnswer(false);setFeedback('');setAccountError('');setSaveStatus('');setTrack(null);setStage('study');answerGeneration.current++;}
  catch(error){report(error);}finally{setBusy(false);}
 }
 const documentHtml='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; form-action \'none\';"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;padding:20px;color:#242424;overflow-wrap:anywhere}button,a{font-size:16px}</style></head><body>'+output+'</body></html>';
 async function checkCode(){
  if(reviewing)return;setReviewing(true);setCodeReview(null);
  try{const result=user?await request('/api/practice',{method:'POST',body:{lessonId:lesson.id,code}}):reviewCode(lesson,code);setCodeReview(result);}
  catch(error){setCodeReview({correct:false,feedback:error.message,errors:[]});}
  finally{setReviewing(false);}
 }
 function home(){if(busy||loadingAccount||answering)return;queueSave(current,code).catch(report);setTrack(null);}
 function selectTrack(topic){const rows=lessons.flatMap((item,index)=>item.topic===topic?[index]:[]);open(rows.find(index=>!completed.includes(index))??rows[0]);}
 return <><LearningView {...{lessons,current,completed,track,stage,user,loadingAccount,busy,answering,accountError,saveStatus,accountReady,correctAnswer,choice,feedback,code,documentHtml,runCount,codeReview,reviewing,checkCode,open,home,selectTrack,setStage,logout,answer}} showAccount={()=>setShowAccount(true)} changeCode={value=>{setCodeReview(null);setCode(value);if(user)setSaveStatus('Alterações ainda não salvas.');}} reset={()=>{setCode(lesson.code);setOutput(lesson.code);setRunCount(0);}} run={()=>{setOutput(code);setRunCount(value=>value+1);}} save={()=>accountReady?queueSave(current,code).catch(report):loadAccount(user)}/>{showAccount&&<AccountDialog request={request} onClose={()=>setShowAccount(false)} onAuthenticated={async account=>{setShowAccount(false);await loadAccount(account);}}/>}</>;
}
