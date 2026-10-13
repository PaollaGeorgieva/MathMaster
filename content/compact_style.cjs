const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.join(__dirname,'approved_exercises.json');
const backup=path.join(__dirname,'exercises_before_compact_revision.json');
if(!fs.existsSync(backup))fs.copyFileSync(file,backup);
const data=JSON.parse(fs.readFileSync(backup,'utf8'));
const ctx={require,__dirname,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'build_exercises.cjs'),'utf8').split('const hints=')[0]+'\nthis.engine={parse,calc,fmt,entries,add,mul,pow,con,mon,latex,V,signed,factors};',ctx);
const {parse,calc,fmt,entries,add,mul,pow,con,mon,latex,V,signed,factors}=ctx.engine;
const L=s=>latex(s), M=s=>'\\('+s+'\\)';
const power=(s,n)=>(/^\d+$|^[a-z]$/.test(s)?s:'('+s+')')+'^{'+n+'}';
function pretty(n,parent=0){
 let s,p=4;
 if(n.op==='num'||n.op==='var')s=String(n.v);
 else if(n.op==='neg'){p=3;s='-'+pretty(n.a,3);}
 else if(n.op==='pow')s=power(pretty(n.a),n.n);
 else if(n.op==='/')s='\\frac{'+pretty(n.a)+'}{'+pretty(n.b)+'}';
 else if(n.op==='*'){p=2;const b=pretty(n.b,2);s=pretty(n.a,2)+(n.b.op==='var'||(n.b.op==='pow'&&n.b.a.op==='var')?'':'\\cdot ')+(b.startsWith('-')?'('+b+')':b);}
 else {p=1;s=pretty(n.a,1)+n.op+pretty(n.b,n.op==='-'?2:1);}
 return p<parent?'('+s+')':s;
}
const polynomial=p=>L(fmt(p));
function joined(terms){return terms.map((s,i)=>i&&!s.startsWith('-')?'+'+s:s).join('');}
function grouped(terms){
 const groups={};for(const p of terms)for(const[k,c]of entries(p))(groups[k]??=[]).push(c);
 return joined(Object.entries(groups).map(([k,cs])=>cs.length>1?'('+joined(cs.map(String))+')'+L(mon(k)):polynomial({[k]:cs[0]})));
}
function monoProduct(n){
 const es=factors(n).map(f=>entries(calc(f))[0]);
 const nums=es.map(([,c])=>c).filter(c=>c!==1);
 const coeff=nums.length?nums.map((c,i)=>c<0&&i?'('+c+')':String(c)).join('\\cdot '):'';
 const vars=V.flatMap((v,i)=>es.map(([k])=>+k.split(',')[i]).filter(Boolean).map(e=>e===1?v:power(v,e)));
 return [coeff,...vars].filter(Boolean).join('\\cdot ');
}
function steps(n){
 const result=polynomial(calc(n)), first=pretty(n);
 let out=[first];
 if(n.op==='pow'){
   const es=entries(calc(n.a));
   if(es.length===2&&(n.a.op==='+'||n.a.op==='-')){
     const a=polynomial(calc(n.a.a)),b=polynomial(calc(n.a.b)),sign=n.a.op;
     out.push(n.n===2?power(a,2)+sign+'2\\cdot '+a+'\\cdot '+b+'+'+power(b,2):power(a,3)+sign+'3\\cdot '+power(a,2)+'\\cdot '+b+'+3\\cdot '+a+'\\cdot '+power(b,2)+sign+power(b,3));
   }else if(es.length===1){
     const [k,c]=es[0];out.push([c===1?'':power(String(c),n.n),...k.split(',').map((e,i)=>+e?power(+e===1?V[i]:power(V[i],e),n.n):'')].filter(Boolean).join('\\cdot '));
   }
 }else if(n.op==='*'){
   const a=calc(n.a), b=calc(n.b), ae=entries(a),be=entries(b);
   let identity=false;
   if(ae.length===2){
     const [A,B]=ae.map(([k,c])=>({[k]:c}));
     const absB=Object.fromEntries(entries(B).map(([k,c])=>[k,Math.abs(c)]));
     if(fmt(b)===fmt(add(A,B,-1))){out.push(power(polynomial(A),2)+'-'+power(polynomial(absB),2));identity=true;}
     else if(fmt(b)===fmt(add(add(pow(A,2),mul(A,B),-1),pow(B,2)))){out.push(power(polynomial(A),3)+(entries(B)[0][1]<0?'-':'+')+power(polynomial(absB),3));identity=true;}
   }
   if(!identity){
     if(ae.length===1&&be.length===1){
       const powered=factors(n).filter(f=>f.op==='pow');
       if(powered.length)out.push(factors(n).map(f=>f.op==='pow'?polynomial(calc(f)):pretty(f,2)).join('\\cdot '));
       out.push(monoProduct(n));
     }else if(n.a.op==='*'&&ae.length===2&&be.length===2){
       out.push('('+polynomial(a)+')('+polynomial(b)+')');
       const [A,B]=ae.map(([k,c])=>({[k]:c}));
       if(fmt(b)===fmt(add(A,B,-1)))out.push(power(polynomial(A),2)+'-'+power(polynomial(mul(con(-1),B)),2));
     }else{
       out.push(joined(ae.flatMap(([k,c])=>be.map(([l,d])=>{const sign=c*d<0?'-':'';return sign+polynomial({[k]:Math.abs(c)})+'\\cdot '+polynomial({[l]:Math.abs(d)});} ))));
       out.push(joined(ae.flatMap(([k,c])=>be.map(([l,d])=>polynomial(mul({[k]:c},{[l]:d}))))));
     }
   }
 }else if(n.op==='/'){
   const [k,c]=entries(calc(n.a))[0],[l,d]=entries(calc(n.b))[0];
   out.push(String(c/d)+V.map((v,i)=>{const e=+k.split(',')[i],f=+l.split(',')[i];return e||f?v+'^{'+e+'-'+f+'}':''}).join(''));
 }else if(n.op==='+'||n.op==='-'){
   const pieces=signed(n);
   if(pieces.some(([p])=>p.op==='pow'||(p.op==='*'&&entries(calc(p)).length>1))){
     out.push(pieces.map(([p,s],i)=>(s<0?'-':i?'+':'')+'('+steps(p).at(-1)+')').join(''));
   }
   const terms=pieces.map(([p,s])=>mul(con(s),calc(p)));
   out.push(joined(terms.map(polynomial)));
   out.push(grouped(terms));
 }
 out.push(result);
 return out.filter((s,i)=>!i||s!==out[i-1]);
}
for(const p of data.problems){
 const q=p.verification_expression;
 if(!q)continue;
 const n=parse(q);
 if(![4,11].includes(p.theory_id)){
   const title=[3,10].includes(p.theory_id)?'Приведете в нормален вид:':[15,16].includes(p.theory_id)&&n.op==='pow'?'Извършете степенуването:':p.theory_id>=15&&['+','-'].includes(n.op)?'Опростете израза:':'Извършете действията:';
   p.question=title+'\n'+M(pretty(n))+(p.theory_id===9?'\nПроменливите в знаменателя са различни от нула.':'');
   const s=steps(n);
   p.explanation=M('\\begin{array}{l}'+s.map((line,i)=>(i?'=':'')+line).join('\\\\[4pt]')+'\\end{array}');
   if(fmt(calc(n))!==p.correct_answer)throw Error('Answer mismatch '+q);
 }else if(p.theory_id===4){
   const [c,d]=p.correct_answer.split(';');
   p.question='Определете коефициента и степента на едночлена:\n'+M(pretty(n));
   p.explanation=(pretty(n)!==polynomial(calc(n))?M(pretty(n)+'='+polynomial(calc(n)))+'\n':'')+'Коефициент: '+c+'.\nСтепен: '+entries(calc(n))[0][0].split(',').filter(e=>+e).join('+')+'='+d+'.';
 }
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('Revised and checked answers:',data.problems.length);
