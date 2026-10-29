const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let S=null,OWN={},ME=null,tab='bxh',selR=null,openM=null,msg='',pend=false,timer=null,busy=false;
const DATES=['27/10','03/11','10/11','17/11','01/12'];
const norm=s=>String(s).normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');
const LOGOS={'lá chắn':'/la-chan.png','platform':'/platform.png','mượt mà':'/muot-ma.png','hài vãi':'/hai-vai.png','vps united':'/vps-united.png','phòng kính':'/phong-kinh.png'};
const isAdmin=()=>!!ME&&ME.role==='admin';
const myTeam=()=>ME&&ME.team!==null&&ME.team!==undefined?ME.team:null;
const canTeam=i=>myTeam()===i||(isAdmin()&&!OWN[i]);
async function api(path,opt){
  opt=opt||{};
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),15000);
  let r;
  try{r=await fetch(path,{method:opt.method||'GET',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:opt.body?JSON.stringify(opt.body):undefined,signal:ac.signal})}
  catch(e){throw new Error('Không kết nối được máy chủ, hãy thử lại')}
  finally{clearTimeout(tm)}
  let d=null;try{d=await r.json()}catch(e){}
  if(!r.ok)throw new Error((d&&d.error)||'Có lỗi xảy ra, hãy thử lại');
  return d;
}
function setSt(t){const e=$('#st');if(e)e.textContent=t}
async function load(){
  try{const d=await api('/api/state');S=d.state;OWN=d.owners||{};ME=d.me;msg='';setSt(ME?'':'Muốn đăng ký đội của bạn? Vào tab “Đăng nhập” ở cuối.')}
  catch(e){msg=e.message;setSt('Không tải được dữ liệu: '+e.message)}
  rr();
}
function save(){clearTimeout(timer);timer=setTimeout(doSave,400);setSt('Đang lưu…')}
async function doSave(){
  timer=null;busy=true;
  try{
    if(isAdmin())await api('/api/state',{method:'PUT',body:{state:S}});
    else if(myTeam()!==null)await api('/api/team',{method:'PUT',body:{players:S.teams[myTeam()].pl}});
    setSt('Đã lưu.');
  }catch(e){setSt(e.message);busy=false;await load()}
  busy=false;
}
const played=m=>m.hs!==null&&m.as!==null;
const tn=i=>esc(S.teams[i].name);
const lg=i=>{const u=LOGOS[norm(S.teams[i].name)];return u?`<img class="lg" alt="" src="${u}">`:'<span class="lg"></span>'};
function lastR(){let r=0;S.matches.forEach(m=>{if(played(m))r=Math.max(r,m.r)});return r||1}
function findP(id){for(let t=0;t<6;t++){const p=S.teams[t].pl.find(x=>String(x.id)===String(id));if(p)return{p,t}}return null}
function standings(R){
  const s=S.teams.map((t,i)=>({i,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}));
  S.matches.filter(m=>m.r<=R&&played(m)).forEach(m=>{
    const h=s[m.h],a=s[m.a];h.P++;a.P++;h.GF+=m.hs;h.GA+=m.as;a.GF+=m.as;a.GA+=m.hs;
    if(m.hs>m.as){h.W++;a.L++;h.Pts+=3}else if(m.hs<m.as){a.W++;h.L++;a.Pts+=3}else{h.D++;a.D++;h.Pts++;a.Pts++}});
  return s.sort((x,y)=>y.Pts-x.Pts||(y.GF-y.GA)-(x.GF-x.GA)||y.GF-x.GF||S.teams[x.i].name.localeCompare(S.teams[y.i].name));
}
function playerStats(R){
  const st={};
  S.matches.filter(m=>m.r<=R).forEach(m=>m.ev.forEach(e=>{const o=st[e.p]=st[e.p]||{g:0,y:0,r:0};o[e.t]++}));
  return Object.entries(st).map(([id,o])=>({...o,f:findP(id)})).filter(x=>x.f);
}
function viewBxh(){
  const R=selR||lastR(),s=standings(R);
  let h=`<div class="row" style="margin:0 0 10px"><label for="sr"><b>Bảng xếp hạng sau vòng</b></label><select id="sr">${[1,2,3,4,5].map(r=>`<option value="${r}"${r===R?' selected':''}>${r} (${DATES[r-1]})</option>`).join('')}</select></div>`;
  h+=`<div class="card scroll" style="padding:0"><table><thead><tr><th>#</th><th class="t">Đội</th><th>Trận</th><th>T</th><th>H</th><th>B</th><th>BT</th><th>BB</th><th>HS</th><th>Điểm</th></tr></thead><tbody>`;
  s.forEach((x,k)=>{h+=`<tr class="${k<2?'top':''}${k===0&&x.P>0?' lead':''}"><td>${k+1}</td><td class="t"><b>${lg(x.i)}${tn(x.i)}</b></td><td>${x.P}</td><td>${x.W}</td><td>${x.D}</td><td>${x.L}</td><td>${x.GF}</td><td>${x.GA}</td><td>${x.GF-x.GA>0?'+':''}${x.GF-x.GA}</td><td class="pts">${x.Pts}</td></tr>`});
  h+=`</tbody></table></div><p class="mu">Cách tính điểm: thắng +3, hòa +1, thua +0. Xếp theo điểm, hiệu số, rồi số bàn thắng. T: thắng, H: hòa, B: bại, BT/BB: bàn thắng/bàn thua, HS: hiệu số.</p>`;
  h+=`<h2>Kết quả vòng ${R}</h2><div class="card">`+S.matches.filter(m=>m.r===R).map(m=>`<div class="match" style="padding:5px 0"><span class="h">${tn(m.h)}</span><span class="num" style="font-size:22px;font-weight:700">${played(m)?m.hs+' - '+m.as:'chưa đá'}</span><span class="a">${tn(m.a)}</span></div>`).join('')+`</div>`;
  const ps=playerStats(R),sc=ps.filter(x=>x.g).sort((a,b)=>b.g-a.g),cd=ps.filter(x=>x.y||x.r).sort((a,b)=>b.r-a.r||b.y-a.y);
  h+=`<div class="two"><div><h2>Vua phá lưới</h2><div class="card">${sc.length?sc.map(x=>`<div class="pl${x.g===sc[0].g?' lead':''}"><span>${esc(x.f.p.name)} <span class="mu">${tn(x.f.t)}</span></span><b class="num" style="font-size:20px">${x.g}</b></div>`).join(''):'<span class="mu">Chưa có bàn thắng nào được ghi nhận.</span>'}</div></div>`;
  h+=`<div><h2>Thẻ phạt</h2><div class="card">${cd.length?cd.map(x=>`<div class="pl"><span>${esc(x.f.p.name)} <span class="mu">${tn(x.f.t)}</span></span><span>🟨 ${x.y} &nbsp;🟥 ${x.r}</span></div>`).join(''):'<span class="mu">Chưa có thẻ phạt nào.</span>'}</div></div></div>`;
  return h;
}
const ICON={g:'⚽',y:'🟨',r:'🟥'};
function viewKq(){
  let h='<p class="sub">'+(isAdmin()?'Nhập tỉ số từng trận. Bấm “Diễn biến” để ghi người ghi bàn và thẻ phạt.':'Kết quả các trận đấu. Chỉ ban tổ chức được nhập tỉ số.')+'</p>';
  for(let r=1;r<=5;r++){
    h+=`<h2>Vòng ${r} <span class="mu">· ${DATES[r-1]}</span></h2>`;
    S.matches.forEach((m,i)=>{if(m.r!==r)return;
      h+=`<div class="card"><div class="match"><span class="h">${tn(m.h)}</span><span class="sc"><input type="number" min="0" inputmode="numeric" aria-label="Bàn thắng ${tn(m.h)}" data-sc="${i}" data-s="hs" value="${m.hs??''}"><span>-</span><input type="number" min="0" inputmode="numeric" aria-label="Bàn thắng ${tn(m.a)}" data-sc="${i}" data-s="as" value="${m.as??''}"></span><span class="a">${tn(m.a)}</span></div>`;
      h+=`<div class="row"><button class="b" data-act="open" data-i="${i}">Diễn biến (${m.ev.length})</button></div>`;
      if(openM===i){
        const opts=[m.h,m.a].map(t=>`<optgroup label="${tn(t)}">${S.teams[t].pl.map(p=>`<option value="${p.id}">${p.no?'#'+esc(p.no)+' ':''}${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
        h+=m.ev.map((e,k)=>{const f=findP(e.p);return `<div class="ev"><span>${ICON[e.t]} ${f?esc(f.p.name):'(đã xóa)'} <span class="mu">${f?tn(f.t):''} ${e.min?e.min+"′":''}</span></span><button class="x" data-act="delev" data-i="${i}" data-k="${k}" aria-label="Xóa">×</button></div>`}).join('');
        h+=S.teams[m.h].pl.length+S.teams[m.a].pl.length?`<div class="row"><select id="et"><option value="g">⚽ Bàn thắng</option><option value="y">🟨 Thẻ vàng</option><option value="r">🟥 Thẻ đỏ</option></select><select id="ep">${opts}</select><input id="em" type="number" min="0" placeholder="Phút" style="width:70px"><button class="b p" data-act="addev" data-i="${i}">Thêm</button></div>`:'<p class="mu">Hãy thêm cầu thủ ở tab “Đội bóng” trước.</p>';
      }
      h+='</div>';
    });
  }
  return h;
}
function viewDoi(){
  let h='<p class="sub">Danh sách cầu thủ các đội. Đội trưởng cập nhật đội của mình, ban tổ chức đổi tên đội.</p>';
  S.teams.forEach((t,i)=>{
    const rel=OWN[i]&&(isAdmin()||myTeam()===i)?`<div class="row"><button class="b" data-act="release" data-i="${i}">${isAdmin()?'Gỡ đội trưởng':'Bỏ đội này'}</button></div>`:'';
    h+=`<div class="card" data-t="${i}"><div class="row" style="margin:0 0 6px">${lg(i)}<input data-name="${i}" value="${esc(t.name)}" aria-label="Tên đội ${i+1}" style="flex:1;font-weight:700;font-size:17px"></div>`;
    h+=`<p class="mu" style="margin:0 0 4px">${OWN[i]?'Đội trưởng: '+esc(OWN[i]):'Chưa có đội trưởng'}</p>`;
    h+=t.pl.map(p=>`<div class="pl"><span>${p.no?'<b>#'+esc(p.no)+'</b> ':''}${esc(p.name)}</span><button class="x" data-act="delp" data-i="${i}" data-id="${esc(p.id)}" aria-label="Xóa cầu thủ">×</button></div>`).join('')||'<p class="mu">Chưa có cầu thủ.</p>';
    h+=`<div class="row"><input id="pn${i}" placeholder="Số" inputmode="numeric" style="width:60px"><input id="pj${i}" placeholder="Tên cầu thủ" style="flex:1"><button class="b p" data-act="addp" data-i="${i}">Thêm</button></div>${rel}</div>`;
  });
  return h;
}
function viewAcc(){
  let h=msg?`<div class="card" role="alert">${esc(msg)}</div>`:'';
  if(!ME){
    h+=`<div class="two"><div class="card"><h2 style="margin-top:0">Đăng nhập</h2><div class="fm" data-form><input id="lu" placeholder="Tên đăng nhập" autocomplete="username" autocapitalize="none"><input id="lp" type="password" placeholder="Mật khẩu" autocomplete="current-password"><button class="b p" data-act="login">Đăng nhập</button></div></div>`;
    h+=`<div class="card"><h2 style="margin-top:0">Đăng ký tài khoản</h2><div class="fm" data-form><input id="ru" placeholder="Tên đăng nhập (3–24 ký tự)" autocomplete="username" autocapitalize="none"><input id="rp" type="password" placeholder="Mật khẩu (tối thiểu 8 ký tự)" autocomplete="new-password"><input id="rc" placeholder="Mã quản trị (chỉ ban tổ chức)" autocomplete="off"><button class="b p" data-act="register">Đăng ký</button></div></div></div>`;
    return h;
  }
  h+=`<div class="card"><b style="font-size:18px">${esc(ME.name)}</b> <span class="mu">${isAdmin()?'· Ban tổ chức':'· Đội trưởng'}</span>`;
  if(isAdmin())h+=`<p class="mu">Bạn có thể nhập kết quả, diễn biến trận đấu và đổi tên đội.</p>`;
  else if(myTeam()!==null){const i=myTeam();h+=`<p>Đội của bạn: ${lg(i)}<b>${tn(i)}</b></p><p class="mu">Cập nhật danh sách cầu thủ ở tab “Đội bóng”.</p>`}
  else{
    const free=S.teams.map((t,i)=>OWN[i]?'':`<div class="pl"><span>${lg(i)}${tn(i)}</span><button class="b p" data-act="claim" data-i="${i}">Nhận đội này</button></div>`).join('');
    h+=`<p>Chọn đội của bạn:</p>${free||'<p class="mu">Tất cả các đội đã có đội trưởng. Hãy liên hệ ban tổ chức.</p>'}`;
  }
  return h+`<div class="row"><button class="b" data-act="logout">Đăng xuất</button></div></div>`;
}
function render(){
  $nav.innerHTML=[['bxh','Xếp hạng'],['kq','Kết quả'],['doi','Đội bóng'],['acc',ME?esc(ME.name):'Đăng nhập']].map(([k,l])=>`<button data-act="tab" data-k="${k}" class="${tab===k?'on':''}">${l}</button>`).join('');
  if(!S&&tab!=='acc'){$app.innerHTML=`<p class="mu">${esc(msg||'Đang tải…')}</p>`;return}
  $app.innerHTML=tab==='bxh'?viewBxh():tab==='kq'?viewKq():tab==='doi'?viewDoi():viewAcc();
  if(tab==='kq'&&!isAdmin())$app.querySelectorAll('input,select,button.b,button.x').forEach(e=>{if(e.dataset.act!=='open')e.disabled=true});
  if(tab==='doi')$app.querySelectorAll('.card[data-t]').forEach(c=>{const ok=canTeam(+c.dataset.t);c.querySelectorAll('input,button.x,button.p').forEach(e=>{const nm=e.dataset.name!==undefined;if(nm?!isAdmin():!ok)e.disabled=true})});
}
const $nav=$('#nav'),$app=$('#app');
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,i=+b.dataset.i;
  const fail=x=>{msg=x.message;render()};
  if(a==='tab'){tab=b.dataset.k;msg=''}
  else if(a==='open'){openM=openM===i?null:i}
  else if(a==='addev'){
    const p=$('#ep').value;if(!p)return;
    S.matches[i].ev.push({t:$('#et').value,p,min:$('#em').value});save()}
  else if(a==='delev'){S.matches[i].ev.splice(+b.dataset.k,1);save()}
  else if(a==='addp'){
    const n=$('#pj'+i).value.trim();if(!n)return;
    S.teams[i].pl.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:n,no:$('#pn'+i).value.trim()});save()}
  else if(a==='delp'){const id=b.dataset.id;S.teams[i].pl=S.teams[i].pl.filter(p=>String(p.id)!==id);save()}
  else if(a==='login'||a==='register'){
    const p=a==='login'?'l':'r',body={username:$('#'+p+'u').value.trim(),password:$('#'+p+'p').value};
    if(a==='register')body.adminCode=$('#rc').value.trim();
    api('/api/auth?a='+a,{method:'POST',body}).then(()=>{msg='';tab='acc';return load()}).catch(fail);return}
  else if(a==='logout'){api('/api/auth?a=logout',{method:'POST',body:{}}).then(()=>{msg='';return load()}).catch(fail);return}
  else if(a==='claim'||a==='release'){api('/api/team',{method:'POST',body:{team:i,release:a==='release'}}).then(()=>{msg='';return load()}).catch(fail);return}
  render();
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;const f=e.target.closest&&e.target.closest('[data-form]');
  if(f){e.preventDefault();f.querySelector('[data-act]').click()}
});

document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.sc!==undefined){const v=t.value===''?null:Math.max(0,parseInt(t.value,10)||0);S.matches[+t.dataset.sc][t.dataset.s]=v;save();render()}
  else if(t.dataset.name!==undefined){S.teams[+t.dataset.name].name=t.value.trim()||'Đội '+(+t.dataset.name+1);save();render()}
  else if(t.id==='sr'){selR=+t.value;render()}
});
function rr(){const a=document.activeElement;if(a&&$app.contains(a)&&/^(INPUT|SELECT)$/.test(a.tagName)){pend=true;return}render()}
document.addEventListener('focusout',()=>{if(pend)setTimeout(()=>{const a=document.activeElement;if(!a||!$app.contains(a)||!/^(INPUT|SELECT)$/.test(a.tagName)){pend=false;render()}},0)});
render();
load();
setInterval(()=>{if(!timer&&!busy&&!document.hidden)load()},20000);
