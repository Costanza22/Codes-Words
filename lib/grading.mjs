import {HttpError} from './validation.mjs';
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function gradeAnswer(lesson,answer){
 if(lesson.kind==='sum'){
  if(!Array.isArray(answer)||!answer.length||answer.length>lesson.values.length||new Set(answer).size!==answer.length||answer.some(value=>!lesson.values.includes(value)))throw new HttpError(400,'Selecione uma ou mais afirmações.');
  const correct=answer.length===lesson.correct.length&&lesson.correct.every(value=>answer.includes(value));
  return {correct,feedback:correct?lesson.feedback:'Confira as afirmações: '+lesson.feedback};
 }
 if(lesson.kind==='descriptive'){
  if(typeof answer!=='string'||answer.trim().length<8||answer.length>800)throw new HttpError(400,'Escreva uma resposta de 8 a 800 caracteres.');
  const text=normalize(answer);
  const missing=lesson.criteria.filter(criterion=>criterion.pattern?!new RegExp(criterion.pattern,'i').test(text):!criterion.terms.some(term=>text.includes(normalize(term))));
  return {correct:missing.length===0,feedback:missing.length?'Complete estes pontos: '+missing.map(item=>item.label).join('; ')+'.': 'Critérios da resposta identificados. '+lesson.feedback};
 }
 if(!Number.isInteger(answer)||answer<0||answer>=lesson.answers.length)throw new HttpError(400,'Escolha uma resposta válida.');
 const correct=answer===lesson.correct;
 return {correct,feedback:correct?lesson.feedback:lesson.wrongFeedback[answer]};
}
