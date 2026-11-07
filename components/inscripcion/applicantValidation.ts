import { schoolCalendarDate } from '@/lib/utils/schoolTime';
export function applicantAge(date:string, now=new Date()):number {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NaN;
 const parsed=new Date(`${date}T00:00:00Z`);
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||Number(date.slice(0,4))<1900)return NaN;
 const [year,month,day]=date.split('-').map(Number),today=schoolCalendarDate(now);
 return today.getFullYear()-year-(today.getMonth()+1<month||(today.getMonth()+1===month&&today.getDate()<day)?1:0);
}
