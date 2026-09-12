const horses = [
 {no:1,name:"サクラ",speed:86,stamina:82,accel:78,consistency:80},
 {no:2,name:"ブルー",speed:79,stamina:91,accel:72,consistency:88},
 {no:3,name:"ライト",speed:92,stamina:74,accel:91,consistency:71},
 {no:4,name:"グリーン",speed:83,stamina:86,accel:84,consistency:85},
 {no:5,name:"スター",speed:88,stamina:79,accel:87,consistency:76},
 {no:6,name:"オレンジ",speed:76,stamina:94,accel:69,consistency:90},
 {no:7,name:"レッド",speed:90,stamina:81,accel:80,consistency:82},
 {no:8,name:"ゴールド",speed:85,stamina:84,accel:93,consistency:78}
];
const colors=["#f4d35e","#5dade2","#ec7063","#58d68d","#af7ac5","#f5b041","#e67e22","#d5dbdb"];
let points=10000, predicted=null, running=false, raf=null, startTime=0, results=[];
const $=id=>document.getElementById(id);
function fillSelect(id){$(id).innerHTML=horses.map(h=>`<option value="${h.no}">${h.no}番 ${h.name}</option>`).join("")}
["horse1","horse2","horse3"].forEach(fillSelect);
$("horse2").value="2"; $("horse3").value="3";

const horseEls={};
function buildTrack(){
 $("horses").innerHTML="";
 horses.forEach((h,i)=>{
  const e=document.createElement("div"); e.className="horse"; e.textContent=h.no; e.style.background=colors[i];
  const label=document.createElement("div"); label.className="laneLabel"; label.textContent=`${h.no} ${h.name}`; e.appendChild(label);
  $("horses").appendChild(e); horseEls[h.no]=e;
  e.style.top=(40+i*11.5)+"%"; e.style.left="0%";
 });
}
buildTrack();

function setMessage(t){$("message").textContent=t}
function requiredCount(type){return {win:1,place:1,quinella:2,exacta:2,wide:2,trio:3,trifecta:3}[type]}
function updateBetUI(){
 const n=requiredCount($("betType").value);
 $("horse2Wrap").style.display=n>=2?"flex":"none";
 $("horse3Wrap").style.display=n>=3?"flex":"none";
}
$("betType").addEventListener("change",updateBetUI); updateBetUI();

$("betBtn").onclick=()=>{
 if(running)return setMessage("レース中は予想を変更できません。");
 const type=$("betType").value, n=requiredCount(type), stake=Number($("stake").value);
 if(!Number.isInteger(stake)||stake<100||stake>1000){return setMessage("ポイントは100～1000の範囲で入力してください。")}
 if(stake>points)return setMessage("ポイントが足りません。");
 const picks=[$("horse1").value]; if(n>=2)picks.push($("horse2").value); if(n>=3)picks.push($("horse3").value);
 if(new Set(picks).size!==picks.length)return setMessage("同じ馬を重複して選べません。");
 points-=stake; renderPoints();
 predicted={type,picks:picks.map(Number),stake};
 setMessage(`予想を受け付けました：${labelType(type)} / ${picks.join("-")} / ${stake}pt`);
};
function labelType(t){return {win:"単勝",place:"複勝",quinella:"馬連",exacta:"馬単",wide:"ワイド",trio:"三連複",trifecta:"三連単"}[t]}
function renderPoints(){$("points").textContent=points.toLocaleString()}

$("startBtn").onclick=()=>{
 if(running)return;
 running=true; results=[]; $("results").innerHTML="<li>レース中……</li>"; $("analysis").innerHTML="";
 horses.forEach((h,i)=>{horseEls[h.no].style.left="0%";horseEls[h.no].style.top=(40+i*11.5)+"%"});
 startTime=performance.now();
 $("raceStatus").textContent="スタート！ 各馬が走り始めました。";
 raf=requestAnimationFrame(frame);
};
function frame(now){
 const t=(now-startTime)/1000;
 const progress=Math.min(1,t/11);
 horses.forEach((h,i)=>{
  // 基礎能力＋少しのランダム揺らぎ。後半はスタミナの影響を強める。
  const staminaFactor=1-(1-h.stamina/100)*progress*0.55;
  const accelFactor=1+(h.accel-80)/800*(1-progress);
  const consistency=(Math.random()-0.5)*(100-h.consistency)/100*0.015;
  const p=Math.min(.995, progress*(h.speed/88)*staminaFactor*accelFactor + consistency);
  const e=horseEls[h.no];
  e.style.left=(p*100)+"%";
  e.style.top=(40+i*11.5 + Math.sin(t*8+i)*0.7)+"%";
 });
 if(progress<1){raf=requestAnimationFrame(frame)}
 else finishRace();
}
function finishRace(){
 running=false;
 // 到達度を能力値＋乱数で決め、順位を確定
 const ranked=horses.map(h=>{
  const score=h.speed*.46+h.stamina*.25+h.accel*.20+h.consistency*.09+(Math.random()*12-6);
  return {...h,score};
 }).sort((a,b)=>b.score-a.score);
 results=ranked;
 ranked.forEach((h,i)=>{horseEls[h.no].style.left="99%";horseEls[h.no].style.top=(40+(i%8)*11.5)+"%"});
 $("raceStatus").textContent=`ゴール！ 1着は ${ranked[0].no}番 ${ranked[0].name} です。`;
 renderResults(); settlePrediction();
}
function renderResults(){
 $("results").innerHTML=results.map((h,i)=>`<li class="${i===0?"resultWin":""}">${i+1}着：${h.no}番 ${h.name} <span class="muted">（総合シミュレーション値 ${h.score.toFixed(1)}）</span></li>`).join("");
 const top=results.slice(0,3).map(h=>h.no).join(" → ");
 $("analysis").innerHTML=`<div class="stats">
 <div class="stat"><b>1着</b><br>${results[0].no}番 ${results[0].name}</div>
 <div class="stat"><b>2着</b><br>${results[1].no}番 ${results[1].name}</div>
 <div class="stat"><b>3着</b><br>${results[2].no}番 ${results[2].name}</div>
 </div><p><b>上位3頭：</b>${top}</p>`;
}
function settlePrediction(){
 if(!predicted)return;
 const order=results.map(h=>h.no), p=predicted.picks, type=predicted.type;
 let ok=false, mult=0;
 const pos=p.map(x=>order.indexOf(x)+1);
 if(type==="win"){ok=pos[0]===1;mult=5}
 if(type==="place"){ok=pos[0]<=3;mult=2}
 if(type==="quinella"){ok=pos[0]<=2&&pos[1]<=2;mult=7}
 if(type==="exacta"){ok=pos[0]===1&&pos[1]===2;mult=12}
 if(type==="wide"){ok=pos.every(x=>x<=3);mult=4}
 if(type==="trio"){ok=p.every(x=>order.slice(0,3).includes(x));mult=15}
 if(type==="trifecta"){ok=pos[0]===1&&pos[1]===2&&pos[2]===3;mult=30}
 if(ok){const gain=predicted.stake*mult;points+=gain;setMessage(`的中！ ${labelType(type)}：${gain.toLocaleString()}ptを獲得しました（ゲーム内ポイント）。`)}
 else setMessage(`今回は外れです。使用した${predicted.stake}ptはゲーム内ポイントとして消費されました。`);
 predicted=null;renderPoints();
}
$("resetBtn").onclick=()=>{points=10000;predicted=null;renderPoints();setMessage("ポイントを10,000ptに戻しました。");};
renderPoints();
