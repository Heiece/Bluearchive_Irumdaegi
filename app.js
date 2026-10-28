const $=id=>document.getElementById(id);
const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[\s·*ㆍ]/g,'');
let data, pool=[], state={solved:[],revealed:[],elapsed:0,school:'all',variants:true}, lastTick=Date.now();
const KEY='kivotos-attendance-v1';
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function selected(){return data.students.filter(s=>(state.school==='all'||s.school===state.school)&&(state.variants||!/[（(]/.test(s.name)));}
function message(text){$('feedback').textContent=text;}
function clock(){const n=state.elapsed;$('timer').textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function render(){
 pool=selected();$('board').replaceChildren();$('nav').replaceChildren();
 const groups=[...new Set(pool.map(s=>s.school))];
 groups.forEach((school,index)=>{
  const students=pool.filter(s=>s.school===school), name=data.schools[school]||school;
  const link=document.createElement('a');link.href='#school-'+school;link.textContent=name;$('nav').append(link);
  const section=document.createElement('section');section.className='school';section.id='school-'+school;
  const head=document.createElement('div');head.className='school-head';
  const icon=document.createElement('div');icon.className='school-icon';icon.textContent=String(index+1).padStart(2,'0');
  const title=document.createElement('h3');title.textContent=name;
  const count=document.createElement('span');count.textContent=`${students.filter(s=>state.solved.includes(s.id)).length} / ${students.length}명`;
  head.append(icon,title,count);section.append(head);
  const cards=document.createElement('div');cards.className='cards';
  students.forEach((s,i)=>{
   const solved=state.solved.includes(s.id), revealed=state.revealed.includes(s.id), card=document.createElement('button');card.type='button';card.className='card'+(solved?' solved':revealed?' revealed':'');
   card.setAttribute('aria-label',solved||revealed?s.name:`${name} ${i+1}번 정답 공개`);
   if(solved||revealed){
    const img=document.createElement('img');img.loading='lazy';img.src=`https://schaledb.com/images/student/icon/${s.id}.webp`;img.alt='';img.onerror=()=>{img.remove();};
    const caption=document.createElement('span');caption.className='name';caption.textContent=s.name;card.append(img,caption);
    if(revealed){const tag=document.createElement('small');tag.textContent='정답 공개';card.append(tag);}
   }else{const q=document.createElement('span');q.className='unknown';q.textContent='?';const n=document.createElement('small');n.textContent=String(i+1).padStart(2,'0');card.append(q,n);}
   card.onclick=()=>{if(solved||revealed)return;if(confirm('정답을 공개할까요? 공개한 학생은 점수에 포함되지 않습니다.')){state.revealed.push(s.id);save();render();message(`${s.name} · 정답을 공개했습니다.`);}};
   cards.append(card);
  });section.append(cards);$('board').append(section);
 });
 const solved=pool.filter(s=>state.solved.includes(s.id)).length, revealed=pool.filter(s=>state.revealed.includes(s.id)).length;
 $('score').textContent=`${solved} / ${pool.length}`;$('progress').style.width=`${pool.length?(solved+revealed)/pool.length*100:0}%`;clock();
 if(pool.length&&solved+revealed===pool.length)message(`출석부 완성! 직접 맞힌 학생 ${solved}명 · 정답 공개 ${revealed}명`);
}
function reset(){state.solved=[];state.revealed=[];state.elapsed=0;lastTick=Date.now();save();render();$('answer').value='';message('새 출석부가 준비됐어요. 이름을 입력하고 Enter를 눌러주세요.');}
function changeSetting(){if((state.solved.length||state.revealed.length||state.elapsed)&&!confirm('설정을 변경하면 현재 기록이 초기화됩니다. 계속할까요?')){$('school').value=state.school;$('variants').checked=state.variants;return;}state.school=$('school').value;state.variants=$('variants').checked;reset();}
$('school').onchange=changeSetting;$('variants').onchange=changeSetting;
$('reset').onclick=()=>{if(confirm('진행 상황을 지우고 다시 시작할까요?'))reset();};
$('answer-form').onsubmit=e=>{e.preventDefault();if(!data)return;const input=normalize($('answer').value);if(!input)return;
 const matches=pool.filter(s=>[s.name,s.family+s.name].some(name=>normalize(name)===input));
 if(!matches.length){message('해당하는 학생을 찾지 못했어요. 이름과 이격명을 확인해 주세요.');return;}
 const fresh=matches.filter(s=>!state.solved.includes(s.id)&&!state.revealed.includes(s.id));
 if(!fresh.length){message('이미 출석했거나 정답을 공개한 학생이에요.');return;}
 fresh.forEach(s=>state.solved.push(s.id));save();render();if(pool.some(s=>!state.solved.includes(s.id)&&!state.revealed.includes(s.id)))message(`${fresh.map(s=>s.name).join(', ')} 출석 완료!`);$('answer').value='';$('answer').focus();
};
fetch('students.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(result=>{
 data=result;try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.solved)&&Array.isArray(saved.revealed)&&Number.isFinite(saved.elapsed))state={...state,...saved};}catch{}
 const schools=[...new Set(data.students.map(s=>s.school))];for(const school of schools){const o=document.createElement('option');o.value=school;o.textContent=data.schools[school]||school;$('school').append(o);}
 if(state.school!=='all'&&!schools.includes(state.school))state.school='all';
 $('school').value=state.school;$('variants').checked=state.variants;$('answer').disabled=false;
 $('data-info').textContent=`데이터 수집: ${new Date(data.updated).toLocaleDateString('ko-KR')} · ${data.students.length}명 · ${schools.length}개 학원/소속 · 최신성 확인은 데이터 출처 기준`;
 message('이름을 입력하고 Enter로 출석을 확인하세요. 예: 아루, 아루(드레스)');render();lastTick=Date.now();
 setInterval(()=>{const now=Date.now();if(!document.hidden&&pool.some(s=>!state.solved.includes(s.id)&&!state.revealed.includes(s.id))){state.elapsed+=Math.max(0,Math.floor((now-lastTick)/1000));clock();save();}lastTick=now;},1000);
}).catch(()=>message('학생 데이터를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.'));
