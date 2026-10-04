import {lessons} from '../../lessons';
import {reviewCode} from '../../../lib/code-review.mjs';
import {requireUser,throttle} from '../../../lib/auth.mjs';
import {handle,json,jsonBody} from '../../../lib/http.mjs';
import {HttpError,validateObject} from '../../../lib/validation.mjs';
export const runtime='nodejs';
export async function POST(request){
 return handle(request,async()=>{
  const user=await requireUser(request),body=await jsonBody(request);validateObject(body,['lessonId','code']);
  const lesson=lessons.find(item=>item.id===body.lessonId);
  if(!lesson?.checks)throw new HttpError(400,'Este exercício usa a prévia do navegador.');
  if(typeof body.code!=='string'||Buffer.byteLength(body.code,'utf8')>16384)throw new HttpError(400,'O código deve ter até 16 KB.');
  await throttle('review:'+user.id,120);
  return json(reviewCode(lesson,body.code));
 },true);
}
