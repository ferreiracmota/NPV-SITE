import { createHash } from 'node:crypto'

const PURCHASE_EVENTS={
 APPROVED:'PURCHASE_APPROVED', COMPLETE:'PURCHASE_APPROVED',
 REFUNDED:'PURCHASE_REFUNDED', CHARGEBACK:'PURCHASE_CHARGEBACK',
 CANCELLED:'PURCHASE_CANCELED'
}
export function eligibleReconciliationItem(item,startAt){
 const recurrence=Number(item?.recurrency_number)
 const approval=Number(item?.approved_date)
 const type=PURCHASE_EVENTS[item?.status]
 if(!type||item?.purchase_subscription!==true||!item?.transaction||
  !Number.isSafeInteger(recurrence)||recurrence<2||
  !Number.isSafeInteger(approval)||!Number.isFinite(Date.parse(startAt))||
  approval<Date.parse(startAt)||
  item?.payment_type==='FINANCED_INSTALLMENT')return null
 return {type,recurrence,approvedAt:new Date(approval).toISOString()}
}
export function reconciliationEventId(productId,subscriberCode,transaction,type){
 const key=[productId,subscriberCode,transaction,type].join(':')
 return 'npv-reconcile:'+createHash('sha256').update(key).digest('hex')
}
