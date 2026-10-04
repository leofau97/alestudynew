export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY non configurata su Vercel.' });
    const { messages = [], system = '', researchMode = 'material' } = req.body || {};
    const safe=[...(system ? [{role:'system',content:String(system)}] : []), ...messages.filter(m=>m?.content).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content)}))];
    const useWeb = researchMode === 'web';
    const body={
      model: process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b',
      messages:safe,
      max_completion_tokens:3000,
      temperature:0.5,
      reasoning_effort:'low'
    };
    if(useWeb){
      body.tools=[{type:'browser_search'}];
      body.tool_choice='required';
    }
    const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.GROQ_API_KEY}`},body:JSON.stringify(body)});
    const data=await r.json();
    if(!r.ok){console.error('Groq chat error',r.status,data);return res.status(r.status).json({error:data?.error?.message||`Groq HTTP ${r.status}`})}
    const msg=data?.choices?.[0]?.message||{};
    const sources=(msg.executed_tools||[]).flatMap(t=>t.search_results?.results||[]).map(x=>({title:x.title,url:x.url,snippet:x.content||''}));
    return res.status(200).json({reply:msg.content||'',sources});
  } catch(e){console.error(e);return res.status(500).json({error:e?.message||'Errore interno.'})}
}
