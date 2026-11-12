// 11/13 붙여넣기 실전 시험 ③ — node 돌리기.js <문자.json> <결과.json> <js파일…> (20h 와 그 앞에 실리는 파일을 순서대로)
// 화면 없이 ZG.문자붙여넣기.나누기 만 부른다 · 바깥 호출 없음
const fs = require('fs'), vm = require('vm');
const [문자, 결과, ...파일] = process.argv.slice(2);
const 창 = { ZG: { ui: { 만들기: () => ({}) } } }; 창.window = 창;
vm.createContext(창);
for (const f of 파일) vm.runInContext(fs.readFileSync(f, 'utf8'), 창, { filename: f });
const 나누기 = 창.ZG.문자붙여넣기.나누기;
const 답 = JSON.parse(fs.readFileSync(문자, 'utf8')).map(m => { try { return 나누기(m.글); } catch (e) { return { 오류: String(e) }; } });
fs.writeFileSync(결과, JSON.stringify(답));
console.log(답.length, '건');
