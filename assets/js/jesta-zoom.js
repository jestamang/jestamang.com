/* Jestamang shared zoom controller (comix reader and lightbox, photos lightbox).
   window.jestaMakeZoom(img, frame, opts): pinch with two pointers, double tap, drag to pan, optional wheel;
   scale 1 is "fit". The pan is clamped so the picture never leaves the frame; smaller than the frame it
   stays centred. Zoom is capped near 1.6 times the source resolution.
   opts: wheel (bool), touchOnly (ignore mouse gestures except a plain click), onTap(x, y, pointerType),
   onChange(scale), tapScale (default 2.5).
   Returns { reset(anim), isZoomed(), zoomTo(scale, cx, cy, anim), zoomBy(factor, anim), scale() }.
   Pages must give the picture the class "zoomable" styles: touch-action none, transform-origin 0 0. */
(function () {
  'use strict';
function makeZoom(el,frame,opts){
  opts=opts||{};var scale=1,tx=0,ty=0,pts=new Map(),pinch=null,drag=null,moved=false,lastTap=0,lastTapX=0,lastTapY=0,tapTimer=null,downAt=0;
  el.classList.add('zoomable');
  function maxScale(){var base=el.offsetWidth||1;var nat=el.naturalWidth||1275;var dpr=window.devicePixelRatio||1;return Math.max(2.5,Math.min(6,(nat/(base*dpr))*1.6));}
  /* the untransformed box, from offset geometry so a running transition never skews the maths */
  function layout(){var op=el.offsetParent||frame;var pr=op.getBoundingClientRect();return {left:pr.left+el.offsetLeft-op.scrollLeft,top:pr.top+el.offsetTop-op.scrollTop,w:el.offsetWidth,h:el.offsetHeight};}
  function clamp(){var fr=frame.getBoundingClientRect(),L=layout(),sw=L.w*scale,sh=L.h*scale;
    if(sw<=fr.width+0.5){tx=fr.left-L.left+(fr.width-sw)/2;}else{tx=Math.min(fr.left-L.left,Math.max(fr.right-L.left-sw,tx));}
    if(sh<=fr.height+0.5){ty=fr.top-L.top+(fr.height-sh)/2;}else{ty=Math.min(fr.top-L.top,Math.max(fr.bottom-L.top-sh,ty));}
    if(scale<=1.001){scale=1;tx=0;ty=0;}}
  function apply(anim){el.style.transition=anim?'transform 0.25s ease':'none';el.style.transform=(scale===1&&!tx&&!ty)?'':'translate('+tx.toFixed(2)+'px,'+ty.toFixed(2)+'px) scale('+scale.toFixed(4)+')';frame.classList.toggle('zoomed',scale>1.001);if(opts.onChange)opts.onChange(scale);}
  function zoomTo(ns,cx,cy,anim){ns=Math.min(maxScale(),Math.max(1,ns));var L=layout();var curLeft=L.left+tx,curTop=L.top+ty;if(cx==null){cx=curLeft+L.w*scale/2;cy=curTop+L.h*scale/2;}var px=(cx-curLeft)/scale,py=(cy-curTop)/scale;scale=ns;tx=cx-L.left-px*ns;ty=cy-L.top-py*ns;clamp();apply(anim!==false);}
  function reset(anim){scale=1;tx=0;ty=0;apply(anim!==false);}
  function isZoomed(){return scale>1.001;}
  function wants(e){return !(opts.touchOnly&&e.pointerType==='mouse');}
  var mouseDown=null;
  el.addEventListener('pointerdown',function(e){if(!(opts.touchOnly&&e.pointerType==='mouse')||e.button!==0)return;mouseDown={x:e.clientX,y:e.clientY,t:Date.now()};});
  el.addEventListener('pointerup',function(e){if(!(opts.touchOnly&&e.pointerType==='mouse')||!mouseDown)return;var d=Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y),dt=Date.now()-mouseDown.t;mouseDown=null;if(d<6&&dt<600&&opts.onTap)opts.onTap(e.clientX,e.clientY,'mouse');});
  el.addEventListener('pointerdown',function(e){if(!wants(e))return;if(e.pointerType==='mouse'&&e.button!==0)return;try{el.setPointerCapture(e.pointerId);}catch(x){}pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;downAt=Date.now();
    if(pts.size===2){var a=[].concat.apply([],[Array.from(pts.values())]);pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),s0:scale,mx:(a[0].x+a[1].x)/2,my:(a[0].y+a[1].y)/2};drag=null;}
    else if(pts.size===1){drag={x:e.clientX,y:e.clientY,tx0:tx,ty0:ty};}
    if(scale>1.001)e.preventDefault();});
  el.addEventListener('pointermove',function(e){if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pts.size>=2){var a=Array.from(pts.values());var d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),mx=(a[0].x+a[1].x)/2,my=(a[0].y+a[1].y)/2;tx+=mx-pinch.mx;ty+=my-pinch.my;pinch.mx=mx;pinch.my=my;moved=true;zoomTo(pinch.s0*(d/(pinch.d||1)),mx,my,false);el.classList.add('dragging');return;}
    if(drag&&pts.size===1){var dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)>4||Math.abs(dy)>4)moved=true;if(scale>1.001){tx=drag.tx0+dx;ty=drag.ty0+dy;clamp();apply(false);el.classList.add('dragging');e.preventDefault();}}});
  function up(e){if(!pts.has(e.pointerId))return;var p=pts.get(e.pointerId);pts.delete(e.pointerId);el.classList.remove('dragging');
    if(pinch){if(pts.size<2){pinch=null;var rest=Array.from(pts.values())[0];drag=rest?{x:rest.x,y:rest.y,tx0:tx,ty0:ty}:null;}return;}
    drag=null;if(e.type!=='pointerup'||moved||Date.now()-downAt>350)return;
    var now=Date.now(),x=p.x,y=p.y;
    if(e.pointerType==='mouse'){if(opts.onTap)opts.onTap(x,y,'mouse');return;}
    if(now-lastTap<320&&Math.hypot(x-lastTapX,y-lastTapY)<40){clearTimeout(tapTimer);tapTimer=null;lastTap=0;if(scale>1.001)reset(true);else zoomTo(opts.tapScale||2.5,x,y,true);return;}
    lastTap=now;lastTapX=x;lastTapY=y;clearTimeout(tapTimer);tapTimer=setTimeout(function(){tapTimer=null;if(opts.onTap)opts.onTap(x,y,'touch');},320);}
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  /* Safari: keep a two-finger pinch on the art from zooming the whole page */
  el.addEventListener('touchmove',function(e){if(e.touches&&e.touches.length>1)e.preventDefault();},{passive:false});
  el.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
  if(opts.wheel){frame.addEventListener('wheel',function(e){if(!frame.contains(e.target)&&e.target!==frame)return;e.preventDefault();var f=Math.exp(-e.deltaY*(e.deltaMode===1?0.05:0.0015));zoomTo(scale*f,e.clientX,e.clientY,false);},{passive:false});}
  window.addEventListener('resize',function(){if(scale>1.001){clamp();apply(false);}});
  return {_pts:function(){return pts.size;},reset:reset,isZoomed:isZoomed,zoomTo:zoomTo,zoomBy:function(f,anim){zoomTo(scale*f,null,null,anim);},scale:function(){return scale;}};
}
  window.jestaMakeZoom = makeZoom;
})();
