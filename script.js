'use strict';
// ЛР №4. Зберігаємо оригінальне оформлення Bootstrap-сайту ЛР №2.
// Джерело даних — posts.json; резерв потрібен лише для запуску через file://.
const PAGE_SIZE = 9;
const VIEW_KEY = 'mandrivnyk_views_v4';
const EMAIL_KEY = 'mandrivnyk_subscribers_v4';
const $ = id => document.getElementById(id);
const state = {posts: [], category:'Усі', tags:new Set(), search:'', sort:'newest', page:1, visible:PAGE_SIZE, mode:'pages'};
let observer = null;
const localRead = (key, def) => {try {let v=JSON.parse(localStorage.getItem(key)); return v ?? def;} catch {return def;}};
const localWrite = (key, val) => {try {localStorage.setItem(key,JSON.stringify(val)); return true;} catch {return false;}};
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = n => new Intl.NumberFormat('uk-UA').format(n);
const date = s => {const d = new Date(`${s}T12:00:00`); return Number.isNaN(d.valueOf()) ? s : new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric'}).format(d);};
const views = p => Number(p.views || 0) + Number(localRead(VIEW_KEY,{})[p.id] || 0);
const regexEscape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function highlight(text) {
  const words=state.search.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return safe(text);
  const re=new RegExp(`(${words.map(regexEscape).join('|')})`, 'giu');
  return String(text).split(re).map(x=>words.some(w=>w.toLocaleLowerCase('uk')===x.toLocaleLowerCase('uk')) ? `<mark class="search-mark">${safe(x)}</mark>`:safe(x)).join('');
}
function card(p) {
  const col=document.createElement('div'); col.className='col-md-6 col-xl-4';
  col.innerHTML=`<article class="article-card"><img alt="${safe(p.country)}: краєвид подорожі" loading="lazy" src="${safe(p.image)}">
    <div class="article-content"><div class="d-flex justify-content-between align-items-center gap-2"><span class="meta">${safe(p.category)} · ${safe(date(p.date))}</span><span class="badge-topic">${safe(p.tags[0]||'Подорожі')}</span></div>
    <h3>${highlight(p.title)}</h3><p>${highlight(p.excerpt)}</p>
    <div class="article-stats"><strong>★ ${safe(Number(p.rating).toFixed(1))} / 5</strong><span>◉ <span data-view-id="${p.id}">${number(views(p))}</span> перегл.</span></div>
    <button class="article-open" type="button" data-open="${p.id}" aria-label="Читати статтю ${safe(p.title)}">Читати історію →</button></div></article>`;
  col.querySelector('img').addEventListener('error',e=>{e.target.src='placeholder.svg';},{once:true});
  return col;
}
function filtered() {
  let q=state.search.trim().toLocaleLowerCase('uk');
  return state.posts.filter(p =>
    (state.category==='Усі' || p.category===state.category) &&
    [...state.tags].every(t=>p.tags.includes(t)) &&
    (!q || `${p.title} ${p.excerpt}`.toLocaleLowerCase('uk').includes(q))
  ).sort((a,b)=>{
    if(state.sort==='popular') return views(b)-views(a) || b.date.localeCompare(a.date);
    if(state.sort==='rating') return b.rating-a.rating || views(b)-views(a);
    return b.date.localeCompare(a.date);
  });
}
function pagination(total) {
  const pages=Math.ceil(total/PAGE_SIZE), nav=$('pagination');
  nav.replaceChildren(); nav.hidden=state.mode!=='pages'||pages<2;
  if(nav.hidden)return;
  const make=(label,index,disabled=false,active=false)=>{
    const b=document.createElement('button'); b.type='button'; b.className='btn btn-sm btn-outline-success'+(active?' active':'');
    b.textContent=label; b.disabled=disabled;
    if(active)b.setAttribute('aria-current','page');
    b.setAttribute('aria-label',label==='←'?'Попередня сторінка':label==='→'?'Наступна сторінка':`Сторінка ${label}`);
    b.addEventListener('click',()=>{state.page=index;render();$('storiesHeading').scrollIntoView({behavior:'smooth'});});
    return b;
  };
  nav.append(make('←',Math.max(state.page-1,1),state.page===1));
  for(let i=1;i<=pages;i++)nav.append(make(String(i),i,false,state.page===i));
  nav.append(make('→',Math.min(state.page+1,pages),state.page===pages));
}
function render() {
  if(!state.posts.length)return;
  const posts=filtered(), total=posts.length;
  const shown=state.mode==='pages' ? posts.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE) : posts.slice(0,state.visible);
  $('articleGrid').replaceChildren(...shown.map(card));
  $('resultCount').textContent=`Знайдено статей: ${total} із ${state.posts.length}`;
  $('emptyState').hidden=total!==0;
  $('pagingControls').hidden=total===0;
  $('pagingSummary').textContent=total?`Показано ${shown.length} із ${total}`:'Немає результатів';
  document.querySelectorAll('[data-category]').forEach(b=>{const active=b.dataset.category===state.category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('[data-tag]').forEach(b=>{const active=state.tags.has(b.dataset.tag);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('filterSummary').textContent=`${state.category==='Усі'?'Усі напрямки':state.category}${state.tags.size?` · Теми: ${[...state.tags].join(', ')}`:''}`;
  $('resetFilters').disabled=state.category==='Усі'&&!state.tags.size&&!state.search;
  $('modePages').classList.toggle('active',state.mode==='pages'); $('modeInfinite').classList.toggle('active',state.mode==='infinite');
  pagination(total);
  const more=state.mode==='infinite'&&state.visible<total;
  $('loadMoreWrap').hidden=state.mode!=='infinite';
  $('loadMoreBtn').hidden=!more;
  $('loadMoreBtn').textContent=`Завантажити ще ${Math.min(PAGE_SIZE,total-state.visible)} історій ↓`;
  observer?.disconnect();
  if(more && 'IntersectionObserver' in window){
    observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting&&state.mode==='infinite'&&state.visible<filtered().length){state.visible+=PAGE_SIZE;render();}}, {rootMargin:'0px 0px 120px 0px'});
    observer.observe($('loadSentinel'));
  }
}
function resetPage(){state.page=1;state.visible=PAGE_SIZE;}
function clearFilters(){state.category='Усі';state.tags.clear();state.search='';$('searchInput').value='';resetPage();render();}
function renderTags(){
  const counts=new Map();state.posts.forEach(p=>p.tags.forEach(t=>counts.set(t,(counts.get(t)||0)+1)));
  const tags=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'uk')).slice(0,16);
  $('tagFilters').replaceChildren(...tags.map(([t,n])=>{const b=document.createElement('button');b.type='button';b.className='tag-filter';b.dataset.tag=t;b.textContent=`#${t} · ${n}`;b.addEventListener('click',()=>{if(state.tags.has(t))state.tags.delete(t);else state.tags.add(t);resetPage();render();});return b;}));
}
function renderSidebar(){
  const list=$('sidebarCategories'); list.replaceChildren(...[...new Set(state.posts.map(p=>p.category))].map(cat=>{
    const b=document.createElement('button');b.type='button';b.className='side-category';b.dataset.category=cat;
    const lbl=document.createElement('span');lbl.textContent=cat;const n=document.createElement('span');n.textContent=state.posts.filter(p=>p.category===cat).length;
    b.append(lbl,n);b.addEventListener('click',()=>{state.category=cat;resetPage();render();$('storiesHeading').scrollIntoView({behavior:'smooth'});});return b;
  }));
  const top=[...state.posts].sort((a,b)=>views(b)-views(a)).slice(0,3);
  $('popularPosts').replaceChildren(...top.map(p=>{
    const b=document.createElement('button');b.type='button';b.className='popular-item text-start w-100 border-0 bg-transparent';
    const img=document.createElement('img');img.src=p.image;img.loading='lazy';img.alt='';img.addEventListener('error',()=>img.src='placeholder.svg',{once:true});
    const wrap=document.createElement('span'),ttl=document.createElement('strong'),sub=document.createElement('small');
    ttl.textContent=p.title;sub.textContent=`${number(views(p))} переглядів`;wrap.append(ttl,sub);b.append(img,wrap);b.addEventListener('click',()=>showPost(p));return b;
  }));
}
function showPost(p){
  if(!p)return;
  const increments=localRead(VIEW_KEY,{}); increments[p.id]=(Number(increments[p.id])||0)+1;
  localWrite(VIEW_KEY,increments);
  $('modalLabel').textContent=p.title;
  $('modalMeta').textContent=`${p.author} · ${p.country} · ${date(p.date)} · ${p.readTime} · ★ ${p.rating.toFixed(1)}`;
  $('modalImg').src=p.image;$('modalImg').alt=`Краєвид: ${p.country}`;
  $('modalText').textContent=p.body;
  $('modalTags').replaceChildren(...p.tags.map(t=>{const el=document.createElement('span');el.className='badge-topic';el.textContent=`#${t}`;return el;}));
  $('modalViews').textContent=`◉ ${number(views(p))} переглядів`;
  window.bootstrap.Modal.getOrCreateInstance($('postModal')).show();
  render();renderSidebar();
}
function notice(message,kind='info'){$('dataNotice').innerHTML=`<div class="alert alert-${kind} py-2 small" role="status">${safe(message)}</div>`;}
async function loadPosts(){
  $('loadingState').hidden=false;$('errorState').hidden=true;
  try {
    const response=await fetch('./posts.json',{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const posts=await response.json();
    if(!Array.isArray(posts)||!posts.length)throw new Error('Порожній або некоректний JSON');
    state.posts=posts;
    $('dataNotice').replaceChildren();
  }catch(error){
    console.warn('Fetch posts.json:',error);
    // file:// має CORS-обмеження. Це не заважає демонстрації сайту.
    if(location.protocol==='file:' && Array.isArray(window.BLOG_FALLBACK)&&window.BLOG_FALLBACK.length){
      state.posts=window.BLOG_FALLBACK;
      notice('Попередній перегляд без сервера: статті взято з резервної копії. На GitHub Pages дані завантажуються через posts.json.','info');
    }else{
      $('errorState').hidden=false;
      $('articleGrid').replaceChildren();
      $('resultCount').textContent='Статті тимчасово недоступні';
      $('loadingState').hidden=true;
      return;
    }
  }
  $('loadingState').hidden=true;
  state.posts=state.posts.filter(p=>Number.isInteger(p.id)&&typeof p.title==='string'&&Array.isArray(p.tags));
  renderTags();renderSidebar();render();
  $('latestPost').disabled=false;
}
$('articleGrid').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(!b)return;showPost(state.posts.find(p=>p.id===Number(b.dataset.open)));});
document.querySelectorAll('#categories [data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;resetPage();render();}));
$('searchInput').addEventListener('input',e=>{state.search=e.target.value;resetPage();render();});
$('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;resetPage();render();});
$('clearSearch').addEventListener('click',clearFilters);$('resetFilters').addEventListener('click',clearFilters);
$('modePages').addEventListener('click',()=>{state.mode='pages';resetPage();render();});
$('modeInfinite').addEventListener('click',()=>{state.mode='infinite';resetPage();render();});
$('loadMoreBtn').addEventListener('click',()=>{state.visible+=PAGE_SIZE;render();});
$('retryButton').addEventListener('click',loadPosts);
$('latestPost').addEventListener('click',()=>showPost(state.posts[0]));
$('newsletterForm').addEventListener('submit',e=>{
  e.preventDefault();const input=$('email');
  if(!input.reportValidity())return;
  const email=input.value.trim().toLocaleLowerCase('uk');
  const valid=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email);
  if(!valid){input.setCustomValidity('Введіть коректну адресу електронної пошти');input.reportValidity();return;}
  const subs=localRead(EMAIL_KEY,[]);
  if(subs.includes(email)){$('subscribeNotice').textContent='Цю адресу вже збережено в браузері.';return;}
  subs.push(email);
  $('subscribeNotice').textContent=localWrite(EMAIL_KEY,subs)?'Email успішно збережено в цьому браузері (демонстраційна підписка без надсилання листів).':'Не вдалося зберегти email: браузер обмежив локальне сховище.';
  if(subs.includes(email))input.value='';
});
$('email').addEventListener('input',e=>e.target.setCustomValidity(''));
loadPosts();
