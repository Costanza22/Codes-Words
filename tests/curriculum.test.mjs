import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons} from '../app/lessons.js';
import {gradeAnswer} from '../lib/grading.mjs';
import {reviewCode} from '../lib/code-review.mjs';
test('36 lessons across six complete tracks, unique stable IDs and three question types',()=>{
 assert.equal(lessons.length,36);assert.equal(new Set(lessons.map(item=>item.id)).size,36);
 for(const topic of ['HTML','CSS','JavaScript','Python','Java','C#']){
  const rows=lessons.filter(item=>item.topic===topic);assert.equal(rows.length,6);
  assert.ok(rows.some(item=>item.kind==='sum'));assert.ok(rows.some(item=>item.kind==='descriptive'));
  for(const item of rows){assert.ok(item.words.length>=3);assert.ok(item.code.length);assert.ok(item.text.length>30);}
 }
});
test('multiple choice and summation reject wrong selections and invalid input',()=>{
 for(const lesson of lessons.filter(item=>item.kind!=='descriptive')){
  assert.equal(gradeAnswer(lesson,lesson.correct).correct,true,lesson.id);
  if(lesson.kind==='sum'){
   assert.equal(gradeAnswer(lesson,[4]).correct,false);
   assert.throws(()=>gradeAnswer(lesson,[1,1]));assert.throws(()=>gradeAnswer(lesson,3));assert.throws(()=>gradeAnswer(lesson,[16]));
  }else{assert.equal(gradeAnswer(lesson,(lesson.correct+1)%lesson.answers.length).correct,false);assert.throws(()=>gradeAnswer(lesson,999));}
 }
});
test('short answers identify required concepts and reject reversed definitions',()=>{
 const answers={
 'html-semantic':'header é o cabeçalho; footer é o rodapé.',
 'css-responsive':'Quando a largura da tela é menor ou igual a 600 pixels.',
 'js-loops':'Três vezes, nos valores 0, 1 e 2; a condição fica falsa em 3.',
 'python-functions':'print mostra o valor na tela; return devolve o resultado.',
 'java-methods':'Um método int devolve um inteiro; um método void não devolve um valor.',
 'csharp-functions':'Console.WriteLine mostra na saída; return devolve o resultado.',
 };
 for(const lesson of lessons.filter(item=>item.kind==='descriptive')){
  assert.equal(gradeAnswer(lesson,answers[lesson.id]).correct,true,lesson.id);
  assert.equal(gradeAnswer(lesson,'Não sei a resposta.').correct,false);
  assert.throws(()=>gradeAnswer(lesson,'x'.repeat(801)));
 }
 const python=lessons.find(item=>item.id==='python-functions');
 assert.equal(gradeAnswer(python,'print devolve o resultado; return mostra na tela.').correct,false);
 const html=lessons.find(item=>item.id==='html-semantic');
 assert.equal(gradeAnswer(html,'header é o rodapé; footer é o cabeçalho.').correct,false);
});
test('new-language challenges are checked without executing code',()=>{
 for(const lesson of lessons.filter(item=>item.checks)){
  const example=lesson.code.replace('Hello, world!','Hello, Ana!');
  const result=reviewCode(lesson,example);assert.equal(result.correct,true,lesson.id+': '+JSON.stringify(result.errors));
  assert.equal(reviewCode(lesson,'').correct,false,lesson.id);
  const commented=lesson.topic==='Python'?'# '+example.replaceAll('\n','\n# '):'/* '+example+' */';
  assert.equal(reviewCode(lesson,commented).correct,false,lesson.id);
 }
 const python=lessons.find(item=>item.id==='python-print');
 assert.equal(reviewCode(python,'print("Hello, Ana!"').correct,false);
 const java=lessons.find(item=>item.id==='java-print');
 assert.equal(reviewCode(java,'public class Main {').correct,false);
 const csharp=lessons.find(item=>item.id==='csharp-print');
 assert.equal(reviewCode(csharp,'Console.WriteLine("Hello, Ana!"); }').correct,false);
});
