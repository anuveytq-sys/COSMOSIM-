(()=>{
'use strict';
if(window.__COSMOSIM_4D_LAZY_LOADER__)return;
window.__COSMOSIM_4D_LAZY_LOADER__=true;
const FOUR_D='./cosmosim-blackhole-4d-v4.js?v=20261028-resume-simulations-fix1';
let loading=null,loaded=false;
const buttonStyle='width:100%;margin-top:8px;background:#090d15;border:1px solid #e9edf7;color:#fff;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer';
function isBlackHole(){return (document.querySelector('.simChoice.active')?.dataset.sim||'blackhole')==='blackhole'}
function is4DOn(){return typeof window.__COSMOSIM_4D_IS_ACTIVE__==='function'&&window.__COSMOSIM_4D_IS_ACTIVE__()}
function ensureButton(){
 const old=document.getElementById('cosmosim4dToggle');
 if(!isBlackHole()){
  if(old)old.remove();
  return;
 }
 const panel=document.getElementById('panelBody');if(!panel)return;
 let b=old;
 if(!b){
  b=document.createElement('button');b.id='cosmosim4dToggle';b.type='button';b.className='secondary';b.style.cssText=buttonStyle;b.textContent='◉ 4D VISION · OFF';b.setAttribute('aria-pressed','false');b.addEventListener('click',activateBlackHole);
 }
 if(b.parentElement!==panel)panel.appendChild(b);
 b.disabled=false;b.style.opacity='1';b.title='Open the original Black Hole-only 4D Vision renderer';
}
async function load4D(){
 if(loaded)return;
 if(loading)return loading;
 loading=import(FOUR_D).then(()=>{loaded=true}).catch(err=>{loading=null;throw err});
 return loading;
}
async function activateBlackHole(){
 if(!isBlackHole())return;
 const b=document.getElementById('cosmosim4dToggle');
 if(is4DOn()){
  window.__COSMOSIM_4D_RENDER_REQUESTED__=false;
  window.__COSMOSIM_4D_SET_ACTIVE__?.(false);
  sync();
  return;
 }
 if(b){b.disabled=true;b.textContent='◉ 4D VISION · STARTING…';}
 try{
  window.__COSMOSIM_4D_RENDER_REQUESTED__=true;
  window.dispatchEvent(new CustomEvent('cosmosim-4d-render-request',{detail:{simulation:'blackhole',mode:'blackhole-only-on-demand'}}));
  await load4D();
  if(typeof window.__COSMOSIM_4D_SET_ACTIVE__!=='function')throw new Error('Black Hole 4D renderer controller unavailable');
  window.__COSMOSIM_4D_RENDER_REQUESTED__=false;
  window.__COSMOSIM_4D_SET_ACTIVE__(true);
  sync();
 }catch(err){
  window.__COSMOSIM_4D_RENDER_REQUESTED__=false;
  console.error('COSMOSIM Black Hole 4D renderer failed to start:',err);
  if(b){b.disabled=false;b.textContent='◉ 4D VISION · OFF';}
 }
}
function sync(){
 ensureButton();
 const b=document.getElementById('cosmosim4dToggle');if(!b)return;
 const on=is4DOn();b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.textContent=on?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';b.disabled=false;
}
document.addEventListener('click',e=>{if(e.target.closest?.('.simChoice[data-sim]'))setTimeout(sync,0)},true);
window.addEventListener('cosmosim-4d-render-request',e=>{window.__COSMOSIM_4D_LAST_RENDER_JOB__=e.detail||null});
sync();
})();
