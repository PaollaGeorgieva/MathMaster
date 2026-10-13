const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname,'approved_exercises.json');
const original = path.join(__dirname,'exercises_before_style_revision.json');
if (!fs.existsSync(original)) fs.copyFileSync(file,original);
const data = JSON.parse(fs.readFileSync(original,'utf8'));
// Reuse the verified polynomial operations, without regenerating the approved file.
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'build_exercises.cjs'),'utf8').split('const hints=')[0];
const context = {require,__dirname,console};
vm.createContext(context);
vm.runInContext(source + '\nthis.engine={parse,calc,fmt,entries,add,mul,pow,con,mon,latex,V};',context);
const {parse,calc,fmt,entries,add,mul,pow,mon,latex,V} = context.engine;
const m = s => '\\('+latex(s)+'\\)';
const wrap = s => '('+s+')';
function plain(n){
 if(n.op==='num'||n.op==='var')return String(n.v);
 if(n.op==='neg')return '-'+plain(n.a);
 if(n.op==='pow')return wrap(plain(n.a))+'^'+n.n;
 return wrap(plain(n.a))+n.op+wrap(plain(n.b));
}
function stages(n){
 const result=fmt(calc(n));
 if(['num','var','neg'].includes(n.op))return [result];
 if(n.op==='pow'){
  const p=calc(n.a), es=entries(p);
  if(es.length===2){const [a,b]=es.map(([k,c])=>wrap(fmt({[k]:c})));return [plain(n),n.n===2?`${a}^2+2*${a}*${b}+${b}^2`:`${a}^3+3*${a}^2*${b}+3*${a}*${b}^2+${b}^3`,result];}
  if(es.length===1){const [k,c]=es[0];return [plain(n),`(${c})^${n.n}`+k.split(',').map((e,i)=>+e?`*${V[i]}^{${e}\\cdot ${n.n}}`:'').join(''),result];}
 }
 const a=calc(n.a), b=calc(n.b);
 if(n.op==='*'&&entries(a).length===2){
  const [A,B]=entries(a).map(([k,c])=>({[k]:c}));
  if(fmt(b)===fmt(add(A,B,-1)))return [plain(n),wrap(fmt(A))+'^2-'+wrap(fmt(B))+'^2',result];
  if(fmt(b)===fmt(add(add(pow(A,2),mul(A,B),-1),pow(B,2))))return [plain(n),wrap(fmt(A))+'^3+'+wrap(fmt(B))+'^3',result];
 }
 const left=stages(n.a),right=stages(n.b),out=[plain(n)];
 for(let i=1;i<Math.max(left.length,right.length);i++)out.push(wrap(left[Math.min(i,left.length-1)])+n.op+wrap(right[Math.min(i,right.length-1)]));
 if(n.op==='*'){
  const ae=entries(a),be=entries(b);
  if(ae.length===1&&be.length===1){const [k,c]=ae[0],[l,d]=be[0];out.push(`(${c})*(${d})`+V.map((v,i)=>{const e=+k.split(',')[i],f=+l.split(',')[i];return e||f?`*${v}^{${e}+${f}}`:''}).join(''));}
  else out.push(ae.flatMap(([k,c])=>be.map(([l,d])=>wrap(fmt({[k]:c}))+'*'+wrap(fmt({[l]:d})))).join('+'));
 }else if(n.op==='/'){
  const [k,c]=entries(a)[0],[l,d]=entries(b)[0];out.push(String(c/d)+V.map((v,i)=>{const e=+k.split(',')[i],f=+l.split(',')[i];return e||f?`*${v}^{${e}-${f}}`:''}).join(''));
 }else {
  out.push(fmt(a)+(n.op==='-'?'+('+fmt(mul({'0,0,0,0,0':-1},b))+')':'+('+fmt(b)+')'));
 }
 out.push(result);return out.filter((s,i)=>i===0||s!==out[i-1]);
}
for(const p of data.problems){
 const q=p.verification_expression;
 if(q && ![4,11].includes(p.theory_id)){
  const title=[3,10].includes(p.theory_id)?'Приведете в нормален вид:':[15,16].includes(p.theory_id)&&parse(q).op==='pow'?'Извършете степенуването:':p.theory_id>=15?'Опростете израза:':'Извършете действията:';
  p.question=title+'\n'+m(q)+(p.theory_id===9?'\nПроменливите в знаменателя са различни от нула.':'');
  const steps=stages(parse(q));steps[0]=q;
  p.explanation='\\(\\begin{array}{l}'+steps.map((s,i)=>(i?'=':'')+latex(s)).join('\\\\[5pt]')+'\\end{array}\\)';
 }else if(p.theory_id===4){
  const [c,d]=p.correct_answer.split(';');const n=fmt(calc(parse(q)));
  p.question='Определете коефициента и степента на едночлена:\n'+m(q);
  p.explanation=m(q+'='+n)+'\nКоефициент: '+c+'. Степен: '+d+'.';
 }else if(p.theory_id===11){
  const [count,degree,c,free]=p.correct_answer.split(';');
  p.question='Определете броя на членовете, степента, коефициента пред '+m('x^2')+' и свободния член на многочлена:\n'+m(q);
  p.explanation=`Брой членове: ${count}.\nСтепен: ${degree}.\nКоефициент пред `+m('x^2')+`: ${c}.\nСвободен член: ${free}.`;
 }else if(p.theory_id===5){
  p.question=p.question.split('\nВъведете')[0].replace('най-точно вида на двойката','вида на двойката');
  p.explanation=p.explanation.replace(/\nОтговор:[\s\S]*/,'').replace(/(^|\n)\d\. /g,'$1').replace('Буквените части са еднакви, но коефициентите нито са равни, нито са противоположни. Избираме „подобни“.','Едночлените са подобни, защото имат еднакви буквени части.');
 }else {
  p.question=p.question.split('\nВъведете')[0];
  p.explanation=p.explanation.replace(/\nОтговор:[\s\S]*/,'');
 }
 p.hint=p.hint.split(/(?<=\.) /)[0];
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('Revised',data.problems.length,'exercises');
