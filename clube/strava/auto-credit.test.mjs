import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleMonthMetrics} from './auto-credit.mjs';
const base={start_date_local:'2026-10-20T07:00:00',sport_type:'Run',distance:10500};
test('soma corrida, caminhada e bicicleta sem duplicar IDs',()=>{
 const a=eligibleMonthMetrics([{...base,id:1},{...base,id:1},
  {...base,id:2,sport_type:'Walk',distance:6500},
  {...base,id:3,sport_type:'Ride',distance:33000}],'2026-10');
 assert.deepEqual(a,{monthKey:'2026-10',meters:50000,km:50,activityCount:3});
});
test('ignora modalidades desabilitadas, atividades manuais, invalidas e outros meses',()=>{
 const a=eligibleMonthMetrics([{...base,id:1},{...base,id:2,sport_type:'Ride'},
  {...base,id:3,manual:true},{...base,id:4,sport_type:'Swim'},
  {...base,id:5,start_date_local:'2026-09-20T07:00:00'},
  {...base,id:6,distance:0},{...base,id:7,distance:NaN},
  {...base,id:8,distance:5500}], '2026-10',['Run','Walk']);
 assert.deepEqual(a,{monthKey:'2026-10',meters:16000,km:16,activityCount:2});
});
test('exige mes valido e lista de atividades',()=>{
 assert.throws(()=>eligibleMonthMetrics([], '2026-13'));
 assert.throws(()=>eligibleMonthMetrics(null,'2026-10'));
});
