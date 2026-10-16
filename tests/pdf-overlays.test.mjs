import test from 'node:test';
import assert from 'node:assert/strict';
import {PDF_FIELDS,overlayAgreement,signaturePNG} from '../agreements/pdf-overlays.js';

test('all agreement templates use transparent overlays on their measured blanks',async()=>{
 for(const kind of Object.keys(PDF_FIELDS)){
  const calls=[[],[]],images=[];
  const pages=calls.map((values,page)=>({drawText:(text,options)=>values.push({text,...options}),drawImage:(image,options)=>images.push({page,...options}),drawRectangle(){throw Error('Opaque background')}}));
  const doc={getPages:()=>pages,embedFont:async()=>({widthOfTextAtSize:(text,size)=>text.length*size/2}),embedPng:async()=>({width:300,height:60})};
  await overlayAgreement({doc,PDFLib:{StandardFonts:{Helvetica:'Helvetica'},rgb:()=>({})},kind,assignment:{effective_date:'2026-10-19',work_location:'Nevada'},name:'Jordan Morgan',date:'2026-10-15',signature:'data:image/png;base64,AA=='});
  assert.equal(calls[0][0].text,'Jordan Morgan');
  if(kind==='trial-hourly'){
   assert.equal(calls[0].find(v=>v.text==='Nevada').x,182.55);
   assert.equal(calls[0].find(v=>v.text==='Nevada').y,629.85);
   assert.equal(images[0].y,127.85);
  }
  if(kind==='trial-commission')assert.equal(images[0].y,329.39);
  if(kind.startsWith('manager-')){assert.equal(calls[1].length,0);assert.equal(images.length,0);}
  else {assert.equal(images.length,1);assert.equal(images[0].page,1);assert.equal(calls[1][0].text,'10/15/26');}
 }
});

test('signature cropping preserves alpha and excludes empty canvas margins',()=>{
 const pixels=new Uint8ClampedArray(20*10*4);pixels[(5*20+10)*4+3]=255;
 const canvas={width:20,height:10,getContext:()=>({getImageData:()=>({data:pixels})})};
 let args;const crop={getContext:()=>({drawImage:(...values)=>{args=values}}),toDataURL:type=>type};
 assert.equal(signaturePNG(canvas,()=>crop),'image/png');
 assert.equal(crop.width,5);assert.equal(crop.height,5);
 assert.deepEqual(args.slice(1),[8,3,5,5,0,0,5,5]);
 pixels.fill(0);assert.throws(()=>signaturePNG(canvas,()=>crop),/draw your signature/);
});
