/* Shared period rules for the global ledger and regional Dollar Figures pages. */
export function uniqueEvents(items) {
  const byId=new Map();
  for(const item of items) if(item.id) byId.set(item.id,item);
  return [...byId.values()];
}
export function readPeriod(search='') {
  const p=new URLSearchParams(search);
  const year=/^\d{4}$/.test(p.get('year')||'')?p.get('year'):'';
  const quarters=[...new Set((p.get('quarters')||'').split(',').filter(q=>/^[1-4]$/.test(q)))].sort();
  const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:'';
  return {region:p.get('region')||'',year,quarters,start:date(p.get('start')),end:date(p.get('end')),issue:p.get('issue')||'',kind:p.get('kind')||'',q:p.get('q')||''};
}
export function inPeriod(item,state) {
  const active=state.year||state.quarters.length||state.start||state.end;
  if(!active)return true;
  const date=item.date||'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  if(state.start||state.end)return (!state.start||date>=state.start)&&(!state.end||date<=state.end);
  if(state.year&&date.slice(0,4)!==state.year)return false;
  return !state.quarters.length||state.quarters.includes(String(Math.ceil(Number(date.slice(5,7))/3)));
}
export function periodLabel(state) {
  if(state.start||state.end)return `${state.start||'Beginning'} to ${state.end||'latest'}`;
  return [state.year||'All years',state.quarters.length?state.quarters.map(q=>'Q'+q).join(' + '):'all quarters'].join(' · ');
}
export function byCurrency(items) {
  const groups=new Map();for(const item of items){const currency=item.currency||'USD';const group=groups.get(currency)||[];group.push(item);groups.set(currency,group);}return [...groups].sort(([a],[b])=>a.localeCompare(b));
}
