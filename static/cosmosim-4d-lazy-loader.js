(()=>{
'use strict';
if(window.__COSMOSIM_4D_LAZY_LOADER__)return;
window.__COSMOSIM_4D_LAZY_LOADER__=true;
const FOUR_D='./cosmosim-blackhole-4d-v4.js?v=20261028-lazy-gated2';
let loading=null,loaded=false;
const buttonStyle='width:100%;margin-top:8px;background:#090d15;border:1px solid #e9edf7;color:#fff;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer';
function activeId(){return document.querySelector('.simChoice.active')?.dataset.sim||'blackhole'}
function targetPanel(){return activeId()==='blackhole'?document.getElementById('panelBody'):document.getElementById('simControls')}
function isSupported(id){return id!=='destruction'}
function is4DOn(){return typeof window.__COSMOSIM_4D_IS_ACTIVE__==='function'&&window.__COSMOSIM_4D_IS_ACTIVE__()}
function ensureButton(){
 const panel=targetPanel();if(!panel)return;
 let b=document.getElementById('cosmosim4dToggle');
 if(!b){
  b=document.createElement('button');b.id='cosmosim4dToggle';b.type='button';b.className='secondary';b.style.cssText=buttonStyle;b.textContent='◉ 4D VISION · OFF';b.setAttribute('aria-pressed','false');b.addEventListener('click',activateSelected);
 }
 if(b.parentElement!==panel)panel.appendChild(b);
 const supported=isSupported(activeId());b.disabled=!supported;b.style.opacity=supported?'1':'.45';b.title=supported?'Start this simulation\'s 4D Vision render job':'4D Vision is not connected to the standalone Destruction Lab renderer';
}
async function load4D(){
 if(loaded)return;
 if(loading)return loading;
 loading=import(FOUR_D).then(()=>{loaded=true}).catch(err=>{loading=null;throw err});
 return loading;
}
async function activateSelected(){
 const id=activeId();if(!isSupported(id))return;
 if(is4DOn()){
  window.__COSMOSIM_4D_RENDER_REQUESTED__=false;
  if(typeof window.__COSMOSIM_4D_SET_ACTIVE__==='function')window.__COSMOSIM_4D_SET_ACTIVE__(false);
  sync();
  return;
 }
 const b=document.getElementById('cosmosim4dToggle');if(b){b.disabled=true;b.textContent='◉ 4D VISION · STARTING…';}
 try{
  // This is the render-job boundary: no 4D module is downloaded or executed before this click.
  window.__COSMOSIM_4D_RENDER_REQUESTED__=true;
  window.dispatchEvent(new CustomEvent('cosmosim-4d-render-request',{detail:{simulation:id,mode:'single-simulation-on-demand'}}));
  await load4D();
  if(typeof window.__COSMOSIM_4D_SET_ACTIVE__!=='function')throw new Error('4D renderer controller unavailable');
  window.__COSMOSIM_4D_SET_ACTIVE__(true);
 }catch(err){
  window.__COSMOSIM_4D_RENDER_REQUESTED__=false;
  console.error('COSMOSIM 4D lazy renderer failed to start:',err);
  if(b){b.disabled=false;b.textContent='◉ 4D VISION · OFF';}
 }
}
function sync(){
 ensureButton();const b=document.getElementById('cosmosim4dToggle');if(!b)return;
 const on=is4DOn();b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.textContent=on?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';
 if(!on)b.disabled=!isSupported(activeId());
}
document.addEventListener('click',e=>{if(e.target.closest?.('.simChoice[data-sim]'))setTimeout(sync,0)},true);
new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
window.addEventListener('cosmosim-4d-render-request',e=>{window.__COSMOSIM_4D_LAST_RENDER_JOB__=e.detail||null});
setInterval(sync,1000);
sync();
})();
