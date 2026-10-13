const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const groups = JSON.parse(fs.readFileSync(path.join(root, 'approved_exercises_source.json'), 'utf8'));
const V = ['x','y','a','b','z'], Z = '0,0,0,0,0';
const con = n => ({[Z]: n});
const clean = p => Object.fromEntries(Object.entries(p).filter(([,v]) => v !== 0));
function add(a,b,sign=1) { const p={...a}; for(const [k,v] of Object.entries(b)) p[k]=(p[k]||0)+sign*v; return clean(p); }
function mul(a,b) { const p={}; for(const [k,v] of Object.entries(a)) for(const [l,w] of Object.entries(b)) { const key=k.split(',').map((e,i)=>+e+(+l.split(',')[i])).join(','); p[key]=(p[key]||0)+v*w; } return clean(p); }
function pow(p,n) { let r=con(1); for(let i=0;i<n;i++) r=mul(r,p); return r; }
function divide(a,b) { const es=Object.entries(b); if(es.length!==1) throw Error('Divisor must be monomial'); const [k,v]=es[0]; return clean(Object.fromEntries(Object.entries(a).map(([l,w])=>[l.split(',').map((e,i)=>+e-(+k.split(',')[i])).join(','),w/v]))); }
function entries(p) { return Object.entries(clean(p)).sort(([a],[b])=>{ const aa=a.split(',').map(Number),bb=b.split(',').map(Number); for(let i=0;i<V.length;i++) if(aa[i]!==bb[i]) return bb[i]-aa[i]; return 0; }); }
function mon(k) { return k.split(',').map((e,i)=>+e?V[i]+(+e===1?'':'^'+e):'').join(''); }
function fmt(p) { return entries(p).map(([k,v],i)=>(v<0?'-':i?'+':'')+(Math.abs(v)===1&&mon(k)?'':Math.abs(v))+mon(k)).join('')||'0'; }
function latex(s) { return s.replace(/\^(\d+)/g,'^{$1}').replace(/\*/g,'\\cdot '); }
const math = s => '\\('+latex(s)+'\\)';
const wrap = p => '('+fmt(p)+')';
function parse(s) {
  const ts=s.match(/\d+|[a-z]|[()+\-*\/^]/g); let i=0;
  function atom() { if(ts[i]==='-'){i++;return {op:'neg',a:atom()};} let n;
    if(ts[i]==='('){i++;n=sum();if(ts[i++]!==')')throw Error('Missing )');}
    else if(V.includes(ts[i])) n={op:'var',v:ts[i++]}; else n={op:'num',v:+ts[i++]};
    if(ts[i]==='^'){i++;n={op:'pow',a:n,n:+ts[i++]};} return n;
  }
  function prod(){let a=atom();while(ts[i]==='*'||ts[i]==='/'){const op=ts[i++];a={op,a,b:atom()};}return a;}
  function sum(){let a=prod();while(ts[i]==='+'||ts[i]==='-'){const op=ts[i++];a={op,a,b:prod()};}return a;}
  const n=sum();if(i!==ts.length)throw Error('Unparsed '+s);return n;
}
function calc(n){ if(n.op==='num')return con(n.v);if(n.op==='var'){let e=V.map(v=>+(v===n.v));return {[e.join(',')]:1};}if(n.op==='neg')return mul(con(-1),calc(n.a));if(n.op==='pow')return pow(calc(n.a),n.n);const a=calc(n.a),b=calc(n.b);return n.op==='+'?add(a,b):n.op==='-'?add(a,b,-1):n.op==='*'?mul(a,b):divide(a,b); }
function source(n){if(n.op==='num'||n.op==='var')return String(n.v);if(n.op==='neg')return '(-'+source(n.a)+')';if(n.op==='pow')return '('+source(n.a)+')^'+n.n;return '('+source(n.a)+n.op+source(n.b)+')';}
function signed(n,sign=1){return n.op==='+'?[...signed(n.a,sign),...signed(n.b,sign)]:n.op==='-'?[...signed(n.a,sign),...signed(n.b,-sign)]:[[n,sign]];}
function factors(n){return n.op==='*'?[...factors(n.a),...factors(n.b)]:[n];}
function identity(a,b,lines){
  if(entries(a).length!==2)return false;
  const [A,B]=entries(a).map(([k,v])=>({[k]:v}));
  if(fmt(b)===fmt(add(A,B,-1))){
    lines.push('Прилагаме формулата '+math('(A+B)*(A-B)=A^2-B^2')+' при '+math('A='+fmt(A))+' и '+math('B='+fmt(B))+'.',math(wrap(A)+'^2-'+wrap(B)+'^2='+fmt(mul(a,b))));return true;
  }
  if(fmt(b)===fmt(add(add(pow(A,2),mul(A,B),-1),pow(B,2)))){
    lines.push('Прилагаме формулата '+math('(A+B)*(A^2-A*B+B^2)=A^3+B^3')+'. При отрицателен B получаваме разлика на кубове.', 'Тук '+math('A='+fmt(A))+' и '+math('B='+fmt(B))+'. Вторият множител е '+math(wrap(A)+'^2-'+wrap(A)+'*'+wrap(B)+'+'+wrap(B)+'^2='+fmt(b))+'.',math(wrap(A)+'^3+'+wrap(B)+'^3='+fmt(mul(a,b))));return true;
  }
  return false;
}
function groupTerms(terms){const g={};for(const p of terms)for(const [k,v]of entries(p))(g[k]??=[]).push(v);return Object.keys(g).sort((a,b)=>entries({[a]:1,[b]:1})[0]?.[0]===a?-1:1).map(k=>'('+g[k].join('+').replace(/\+-/g,'-')+')'+mon(k)).join('+');}
function describe(n,lines){
  const result=calc(n), count=p=>entries(p).length;
  if(n.op==='pow' && count(calc(n.a))===2){
    const [a,b]=entries(calc(n.a)).map(([k,v])=>({[k]:v}));
    lines.push('Прилагаме формулата '+math(n.n===2?'(A+B)^2=A^2+2*A*B+B^2':'(A+B)^3=A^3+3*A^2*B+3*A*B^2+B^3')+'. Знакът на втория член се запазва в B.');
    const raw=n.n===2?`${wrap(a)}^2+2*${wrap(a)}*${wrap(b)}+${wrap(b)}^2`:`${wrap(a)}^3+3*${wrap(a)}^2*${wrap(b)}+3*${wrap(a)}*${wrap(b)}^2+${wrap(b)}^3`;
    lines.push('Замествайки '+math('A='+fmt(a))+' и '+math('B='+fmt(b))+', получаваме:',math(raw));
    lines.push('Пресмятаме степените и произведенията:',math(fmt(result)));return;
  }
  if(n.op==='pow' && count(calc(n.a))===1){
    const [k,c]=entries(calc(n.a))[0];const ex=k.split(',').map(Number);
    lines.push('Степенуваме коефициента и всеки буквен множител. При степен на степен умножаваме показателите.');
    lines.push(math(`(${c})^${n.n}`+ex.map((e,i)=>e?`*(${V[i]}^${e})^${n.n}`:'').join('')));
    lines.push(math(String(c**n.n)+ex.map((e,i)=>e?`*${V[i]}^{${e}\\cdot ${n.n}}`:'').join('')));
    lines.push('Получаваме '+math(fmt(result))+'.');return;
  }
  if(n.op==='+'||n.op==='-'){
    const pieces=signed(n);for(const [p]of pieces)if(['pow','*','/'].includes(p.op)&&count(calc(p))>1)describe(p,lines);
    const terms=pieces.map(([p,s])=>mul(con(s),calc(p)));
    lines.push('Разкриваме скобите. При минус пред скоба сменяме знака на всеки неин член. Привеждаме едночлените в нормален вид.');
    lines.push(math(terms.map(fmt).map(s=>'('+s+')').join('+')));
    lines.push('Групираме подобните членове и събираме коефициентите им:',math(groupTerms(terms)));
    lines.push('След пресмятане:',math(fmt(result)));return;
  }
  if(n.op==='*'){
    const fs=factors(n);for(const f of fs)if(f.op==='pow')describe(f,lines);
    const ps=fs.map(calc);
    if(ps.every(p=>count(p)===1)){
      const es=ps.map(p=>entries(p)[0]);
      lines.push('Умножаваме числовите коефициенти. При умножение на степени с еднакви основи събираме показателите.');
      const coefficients=es.map(([,c])=>'('+c+')').join('*');
      const powers=V.map((v,i)=>es.map(([k])=>+k.split(',')[i]).filter(Boolean)).map((ex,i)=>ex.length?V[i]+'^{'+ex.join('+')+'}':'').join('*').replace(/^\*+|\*+$/g,'').replace(/\*+/g,'*');
      lines.push(math(coefficients+(powers?'*'+powers:'')),math(fmt(result)));return;
    }
    let current=ps[0];
    for(let i=1;i<ps.length;i++){
      const other=ps[i], products=[]; const raw=[];
      if(identity(current,other,lines)||identity(other,current,lines)){current=mul(current,other);continue;}
      for(const [k,c]of entries(current))for(const [l,d]of entries(other)){const a={[k]:c},b={[l]:d};raw.push(wrap(a)+'*'+wrap(b));products.push(mul(a,b));}
      lines.push('Умножаваме всеки член на първата скоба с всеки член на втората:',math(wrap(current)+'*'+wrap(other)+'='+raw.join('+')));
      lines.push('Пресмятаме отделните произведения:',math(products.map(p=>'('+fmt(p)+')').join('+')));
      lines.push('Събираме подобните членове:',math(groupTerms(products)));
      current=mul(current,other);lines.push(math(fmt(current)));
    }return;
  }
  if(n.op==='/'){
    const a=entries(calc(n.a))[0],b=entries(calc(n.b))[0];
    lines.push('Делим коефициентите: '+math('('+a[1]+')/('+b[1]+')='+a[1]/b[1])+'.');
    lines.push('При деление на степени с еднаква ненулева основа изваждаме показателите.');
    const ex=V.map((v,i)=>[v,+a[0].split(',')[i],+b[0].split(',')[i]]).filter(([,e,f])=>e||f);
    lines.push(math(String(a[1]/b[1])+ex.map(([v,e,f])=>'*'+v+'^{'+e+'-'+f+'}').join('')),math(fmt(result)));return;
  }
  lines.push('Привеждаме израза в нормален вид: '+math(fmt(result))+'.');
}
const hints={3:'Групирай числата отделно. За всяка буква събери показателите на степените; буква без показател е на първа степен.',6:'Първо приведи едночлените в нормален вид. Събери или извади само коефициентите на подобните едночлени.',7:'Умножи коефициентите и събери показателите на еднаквите букви. Следи знаците.',8:'Първо извърши степенуването на всеки множител в скобата. При последващо умножение събери показателите.',9:'Раздели коефициентите. При всяка буква извади показателя в знаменателя от този в числителя.',10:'Групирай членовете с еднаква буквена част. Събери коефициентите им и отделно свободните членове.',12:'При минус пред скоба смени всички знаци в нея. После събери подобните членове.',13:'Умножи едночлена по всеки член на скобата, като запазиш знаците.',14:'Всеки член от първата скоба се умножава по всеки член от втората. Накрая събери подобните членове.',15:'Използвай '+math('(A+B)^2=A^2+2*A*B+B^2')+' или '+math('(A-B)^2=A^2-2*A*B+B^2')+'. Не пропускай удвоеното произведение.',16:'За куб използвай '+math('(A+B)^3=A^3+3*A^2*B+3*A*B^2+B^3')+'. При разлика знаците са плюс, минус, плюс, минус. Ако има и квадрат, разгърни го отделно.',17:'Използвай '+math('(A-B)*(A+B)=A^2-B^2')+'. При три множителя провери дали формулата може да се приложи повторно.',18:'Потърси '+math('(A+B)*(A^2-A*B+B^2)=A^3+B^3')+' или '+math('(A-B)*(A^2+A*B+B^2)=A^3-B^3')+'. При разлика на произведения внимавай с минуса пред втория резултат.'};
const format='Запишете само крайния израз без интервали и знаци за умножение. Използвайте латински букви и ^ за степен (например 2x^2y-3xy+1). Подредете буквите по азбучен ред, а членовете по намаляваща степен на първата буква; при равенство — на следващата. Свободният член е последен.';
const problems=[];
function push(theory_id,question,correct_answer,explanation,hint,extra={}){problems.push({theory_id,level_id:theory_id<=9?1:theory_id<=14?2:3,question,correct_answer,explanation,hint,max_attempts:3,is_official:true,is_active:true,...extra});}
for(const [tid,rows]of groups)for(const row of rows){const n=parse(row.q),answer=fmt(calc(n));if(answer!==row.answer)throw Error('Wrong approved answer '+row.q);const lines=['Изходен израз: '+math(row.q)];describe(n,lines);lines.push('Отговор: '+math(answer)+'.');push(tid,'Извършете действията и приведете в нормален вид:\n'+math(row.q)+(tid===9?'\nПриемете, че всички променливи в знаменателя са различни от нула.':'')+'\n'+format,answer,lines.join('\n'),hints[tid],{source_example_id:row.example_id,verification_expression:row.q});}
function choice(tid,a,b,answer,reason){push(tid,'Кой от изразите е в нормален вид?\nA: '+math(a)+'\nB: '+math(b)+'\nВъведете само главна латинска буква A или B.',answer,reason+'\nОтговор: '+answer+'.',tid===2?'В нормалния вид има един числов коефициент пред буквите и всяка буква участва само веднъж, евентуално като степен.':'Провери дали всеки едночлен е в нормален вид и дали няма членове с еднаква буквена част.');}
choice(2,'4x^2y^3','2x*3xy','A','В A коефициентът е 4, а x и y са записани като отделни степени. В B числата и еднаквите букви не са събрани: '+math('2x*3xy=6x^2y')+'. Следователно само A е записан в нормален вид.');
choice(2,'5a*a^2b','-7a^3b^2','B','В A буквата a се среща два пъти: '+math('5a*a^2b=5a^3b')+'. В B коефициентът е -7 и всяка буква е записана като една степен.');
choice(2,'-3xy^4','2y*x*4y^2','A','В A коефициентът е -3 и буквите не се повтарят. В B трябва да умножим 2 по 4 и да съберем показателите на y: '+math('2y*x*4y^2=8xy^3')+'.');
choice(2,'x^2*x*y','6x^3y','B','В A трябва да умножим степените на x: '+math('x^2*x*y=x^3y')+'. B вече има един коефициент и по една степен на всяка буква.');
choice(2,'3a*2b*a','-a^2b^3','B','В A групираме числата и буквите: '+math('3a*2b*a=6a^2b')+'. В B коефициентът е -1, който се записва само със знака минус, и буквите не се повтарят.');
for(const q of ['-7*x^3*y^2','3*a*b^2*(-2)*a^2','-2*x^2*y*4*x*y^2','5*a^2*b*(-3)*a*b^3','-x^4*y^2*z']){const n=parse(q),p=calc(n),[k,c]=entries(p)[0],es=k.split(',').map(Number).filter(Boolean),degree=es.reduce((a,b)=>a+b,0),lines=[];describe(n,lines);lines.push('Числовият множител в нормалния вид е коефициентът: '+c+'.','Степента е сборът от показателите на всички букви: '+math(es.join('+')+'='+degree)+'.',`Отговор: ${c};${degree}.`);push(4,'Определете коефициента и степента на едночлена:\n'+math(q)+'\nЗапишете коефициент;степен без интервали (например -2;5).',`${c};${degree}`,lines.join('\n'),'Първо приведи в нормален вид. Коефициентът е числовият множител, а степента е сборът от показателите на буквите.',{verification_expression:q});}
const types=[['3*x^2*y','3*x^2*y','равни'],['-5*a*b^2','5*a*b^2','противоположни'],['2*x*y^3','7*x*y^3','подобни'],['4*a^2*b','4*a*b^2','неподобни'],['2*x*3*x*y','6*x^2*y','равни']];
for(const [a,b,answer]of types){const pa=calc(parse(a)),pb=calc(parse(b)),[ka,ca]=entries(pa)[0],[kb,cb]=entries(pb)[0];push(5,'Определете най-точно вида на двойката едночлени:\n'+math(a)+' и '+math(b)+'\nВъведете една от думите с малки букви: равни, противоположни, подобни, неподобни. Ако са равни или противоположни, изберете това по-точно определение.',answer,'1. Привеждаме двата едночлена в нормален вид: '+math(fmt(pa))+' и '+math(fmt(pb))+'.\n2. Буквените части '+(ka===kb?'са еднакви: '+math(mon(ka))+'.':'са различни: '+math(mon(ka))+' и '+math(mon(kb))+'.')+'\n3. Коефициентите са '+ca+' и '+cb+'. '+(answer==='равни'?'Еднаквите буквени части и еднаквите коефициенти означават, че едночлените са равни.':answer==='противоположни'?'Буквените части са еднакви, а коефициентите са противоположни числа. Затова едночлените са противоположни.':answer==='подобни'?'Буквените части са еднакви, но коефициентите нито са равни, нито са противоположни. Избираме „подобни“.':'Различните буквени части означават, че едночлените не са подобни, независимо от равните коефициенти.')+'\nОтговор: '+answer+'.','Сравни буквените части след привеждане в нормален вид. Ако съвпадат, сравни коефициентите: равни ли са, противоположни ли са, или са други числа.');}
choice(10,'3x^2-2x+5','x^2+4x^2-1','A','В A трите члена са в нормален вид и не са подобни помежду си. В B има два подобни члена: '+math('x^2+4x^2=5x^2')+'. Следователно B още трябва да се приведе.');
choice(10,'2a+3-a','4a^3-a+2','B','В A членовете 2a и -a са подобни и дават a, така че нормалният вид е '+math('a+3')+'. В B всички членове са приведени и нямат еднакви буквени части.');
choice(10,'5xy-2x^2+7','3xy+xy-4','A','A няма подобни членове и всеки едночлен е в нормален вид. Редът на членовете не пречи на нормалния вид. В B '+math('3xy+xy=4xy')+', така че още има приведение.');
choice(10,'y^3+2y-y^3','-2y^4+3y^2-1','B','В A противоположните членове '+math('y^3')+' и '+math('-y^3')+' се унищожават и остава '+math('2y')+'. B вече е в нормален вид.');
choice(10,'2x*x+3','2x^2+3','B','В A първият член още не е в нормален вид: '+math('2x*x=2x^2')+'. В B това умножение е извършено и няма подобни членове.');
for(const q of ['3*x^4-2*x^2+5*x-7','-x^5+4*x^3+6','2*x^6-3*x^4+x^2-8*x','5*x^3+7*x^2-2','-4*x^7+2*x^5-6*x^2+x+9']){const p=calc(parse(q)),es=entries(p),n=es.length,degree=Math.max(...es.map(([k])=>+k.split(',')[0])),c=p['2,0,0,0,0']||0,free=p[Z]||0,answer=[n,degree,c,free].join(';');push(11,'За многочлена '+math(q)+' определете броя на членовете, степента, коефициента пред '+math('x^2')+' и свободния член.\nЗапишете четирите числа в този ред, разделени с ; без интервали. При липсващ член запишете 0.',answer,'Многочленът е в нормален вид.\n1. Членовете му са: '+es.map(([k,v])=>math(fmt({[k]:v}))).join(', ')+`. Следователно има ${n} члена.\n2. Най-високият показател на x е ${degree}, затова степента е ${degree}.\n3. `+(c?'Членът от втора степен е '+math(fmt({'2,0,0,0,0':c}))+`, чийто коефициент е ${c}.`:'Няма член с x^2, затова съответният коефициент е 0.')+'\n4. '+(free?`Членът без променлива е ${free}. Това е свободният член.`:'Няма ненулев свободен член; записваме 0.')+'\nОтговор: '+answer+'.','Брой членовете заедно със знаците им. Степента се определя от най-големия показател, а свободният член няма буква.',{verification_expression:q});}
problems.sort((a,b)=>a.theory_id-b.theory_id);
// Recognition exercises precede simplification within theory 10.
problems.sort((a,b)=>a.theory_id-b.theory_id || (a.theory_id===10 ? Number(!!a.verification_expression)-Number(!!b.verification_expression):0));
const orders={};for(const p of problems)p.order_index=orders[p.theory_id]=(orders[p.theory_id]||0)+1;
const testSpecs=[
['Каква е степента на едночлена '+math('(-4*x^3*y^2)*(-2*x*y)')+'?',null,'7',['5','6','8'],1,'лесна'],
['Приведете в нормален вид:', '3*x^2-2*x+5*x^2+7*x','8x^2+5x',['8x^2-5x','8x^3+5x','3x^2+5x'],1,'лесна'],
['Извършете умножението:', '(x-6)*(x+6)','x^2-36',['x^2+36','x^2-12x+36','x^2-6'],1,'лесна'],
['Приведете в нормален вид:', '(-2*x^2*y)^3*(3*x*y^2)','-24x^7y^5',['24x^7y^5','-24x^6y^5','-6x^7y^5'],2,'средна'],
['Извършете изваждането:', '(4*x^2-3*x+2)-(x^2+5*x-6)','3x^2-8x+8',['3x^2+2x-4','3x^2-8x-4','5x^2+2x-4'],2,'средна'],
['Извършете степенуването:', '(2*x-3*y)^2','4x^2-12xy+9y^2',['4x^2+9y^2','4x^2-6xy+9y^2','4x^2+12xy+9y^2'],2,'средна'],
['Извършете степенуването:', '(x-2)^3','x^3-6x^2+12x-8',['x^3-8','x^3-6x^2-12x-8','x^3-2x^2+4x-8'],2,'средна'],
['Извършете умножението:', '(2*a+b)*(a^2-a*b+b^2)','2a^3-a^2b+ab^2+b^3',['2a^3+b^3','2a^3+a^2b+ab^2+b^3','2a^3-a^2b-ab^2+b^3'],2,'средна'],
['Опростете израза:', '(x+2)^3-(x-2)^3','12x^2+16',['12x^2','12x^2+24x','6x^2+16'],3,'трудна'],
['Опростете израза:', '(x-3)*(x+3)*(x^2+9)-(x^2-1)^2','2x^2-82',['2x^2-80','-2x^2-82','x^4-82'],3,'трудна'],
['Опростете израза:', '(2*x-y)^2-(x+2*y)*(x-2*y)','3x^2-4xy+5y^2',['3x^2-4xy-3y^2','3x^2+5y^2','3x^2+4xy+5y^2'],3,'трудна'],
['Опростете израза:', '(x+1)*(x^2-x+1)-(x-1)*(x^2+x+1)','2',['0','2x^3','2x^2'],3,'трудна']
];
const testQuestions=testSpecs.map(([label,q,answer,wrong,points,difficulty],i)=>{const lines=[];if(q){if(fmt(calc(parse(q)))!==answer)throw Error('Wrong test answer '+q);describe(parse(q),lines);}else lines.push('Умножаваме коефициентите: (-4)·(-2)=8. Събираме показателите и получаваме '+math('8x^4y^3')+'. Степента е 4+3=7.');const correctIndex=[2,0,3,1,0,2,1,3,2,0,3,1][i];const options=[...wrong];options.splice(correctIndex,0,answer);return {question:label+(q?'\n'+math(q):''),question_type:'single_choice',points,order_index:i+1,answers:options.map((a,j)=>({answer:math(a),is_correct:j===correctIndex,order_index:j+1})),difficulty,explanation:lines.join('\n'),verification_expression:q,expected_answer:answer};});
if(problems.length!==115)throw Error('Expected 115, got '+problems.length);
for(const p of problems){if(p.correct_answer.length>30||!p.hint||p.explanation.length<100)throw Error('Invalid content');}
const output={batch:'approved-practice-2026-10-11',problems,test:{title:'Цели изрази — обобщителен тест',theme_id:1,badge_threshold_percent:70,questions:testQuestions}};
fs.writeFileSync(path.join(root,'approved_exercises.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({problems:problems.length,per_theory:orders,test_questions:testQuestions.length,test_points:testQuestions.reduce((s,q)=>s+q.points,0)},null,2));
