const STORAGE_KEY="alcateia_mcs_v1";
const DEMO_MCS=[
 {id:"1",nome:"MC ALCATEIA",instagram:"@alcateia",pix:"",participacoes:10,titulos:3,derrotas:4,twolalas:7,pontos:42,bio:"MC da cena local.",melhorRima:"[Sua melhor rima]",foto:""},
 {id:"2",nome:"MC PARINTINS",instagram:"@parintins",pix:"",participacoes:9,titulos:2,derrotas:4,twolalas:5,pontos:36,bio:"Representante da cultura e da rima.",melhorRima:"[Sua melhor rima]",foto:""},
 {id:"3",nome:"MC AMAZONAS",instagram:"@amazonas",pix:"",participacoes:8,titulos:1,derrotas:5,twolalas:8,pontos:31,bio:"MC em destaque.",melhorRima:"[Sua melhor rima]",foto:""},
 {id:"4",nome:"MC TUPÃ",instagram:"@tupa",pix:"",participacoes:8,titulos:1,derrotas:6,twolalas:4,pontos:27,bio:"MC da Alcatéia.",melhorRima:"[Sua melhor rima]",foto:""}
];

let mcs=loadMcs();
let editingId=null;
let photoData="";

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const saveMcs=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(mcs));
function loadMcs(){try{const d=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(d)?d:DEMO_MCS}catch(e){return DEMO_MCS}}

function toast(msg){
 const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);
 window.__toast=setTimeout(()=>t.classList.remove("show"),2500);
}

function switchView(view){
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 const el=$("#"+view+"View");if(el)el.classList.add("active");
 document.querySelectorAll(".side-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 $("#sidebar").classList.remove("open");
 if(view==="mcs")renderMcs();
 if(view==="ranking")renderFullRanking();
 if(view==="dashboard")renderDashboard();
}

function renderDashboard(){
 const points=mcs.reduce((s,m)=>s+Number(m.pontos||0),0);
 const titles=mcs.reduce((s,m)=>s+Number(m.titulos||0),0);
 const tw=mcs.reduce((s,m)=>s+Number(m.twolalas||0),0);
 $("#metricMcs").textContent=mcs.length;
 $("#metricPoints").textContent=points;
 $("#metricTitles").textContent=titles;
 $("#metricTwolalas").textContent=tw;
 const sorted=[...mcs].sort((a,b)=>b.pontos-a.pontos).slice(0,8);
 $("#dashRanking").innerHTML=sorted.map((m,i)=>`<div class="mini-rank"><b>${i+1}º</b><strong>${esc(m.nome)}</strong><span>${m.pontos} pts</span></div>`).join("")||"<p>Cadastre um MC.</p>";
}

function renderMcs(){
 const query=$("#searchInput").value.trim().toLowerCase();
 const sort=$("#sortSelect").value;
 let list=mcs.filter(m=>(m.nome+" "+(m.instagram||"")).toLowerCase().includes(query));
 list.sort((a,b)=>sort==="nome"?a.nome.localeCompare(b.nome):Number(b[sort]||0)-Number(a[sort]||0));
 $("#emptyState").hidden=list.length!==0;
 $("#mcAdminList").innerHTML=list.map(m=>{
   const aprove=m.participacoes?Math.round(((m.participacoes-m.derrotas)/m.participacoes)*100):0;
   return `<article class="mc-row">
    <div class="mc-avatar">${m.foto?`<img src="${m.foto}" alt="" style="width:100%;height:100%;object-fit:cover">`:"FOTO<br>MC"}</div>
    <div><h3>${esc(m.nome)}</h3><p>${esc(m.instagram||"Instagram não informado")} • ${aprove}% aproveitamento</p>
    <div class="mc-stats"><span>${m.pontos} PONTOS</span><span>${m.participacoes} PARTICIPAÇÕES</span><span>${m.titulos} TÍTULOS</span><span>${m.derrotas} DERROTAS</span><span>${m.twolalas} TWO LALAS</span></div></div>
    <div class="row-actions"><button class="icon-btn" data-edit="${m.id}" title="Editar">✎ EDITAR</button><button class="icon-btn delete" data-delete="${m.id}" title="Excluir">🗑</button></div>
   </article>`;
 }).join("");
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEditor(b.dataset.edit));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteMc(b.dataset.delete));
}

function renderFullRanking(){
 const sorted=[...mcs].sort((a,b)=>b.pontos-a.pontos);
 $("#fullRanking").innerHTML=sorted.map((m,i)=>`<div class="full-rank">
  <div class="position">${i+1}º</div><div><strong>${esc(m.nome)}</strong><small>${i<3?"PÓDIO":i<8?"CLASSIFICADO":"RANKING"}</small></div>
  <div><strong>${m.pontos}</strong><small>PONTOS</small></div><div><strong>${m.titulos}</strong><small>TÍTULOS</small></div>
  <div><strong>${m.twolalas}</strong><small>TWO LALAS</small></div><div><strong>${m.participacoes}</strong><small>PARTICIPAÇÕES</small></div>
 </div>`).join("")||"<p>Nenhum MC cadastrado.</p>";
}

function resetForm(){
 $("#mcForm").reset();editingId=null;photoData="";
 $("#mcId").value="";$("#modalTitle").textContent="NOVO MC";$("#modalEyebrow").textContent="CADASTRO";
 $("#photoPreview").innerHTML="FOTO<br>DO MC";$("#previewName").textContent="NOME DO MC";$("#previewMeta").textContent="0 pontos • 0 títulos • 0 Twolalas";
}

