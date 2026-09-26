export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { siteName, files } = req.body || {};
    const token = process.env.NETLIFY_TOKEN;

    if (!token) return res.status(500).json({ success: false, error: 'nfp_wbEbkjjhyHJxjuuuspmgddHeWULm3euEa5bd' });
    if (!siteName || !/^[a-z0-9-]+$/.test(siteName)) {
      return res.status(400).json({ success: false, error: 'Nama site tidak valid' });
    }
    if (!files || !files.length) {
      return res.status(400).json({ success: false, error: 'File kosong' });
    }
    if (!files.some(f => f.file === 'index.html')) {
      return res.status(400).json({ success: false, error: 'Wajib ada index.html' });
    }

    console.log(`[Netlify] Deploy ${files.length} files → ${siteName}`);

    // Buat site baru
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: siteName })
    });

    const siteData = await siteRes.json();
    if (!siteRes.ok) {
      console.error('[Netlify] Site error:', siteData);
      return res.status(siteRes.status).json({
        success: false,
        error: siteData.message || 'Gagal buat site',
        details: siteData
      });
    }

    const siteId = siteData.id;

    // Upload file (Netlify butuh object: path → SHA1 hash)
    const filesObj = {};
    for (const f of files) {
      filesObj['/' + f.file] = f.data;
    }

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files: filesObj, draft: false })
    });

    const deployData = await deployRes.json();
    if (!deployRes.ok) {
      console.error('[Netlify] Deploy error:', deployData);
      return res.status(deployRes.status).json({
        success: false,
        error: deployData.message || 'Gagal deploy',
        details: deployData
      });
    }

    const url = siteData.ssl_url || siteData.url || `https://${siteName}.netlify.app`;
    console.log('[Netlify] ✅', url);

    return res.status(200).json({
      success: true,
      url,
      id: siteId,
      name: siteName,
      platform: 'netlify'
    });

  } catch (err) {
    console.error('[Netlify] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}