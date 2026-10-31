/**
 * Escolhe uma recompensa ativa e com estoque para o resumo do aluno.
 * Não reserva pontos, não realiza resgates e não altera o catálogo.
 */
export function selectNextAvailableReward(rewards,availablePoints){
  const available=Math.max(0,Number(availablePoints)||0)
  const eligible=(Array.isArray(rewards)?rewards:[])
    .filter(item=>item.active===true&&item.test_only!==true&&Number(item.stock)>0&&Number(item.points)>0)
    .slice().sort((a,b)=>Number(a.points)-Number(b.points))
  if(!eligible.length)return null
  // Quando existe recompensa ao alcance, mostra a de maior valor possível.
  return eligible.filter(item=>Number(item.points)<=available).at(-1)||eligible[0]
}
