/*! RORUBARU — © 2026 We Rolling Limited. All rights reserved. Content, photos, video and design may not be copied or reused without permission. */
(function(w,d){if(w.__roruGuard)return;w.__roruGuard=1;
var ED="input,textarea,select,[contenteditable]:not([contenteditable=false])";
function el(t){return t&&t.nodeType===3?t.parentElement:t}
function ed(t){t=el(t);return !!(t&&t.closest&&t.closest(ED))}
var s=d.createElement("style");s.id="roru-guard-css";
s.textContent="html,body{-webkit-user-select:none;-moz-user-select:none;user-select:none}img,video,canvas,picture,svg{-webkit-touch-callout:none;-webkit-user-drag:none;user-drag:none}input,textarea,select,[contenteditable]{-webkit-user-select:text;-moz-user-select:text;user-select:text;-webkit-touch-callout:default}";
(d.head||d.documentElement).appendChild(s);
function stop(e){if(e.cancelable)e.preventDefault()}
d.addEventListener("contextmenu",function(e){if(!ed(e.target))stop(e)},true);
d.addEventListener("dragstart",function(e){if(!ed(e.target))stop(e)},true);
d.addEventListener("selectstart",function(e){if(!ed(e.target))stop(e)},true);
function cp(e){if(!(ed(e.target)||ed(d.activeElement)))stop(e)}
d.addEventListener("copy",cp,true);d.addEventListener("cut",cp,true);
d.addEventListener("keydown",function(e){if(!(e.ctrlKey||e.metaKey)||e.altKey)return;var k=(e.key||"").toLowerCase();
if(k==="s"||k==="u"||k==="p"){stop(e);return}
if((k==="c"||k==="a"||k==="x")&&!ed(e.target))stop(e)},true);
function vid(v){try{v.setAttribute("controlslist","nodownload");v.setAttribute("disablepictureinpicture","");v.disablePictureInPicture=true}catch(_){}}
function scan(n){if(!n||n.nodeType!==1)return;if(n.tagName==="VIDEO")vid(n);else if(n.getElementsByTagName){var a=n.getElementsByTagName("video");for(var i=0;i<a.length;i++)vid(a[i])}}
function init(){scan(d.documentElement);if(w.MutationObserver)new MutationObserver(function(m){for(var i=0;i<m.length;i++){var a=m[i].addedNodes;for(var j=0;j<a.length;j++)scan(a[j])}}).observe(d.documentElement,{childList:true,subtree:true})}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})(window,document);
