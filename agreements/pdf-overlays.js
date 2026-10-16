// PDF coordinates measured from the original templates, in points from bottom-left.
// Fields are [x, baseline, width]. No background paint is added to the document.
const hourly={name:[239.73,715.89,144.56],start:[100.23,690.89,77.84],location:[325.31,690.89,100.08],signature:[149.14,369.89,144.56],date:[323.16,369.89,77.84]};
const manager={name:[215.90,670.20,117],start:[107.32,654.95,54.60],location:[233.06,654.95,97.50]};
export const PDF_FIELDS={
 'trial-hourly':{name:[234.20,672.35,155.70],start:[95.51,650.35,60.55],end:[210.71,650.35,60.55],location:[180.55,628.35,173],signature:[138.74,126.35,147.05],date:[323.13,126.35,56.22]},
 'trial-commission':{name:[239.73,715.89,227.96],start:[99.68,690.89,77.84],end:[228.09,690.89,77.84],location:[453.17,690.89,77.84],signature:[149.14,327.89,189.04],date:[367.64,327.89,77.84]},
 'hourly-10':hourly,'hourly-20':hourly,
 commission:{...hourly,signature:[149.14,344.89,144.56],date:[323.16,344.89,77.84]},
 'manager-10':manager,'manager-20':manager
};
export const pdfText=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?').trim();
export function fittedText(value,font,width,size=9){
 let text=pdfText(value);
 while(size>6.5&&font.widthOfTextAtSize(text,size)>width)size=Math.max(6.5,size-.25);
 if(font.widthOfTextAtSize(text,size)>width){
  while(text&&font.widthOfTextAtSize(text+'...',size)>width)text=text.slice(0,-1);
  text+='...';
 }
 return {text,size};
}
export async function overlayAgreement({doc,PDFLib,kind,assignment,name,date,signature}){
 const fields=PDF_FIELDS[kind];if(!fields)throw Error('No verified PDF layout for this agreement.');
 const pages=doc.getPages(),first=pages[0],last=pages[pages.length-1];
 const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica),color=PDFLib.rgb(.07,.16,.29);
 const shortDate=value=>{const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[2]+'/'+m[3]+'/'+m[1].slice(2):String(value||'');};
 function text(page,field,value){
  const [x,y,width]=field,fit=fittedText(value,font,width-4);
  page.drawText(fit.text,{x:x+2,y:y+1.5,size:fit.size,font,color});
 }
 text(first,fields.name,name);text(first,fields.start,shortDate(assignment.effective_date));
 text(first,fields.location,assignment.work_location);
 if(fields.end){const end=new Date(assignment.effective_date+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+13);text(first,fields.end,shortDate(end.toISOString().slice(0,10)));}
 // Manager outlines have no signature/date blanks on the last page.
 // Their acknowledgment name and date belong on the appended audit record.
 if(fields.signature){
  if(!signature)throw Error('Draw your signature before generating the PDF.');
  const bytes=Uint8Array.from(atob(signature.split(',')[1]),c=>c.charCodeAt(0));
  const image=await doc.embedPng(bytes),[x,y,width]=fields.signature;
  const scale=Math.min((width-4)/image.width,22/image.height);
  last.drawImage(image,{x:x+2,y:y+1.5,width:image.width*scale,height:image.height*scale});
  text(last,fields.date,shortDate(date));
 }
}

// Keep the canvas alpha channel; remove only empty margins, never paint a fill.
export function signaturePNG(canvas,createCanvas=()=>document.createElement('canvas')){
 const {width,height}=canvas,ctx=canvas.getContext('2d');
 const pixels=ctx.getImageData(0,0,width,height).data;
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 if(right<left)throw Error('Please draw your signature.');
 left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(width-1,right+2);bottom=Math.min(height-1,bottom+2);
 const crop=createCanvas();crop.width=right-left+1;crop.height=bottom-top+1;
 crop.getContext('2d').drawImage(canvas,left,top,crop.width,crop.height,0,0,crop.width,crop.height);
 return crop.toDataURL('image/png');
}