function openEditor(id=null){
 resetForm();
 editingId=id;
 if(id){
  const m=mcs.find(x=>x.id===id);if(!m)return;
  $("#modalTitle").textContent="EDITAR MC";$("#modalEyebrow").textContent="EDIÇÃO";
  $("#mcId").value=m.id;$("#mcNome").value=m.nome||"";$("#mcInstagram").value=m.instagram||"";
  $("#mcPix").value=m.pix||"";$("#mcParticipacoes").value=m.participacoes||0;$("#mcTitulos").value=m.titulos||0;
  $("#mcDerrotas").value=m.derrotas||0;$("#mcTwolalas").value=m.twolalas||0;$("#mcPontos").value=m.pontos||0;
  $("#mcBio").value=m.bio||"";$("#mcRima").value=m.melhorRima||"";photoData=m.foto||"";
  if(photoData)$("#photoPreview").innerHTML=`<img src="${photoData}" alt="" style="width:100%;height:100%;object-fit:cover">`;
 }
 updatePreview();
 $("#mcModal").classList.add("open");$("#mcModal").setAttribute("aria-hidden","false");
}

function updatePreview(){
 $("#previewName").textContent=$("#mcNome").value||"NOME DO MC";
 $("#previewMeta").textContent=`${$("#mcPontos").value||0} pontos • ${$("#mcTitulos").value||0} títulos • ${$("#mcTwolalas").value||0} Twolalas`;
}

function deleteMc(id){
 const m=mcs.find(x=>x.id===id);if(!m)return;
 if(!confirm(`Excluir o cadastro de ${m.nome}? Esta ação pode ser desfeita apenas se você tiver um backup.`))return;
 mcs=mcs.filter(x=>x.id!==id);saveMcs();renderMcs();renderDashboard();renderFullRanking();toast("MC excluído.");
}

function exportData(){
 const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),mcs},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="alcateia-mcs-backup.json";a.click();URL.revokeObjectURL(a.href);toast("Backup exportado.");
}

function importData(file){
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const data=JSON.parse(reader.result);
   if(!Array.isArray(data.mcs))throw new Error();
   mcs=data.mcs;saveMcs();renderMcs();renderDashboard();renderFullRanking();toast("Dados importados com sucesso.");
  }catch(e){toast("Arquivo inválido.");}
 };
 reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded",()=>{
 renderDashboard();renderMcs();renderFullRanking();

 document.querySelectorAll(".side-link").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
 document.querySelectorAll("[data-view-link]").forEach(b=>b.onclick=()=>switchView(b.dataset.viewLink));

 $("#newMcButton").onclick=()=>openEditor();
 $("#newMcFromDash").onclick=()=>{switchView("mcs");openEditor()};
 $("#quickNewMc").onclick=()=>{switchView("mcs");openEditor()};
 $("#quickExport").onclick=exportData;
 $("#quickImport").onclick=()=>$("#importFile").click();
 $("#importFile").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
 $("#quickReset").onclick=()=>{
   if(confirm("Restaurar os dados de demonstração? Os dados atuais serão substituídos.")){mcs=DEMO_MCS.map(x=>({...x}));saveMcs();renderMcs();renderDashboard();renderFullRanking();toast("Dados demo restaurados.");}
 };
 $("#searchInput").oninput=renderMcs;$("#sortSelect").onchange=renderMcs;
 $("#closeModal").onclick=()=>$("#mcModal").classList.remove("open");
 $("#cancelForm").onclick=()=>$("#mcModal").classList.remove("open");
 $("#mcModal").onclick=e=>{if(e.target.id==="mcModal")$("#mcModal").classList.remove("open")};
 $("#menuButton").onclick=()=>$("#sidebar").classList.toggle("open");

 ["mcNome","mcPontos","mcTitulos","mcTwolalas"].forEach(id=>$("#"+id).addEventListener("input",updatePreview));

 $("#mcFoto").onchange=e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.size>2*1024*1024){toast("Use uma foto de até 2 MB.");e.target.value="";return;}
  const reader=new FileReader();reader.onload=()=>{photoData=reader.result;$("#photoPreview").innerHTML=`<img src="${photoData}" alt="" style="width:100%;height:100%;object-fit:cover">`};reader.readAsDataURL(file);
 };

 $("#mcForm").onsubmit=e=>{
  e.preventDefault();
  const nome=$("#mcNome").value.trim();if(!nome){toast("Informe o nome artístico.");return}
  const data={id:editingId||crypto.randomUUID(),nome,instagram:$("#mcInstagram").value.trim(),pix:$("#mcPix").value.trim(),
   participacoes:+$("#mcParticipacoes").value||0,titulos:+$("#mcTitulos").value||0,derrotas:+$("#mcDerrotas").value||0,
   twolalas:+$("#mcTwolalas").value||0,pontos:+$("#mcPontos").value||0,bio:$("#mcBio").value.trim(),melhorRima:$("#mcRima").value.trim(),foto:photoData};
  if(editingId)mcs=mcs.map(m=>m.id===editingId?data:m);else mcs.push(data);
  saveMcs();renderMcs();renderDashboard();renderFullRanking();$("#mcModal").classList.remove("open");
  toast(editingId?"MC atualizado com sucesso!":"MC cadastrado com sucesso!");
  editingId=null;
 };
});