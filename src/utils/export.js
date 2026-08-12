export function exportToCSV(data, filename="export.csv") {
  if (!data||!data.length) { alert("No data to export"); return; }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row=>headers.map(h=>`"${String(row[h]??"").replace(/"/g,'""')}"`).join(","))
  ].join("\n");
  const blob = new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
export function exportToJSON(data, filename="export.json") {
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
