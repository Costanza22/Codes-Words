import { database } from '../../../lib/db.mjs';
import { requireUser, throttle } from '../../../lib/auth.mjs';
import { HttpError, validateObject } from '../../../lib/validation.mjs';
import { handle, json, jsonBody } from '../../../lib/http.mjs';
import { lessons } from '../../lessons';
import { gradeAnswer } from '../../../lib/grading.mjs';
export const runtime='nodejs';
function lessonFor(id){const lesson=lessons.find(item=>item.id===id);if(!lesson)throw new HttpError(400,'Aula inválida.');return lesson;}
export async function GET(request){
  return handle(request,async()=>{
    const user=await requireUser(request),db=database();
    const [rows]=await db.execute('SELECT lesson_id,draft,completed_at,attempts FROM lesson_progress WHERE user_id=?',[user.id]);
    const [users]=await db.execute('SELECT last_lesson FROM users WHERE id=?',[user.id]);
    return json({completed:rows.filter(row=>row.completed_at).map(row=>row.lesson_id),drafts:Object.fromEntries(rows.filter(row=>row.draft!==null).map(row=>[row.lesson_id,row.draft])),lastLesson:users[0].last_lesson});
  });
}
export async function PUT(request){
  return handle(request,async()=>{
    const user=await requireUser(request),body=await jsonBody(request);validateObject(body,['lessonId','code']);lessonFor(body.lessonId);
    if(typeof body.code!=='string'||Buffer.byteLength(body.code,'utf8')>16384)throw new HttpError(400,'O código deve ter até 16 KB.');
    await throttle('draft:'+user.id,300);
    const connection=await database().getConnection();
    try{
      await connection.beginTransaction();
      await connection.execute(`INSERT INTO lesson_progress (user_id,lesson_id,draft) VALUES (?,?,?) ON DUPLICATE KEY UPDATE draft=VALUES(draft),updated_at=UTC_TIMESTAMP(3)`,[user.id,body.lessonId,body.code]);
      await connection.execute('UPDATE users SET last_lesson=? WHERE id=?',[body.lessonId,user.id]);await connection.commit();return json({ok:true});
    }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },true);
}
export async function POST(request){
  return handle(request,async()=>{
    const user=await requireUser(request),body=await jsonBody(request);validateObject(body,['lessonId','answer']);const lesson=lessonFor(body.lessonId);
    const result=gradeAnswer(lesson,body.answer);
    await throttle('answer:'+user.id,120);const correct=result.correct;
    await database().execute(`INSERT INTO lesson_progress (user_id,lesson_id,attempts,completed_at) VALUES (?,?,1,IF(?,UTC_TIMESTAMP(3),NULL)) ON DUPLICATE KEY UPDATE attempts=attempts+1,completed_at=IF(?,COALESCE(completed_at,UTC_TIMESTAMP(3)),completed_at),updated_at=UTC_TIMESTAMP(3)`,[user.id,lesson.id,correct,correct]);
    return json(result);
  },true);
}
