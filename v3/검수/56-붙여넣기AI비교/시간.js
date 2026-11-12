// 11/13 붙여넣기 AI 비교 — 규칙(나누기) 1통에 걸리는 시간 · node 시간.js <세트.json> <js파일…>
const fs = require('fs'), vm = require('vm');
const [세트, ...파일] = process.argv.slice(2);
const t0 = process.hrtime.bigint();
const 창 = { ZG: { ui: { 만들기: () => ({}) } } }; 창.window = 창; vm.createContext(창);
for (const f of 파일) vm.runInContext(fs.readFileSync(f, 'utf8'), 창, { filename: f });
const 싣기 = Number(process.hrtime.bigint() - t0) / 1e6;
const 나누기 = 창.ZG.문자붙여넣기.나누기, 글 = JSON.parse(fs.readFileSync(세트, 'utf8')).map(m => m.글);
const 첫 = process.hrtime.bigint(); 나누기(글[0]); const 첫ms = Number(process.hrtime.bigint() - 첫) / 1e6;
const 잰 = [];
for (let r = 0; r < 5; r++) for (const g of 글) { const a = process.hrtime.bigint(); 나누기(g); 잰.push(Number(process.hrtime.bigint() - a) / 1e6); }
잰.sort((a, b) => a - b);
const q = p => 잰[Math.floor(잰.length * p)].toFixed(3);
console.log(JSON.stringify({ 싣기ms: 싣기.toFixed(1), 첫통ms: 첫ms.toFixed(2), 번: 잰.length, 가운데ms: q(0.5), 열에아홉ms: q(0.9), 백에아흔아홉ms: q(0.99), 가장느림ms: 잰[잰.length - 1].toFixed(2), 평균ms: (잰.reduce((a, b) => a + b, 0) / 잰.length).toFixed(3) }));
