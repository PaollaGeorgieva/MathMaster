const fs=require('node:fs');const d=JSON.parse(fs.readFileSync('content/approved_exercises.json','utf8'));
function number(s,values){
 s=s.replace(/\\frac\{([^{}]*(?:\^\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\^\{[^{}]*\}[^{}]*)*)\}/g,'(($1)/($2))').replace(/\\cdot\s*/g,'*');
 while(/\^\{[^{}]*\}/.test(s))s=s.replace(/\^\{([^{}]*)\}/g,'^($1)');
 s=s.replace(/([0-9a-z)])(?=[a-z(])/g,'$1*').replace(/\)(?=[0-9])/g,')*').replace(/\^/g,'**');
 s=s.replace(/[xyabz]/g,c=>'('+values[c]+')').replace(/(^|[(+*/])-\s*(?=[(0-9])/g,'$1-1*');
 if(!/^[0-9+*/().\s-]+$/.test(s))throw Error('Unsupported: '+s);
 return Function('return ('+s+')')();
}
let count=0;
for(const p of d.problems){if(!p.verification_expression||[4,11].includes(p.theory_id))continue;
 const lines=p.explanation.replace('\\(\\begin{array}{l}','').replace('\\end{array}\\)','').split('\\\\[4pt]').map(s=>s.replace(/^=/,''));
 for(const values of [{x:2,y:3,a:2,b:3,z:2},{x:3,y:2,a:4,b:2,z:3}]){
  const expected=number(p.correct_answer,values);
  for(const line of lines){let actual;try{actual=number(line,values)}catch(e){throw Error(p.theory_id+'/'+p.order_index+': '+line+' '+e.message)}if(Math.abs(actual-expected)>1e-6*Math.max(1,Math.abs(expected)))throw Error(p.theory_id+'/'+p.order_index+': '+line+' gives '+actual+' expected '+expected);count++;}
 }
}
console.log('Verified intermediate equalities:',count);
