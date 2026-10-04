import {parser as pythonParser} from '@lezer/python';
import {parser as javaParser} from '@lezer/java';
function mask(source,python){
 const strings=[],issues=[];
 // Posições são offsets UTF-16, como os usados pelos parsers.
 const chars=source.split('');
 for(let i=0;i<source.length;){
  if((python&&source[i]==='#')||(!python&&source.slice(i,i+2)==='//')){
   const end=source.indexOf('\n',i);const stop=end<0?source.length:end;for(let j=i;j<stop;j++)chars[j]=' ';i=stop;continue;
  }
  if(!python&&source.slice(i,i+2)==='/*'){
   const end=source.indexOf('*/',i+2),stop=end<0?source.length:end+2;
   if(end<0)issues.push({position:i,message:'Feche o comentário com */.'});
   for(let j=i;j<stop;j++)if(chars[j]!=='\n')chars[j]=' ';i=stop;continue;
  }
  if(source[i]==='"'||source[i]==="'"){
   const from=i,quote=source[i];let j=i+1,closed=false;
   for(;j<source.length;j++){if(source[j]==='\\'){j++;continue;}if(source[j]===quote){closed=true;break;}}
   if(!closed)issues.push({position:from,message:'Feche o texto com a mesma aspa usada no início.'});
   const to=closed?j+1:source.length;strings.push({from,to,value:source.slice(from+1,closed?j:source.length)});
   for(let k=from+1;k<(closed?j:source.length);k++)if(chars[k]!=='\n')chars[k]=' ';i=to;continue;
  }
  i++;
 }
 return {structure:chars.join(''),strings,issues};
}
export function reviewCode(lesson,source){
 const python=lesson.topic==='Python';
 const {structure,strings,issues}=mask(source,python);
 const parser=python?pythonParser:lesson.topic==='Java'?javaParser:null;
 if(parser){parser.parse(source).iterate({enter(node){if(node.type.isError&&issues.length<4)issues.push({position:node.from,message:python?'Confira a sintaxe nesta linha: aspas, parênteses, dois-pontos e indentação.':'Confira a sintaxe nesta linha: parênteses, chaves e ponto e vírgula.'});}});}
 else{
  const stack=[],pairs={')':'(',']':'[','}':'{'};
  for(let i=0;i<structure.length;i++){
   const c=structure[i];if('([{'.includes(c))stack.push({char:c,position:i});
   if(')]}'.includes(c)&&stack.pop()?.char!==pairs[c])issues.push({position:i,message:'Confira o fechamento dos parênteses, colchetes ou chaves.'});
  }
  if(stack.length)issues.push({position:stack[0].position,message:'Falta fechar um parêntese, colchete ou chave.'});
 }
 for(const check of lesson.checks||[]){
  const literal=check.pattern.includes('Hello, Ana!')?'Hello, Ana!':check.pattern.includes('Ready')?'Ready':null;
  const pattern=literal?check.pattern.replace(literal,'\\s*'):check.pattern;
  const match=new RegExp(pattern).exec(structure);
  const valid=match&&(!literal||strings.some(item=>item.value===literal&&item.from>=match.index&&item.to<=match.index+match[0].length));
  if(!valid)issues.push({position:null,message:check.message});
 }
 return {correct:issues.length===0,mode:'requirements',errors:issues.slice(0,6).map(issue=>({line:issue.position===null?null:source.slice(0,issue.position).split('\n').length,message:issue.message})),feedback:issues.length?'Ajuste os pontos indicados e confira novamente.':'Os requisitos deste exercício foram encontrados.'};
}
