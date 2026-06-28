const TOKEN      = process.env.GITHUB_TOKEN;
const OWNER      = process.env.REPO_OWNER  || 'mhshamim83';
const REPO       = process.env.REPO_NAME   || 'DeathNote-JoraDokkhinPara';
const ADMIN_HASH = process.env.ADMIN_HASH  || '06260a94fb40fbc3c423eac07c56cd8f5bc0d70119a2f5a342bd146d036ff6fc';
const URL        = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data.json`;
const HEADERS    = { 'Authorization':`Bearer ${TOKEN}`, 'Accept':'application/vnd.github+json', 'Content-Type':'application/json' };

async function read() {
  const r = await fetch(URL, { headers: HEADERS });
  if (r.status === 404) return { data: [], sha: null };
  const f = await r.json();
  return { data: JSON.parse(Buffer.from(f.content.replace(/\n/g,''), 'base64').toString('utf8')), sha: f.sha };
}

async function write(data, sha) {
  const body = { message:`স্মরণ: ${new Date().toISOString()}`, content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  const r = await fetch(URL, { method:'PUT', headers: HEADERS, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data } = await read();
      return res.json({ ok: true, data });
    }

    if (req.method === 'POST') {
      const { action, entry, id, adminHash } = req.body;

      // Admin-only actions
      if ((action === 'edit' || action === 'delete') && adminHash !== ADMIN_HASH)
        return res.status(403).json({ ok: false, error: 'অনুমতি নেই' });

      const { data, sha } = await read();
      let newData;

      if      (action === 'add')    newData = [...data, { ...entry, addedAt: new Date().toISOString() }];
      else if (action === 'edit')   newData = data.map(x => x.id === entry.id ? { ...entry, updatedAt: new Date().toISOString() } : x);
      else if (action === 'delete') newData = data.filter(x => x.id !== id);
      else return res.status(400).json({ ok: false, error: 'Invalid action' });

      await write(newData, sha);
      return res.json({ ok: true });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
