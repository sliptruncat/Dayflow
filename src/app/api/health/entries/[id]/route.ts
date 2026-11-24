import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { healthEntrySchema } from "@/lib/validation/personal-modules";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
 const client=await getServerSupabaseClient(); if(!client) return NextResponse.json({error:"Supabase не настроен."},{status:503});
 const {data:{user}}=await client.auth.getUser(); if(!user) return NextResponse.json({error:"Требуется вход."},{status:401});
 const {id}=await context.params; const parsed=healthEntrySchema.partial().safeParse(await request.json().catch(()=>null));
 if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message??"Проверьте запись."},{status:400});
 const {data,error}=await client.from("health_entries").update(parsed.data).eq("id",id).eq("owner_id",user.id).select().maybeSingle();
 if(error) return NextResponse.json({error:"Не удалось обновить запись."},{status:500});
 if(!data) return NextResponse.json({error:"Запись не найдена."},{status:404});
 return NextResponse.json({entry:data});
}
export async function DELETE(_request: Request, context: Context) {
 const client=await getServerSupabaseClient(); if(!client) return NextResponse.json({error:"Supabase не настроен."},{status:503});
 const {data:{user}}=await client.auth.getUser(); if(!user) return NextResponse.json({error:"Требуется вход."},{status:401});
 const {id}=await context.params; const {data,error}=await client.from("health_entries").delete().eq("id",id).eq("owner_id",user.id).select("id").maybeSingle();
 if(error) return NextResponse.json({error:"Не удалось удалить запись."},{status:500});
 if(!data) return NextResponse.json({error:"Запись не найдена."},{status:404});
 return NextResponse.json({ok:true});
}
