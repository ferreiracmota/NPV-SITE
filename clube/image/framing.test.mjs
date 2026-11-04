import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeImageFrame,imageFrameFromRow,imageFramePayload,imageFrameStyle,dragImageFrame} from './framing.mjs'

test('posição padrão mantém imagem centralizada e não altera a origem',()=>{
 assert.deepEqual(normalizeImageFrame(),{x:50,y:50,zoom:1})
 assert.deepEqual(imageFrameFromRow({}),{x:50,y:50,zoom:1})
 assert.deepEqual(imageFrameStyle({}),{
   objectFit:'cover',objectPosition:'50% 50%',transform:'scale(1)',transformOrigin:'50% 50%'
 })
})
test('limites impedem recortes fora da imagem e zoom que deixe espaços vazios',()=>{
 assert.deepEqual(normalizeImageFrame({x:-999,y:999,zoom:0.1}),{x:0,y:100,zoom:1})
 assert.deepEqual(normalizeImageFrame({x:Infinity,y:NaN,zoom:99}),{x:50,y:50,zoom:2.5})
})
test('posição de capa e de recompensa usa colunas separadas',()=>{
 assert.deepEqual(imageFramePayload({x:25,y:70,zoom:1.2},'cover'),{cover_position_x:25,cover_position_y:70,cover_zoom:1.2})
 assert.deepEqual(imageFramePayload({x:40,y:60,zoom:1.8},'image'),{image_position_x:40,image_position_y:60,image_zoom:1.8})
 assert.deepEqual(imageFrameFromRow({image_position_x:10,image_position_y:85,image_zoom:1.1},'image'),{x:10,y:85,zoom:1.1})
})
test('arraste em imagem retrato move apenas no eixo que tem corte',()=>{
 const f=dragImageFrame({x:50,y:50,zoom:1},-60,-60,400,200,100,300)
 assert.ok(f.y>50)
 assert.equal(f.x,50)
})
test('arraste em imagem paisagem respeita o excedente da imagem',()=>{
 const f=dragImageFrame({x:50,y:50,zoom:1},-50,-50,400,200,1000,200)
 assert.ok(f.x>50)
 assert.equal(f.y,50)
})
test('zoom permite mover foto mesmo quando enquadramento original não tinha sobra',()=>{
 const f=dragImageFrame({x:50,y:50,zoom:1.5},-30,50,400,200,800,400)
 assert.ok(f.x>50)
 assert.ok(f.y<50)
})
