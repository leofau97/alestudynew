export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method Not Allowed'});
  try{
    const {query='',limit=8}=req.body||{}; if(!query.trim())return res.status(400).json({error:'Inserisci una ricerca PubMed.'});
    const n=Math.min(Math.max(Number(limit)||8,1),10);
    const term=encodeURIComponent(query.trim());
    const base='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    const email=process.env.NCBI_EMAIL?`&email=${encodeURIComponent(process.env.NCBI_EMAIL)}`:'';
    const es=await fetch(`${base}esearch.fcgi?db=pubmed&term=${term}&retmode=json&retmax=${n}&sort=relevance${email}`);
    if(!es.ok)throw new Error(`PubMed ESearch HTTP ${es.status}`);
    const ids=(await es.json())?.esearchresult?.idlist||[];
    if(!ids.length)return res.status(200).json({articles:[]});
    const ef=await fetch(`${base}efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml${email}`);
    if(!ef.ok)throw new Error(`PubMed EFetch HTTP ${ef.status}`);
    const xml=await ef.text();
    const clean=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
    const blocks=xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g)||[];
    const articles=blocks.map(block=>{
      const tag=(re)=>clean((block.match(re)||[])[1]||'');
      const pmid=tag(/<PMID[^>]*>([\s\S]*?)<\/PMID>/);
      const title=tag(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
      const journal=tag(/<Title>([\s\S]*?)<\/Title>/);
      const pubdate=tag(/<PubDate>([\s\S]*?)<\/PubDate>/);
      const abs=(block.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)||[]).map(x=>clean(x)).join(' ');
      const authorBlocks=block.match(/<Author[^>]*>[\s\S]*?<\/Author>/g)||[];
      const authors=authorBlocks.slice(0,6).map(a=>clean((a.match(/<LastName>([\s\S]*?)<\/LastName>/)||[])[1]||'')+' '+clean((a.match(/<Initials>([\s\S]*?)<\/Initials>/)||[])[1]||'')).filter(Boolean).join(', ');
      const doi=clean((block.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/)||[])[1]||'');
      return {pmid,title,journal,pubdate,authors,abstract:abs,doi,url:`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`};
    }).filter(a=>a.pmid&&a.title);
    return res.status(200).json({articles});
  }catch(e){console.error('PubMed error',e);return res.status(500).json({error:e?.message||'Errore nella ricerca PubMed.'})}
}
