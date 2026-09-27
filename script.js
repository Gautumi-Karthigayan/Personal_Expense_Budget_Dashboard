const STORAGE_KEY = "expenseDashboardDataV1";
const BUDGET_KEY = "expenseDashboardBudgetV1";

let expenses = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2}).format(n);

$("date").value = new Date().toISOString().slice(0,10);
$("budget").value = localStorage.getItem(BUDGET_KEY) || "";

$("expenseForm").addEventListener("submit", e => {
  e.preventDefault();
  const expense = {
    id: Date.now(),
    date: $("date").value,
    description: $("description").value.trim(),
    category: $("category").value,
    paymentMode: $("paymentMode").value,
    amount: Number($("amount").value),
    needWant: $("needWant").value
  };
  if (!expense.description || !expense.amount || expense.amount <= 0) return;
  expenses.push(expense);
  save();
  e.target.reset();
  $("date").value = new Date().toISOString().slice(0,10);
  $("category").value = "Travel";
  $("paymentMode").value = "Cash";
  $("needWant").value = "Need";
  render();
});

$("budget").addEventListener("input", e => {
  localStorage.setItem(BUDGET_KEY, e.target.value);
  renderKpis();
});

$("clearAll").addEventListener("click", () => {
  if(confirm("Clear all saved expenses and budget?")) {
    expenses = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BUDGET_KEY);
    $("budget").value = "";
    render();
  }
});

$("exportCsv").addEventListener("click", () => {
  if (!expenses.length) return alert("There are no expenses to export.");
  const header = ["Date","Description","Category","Payment Mode","Amount","Need / Want"];
  const rows = expenses.map(x => [x.date,x.description,x.category,x.paymentMode,x.amount,x.needWant]);
  const csv = [header,...rows].map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "expense-history.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(expenses));}

function totals(){
  const total = expenses.reduce((s,x)=>s+x.amount,0);
  const needs = expenses.filter(x=>x.needWant==="Need").reduce((s,x)=>s+x.amount,0);
  const wants = expenses.filter(x=>x.needWant==="Want").reduce((s,x)=>s+x.amount,0);
  return {total,needs,wants};
}

function renderKpis(){
  const {total,needs,wants}=totals();
  $("totalExpense").textContent=money(total);
  $("totalNeeds").textContent=money(needs);
  $("totalWants").textContent=money(wants);
  const budget=Number($("budget").value||0);
  $("remainingBudget").textContent=budget ? money(budget-total) : "—";
  $("remainingBudget").style.color = budget && budget-total < 0 ? "#dc2626" : "";
}

function aggregate(key){
  return expenses.reduce((o,x)=>{o[x[key]]=(o[x[key]]||0)+x.amount;return o},{});
}

function donut(containerId, data, centerText=""){
  const el=$(containerId), entries=Object.entries(data).filter(([,v])=>v>0);
  if(!entries.length){el.innerHTML='<div class="empty">Add expenses to see this chart.</div>';return;}
  const total=entries.reduce((s,[,v])=>s+v,0), colors=["#2563eb","#f97316","#94a3b8","#16a34a","#7c3aed","#eab308"];
  const cx=150,cy=135,r=92,stroke=42, circ=2*Math.PI*r;
  let offset=0, arcs="";
  entries.forEach(([label,value],i)=>{
    const len=(value/total)*circ;
    arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="${stroke}" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len;
  });
  const legend=entries.map(([label,value],i)=>`<div style="display:flex;align-items:center;gap:7px;margin:5px 0;font-size:12px"><span style="width:10px;height:10px;border-radius:50%;background:${colors[i%colors.length]}"></span>${label} ${money(value)}</div>`).join("");
  el.innerHTML=`<div style="width:100%;display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap"><svg viewBox="0 0 300 270"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#edf0f5" stroke-width="${stroke}"/>${arcs}<text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="15" font-weight="700" fill="#172033">${money(total)}</text><text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="10" fill="#697386">Total</text></svg><div>${legend}</div></div>`;
}

function barChart(containerId,data){
  const el=$(containerId),entries=Object.entries(data).filter(([,v])=>v>0);
  if(!entries.length){el.innerHTML='<div class="empty">Add expenses to see this chart.</div>';return;}
  const max=Math.max(...entries.map(([,v])=>v)), colors=["#2563eb","#f97316","#16a34a","#7c3aed"];
  const width=360,height=260, left=45,bottom=45, top=20, chartH=height-top-bottom, chartW=width-left-15;
  const slot=chartW/entries.length, bw=Math.min(70,slot*.55);
  let svg=`<svg viewBox="0 0 ${width} ${height}">`;
  [0,.25,.5,.75,1].forEach(t=>{const y=top+chartH*(1-t);const val=max*t;svg+=`<line x1="${left}" y1="${y}" x2="${width-15}" y2="${y}" stroke="#e6eaf0"/><text x="${left-7}" y="${y+4}" text-anchor="end" font-size="10" fill="#697386">${Math.round(val)}</text>`});
  entries.forEach(([label,value],i)=>{const h=(value/max)*chartH,x=left+slot*i+(slot-bw)/2,y=top+chartH-h;svg+=`<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${colors[i%colors.length]}"/><text x="${x+bw/2}" y="${y-7}" text-anchor="middle" font-size="11" font-weight="700" fill="#394357">${Math.round(value)}</text><text x="${x+bw/2}" y="${height-19}" text-anchor="middle" font-size="11" fill="#697386">${label}</text>`});
  svg+="</svg>";el.innerHTML=svg;
}

function renderTable(){
  const tbody=$("expenseTable");
  tbody.innerHTML="";
  [...expenses].sort((a,b)=>b.date.localeCompare(a.date)).forEach(x=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${x.date}</td><td>${escapeHtml(x.description)}</td><td>${x.category}</td><td>${x.paymentMode}</td><td class="amount">${money(x.amount)}</td><td>${x.needWant}</td><td><button class="delete-btn" data-id="${x.id}">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  $("entryCount").textContent=`${expenses.length} ${expenses.length===1?"entry":"entries"}`;
  $("emptyState").style.display=expenses.length?"none":"block";
  tbody.querySelectorAll(".delete-btn").forEach(btn=>btn.addEventListener("click",()=>{expenses=expenses.filter(x=>x.id!==Number(btn.dataset.id));save();render();}));
}

function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function render(){
  renderKpis();
  renderTable();
  donut("categoryChart",aggregate("category"));
  donut("needWantChart",aggregate("needWant"));
  barChart("paymentChart",aggregate("paymentMode"));
}
render();
