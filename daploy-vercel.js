export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { siteName, files } = req.body || {};
    const token = process.env.VERCEL_TOKEN;

    if (!token) return res.status(500).json({ success: false, error: 'vcp_4CLjgTqiHLTxEsUIhl3nyxFRSPDh6GXsmprZkx8zNwoqyprPIv2rrLyv' });
    if (!siteName || !/^[a-z0-9-]+$/.test(siteName)) {
      return res.status(400).json({ success: false, error: 'Nama site tidak valid' });
    }
    if (!files || !files.length) {
      return res.status(400).json({ success: false, error: 'File kosong' });
    }
    if (!files.some(f => f.file === 'index.html')) {
      return res.status(400).json({ success: false, error: 'Wajib ada index.html' });
    }

    console.log(`[Vercel] Deploy ${files.length} files → ${siteName}`);

    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: siteName,
        files: files.map(f => ({ file: f.file, data: f.data })),
        target: 'production',
        projectSettings: {
          framework: null,
          buildCommand: null,
          outputDirectory: null,
          installCommand: null
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Vercel] Error:', data);
      return res.status(response.status).json({
        success: false,
        error: data.error?.message || 'Gagal deploy ke Vercel',
        details: data
      });
    }

    const url = `https://${data.url || (siteName + '.vercel.app')}`;
    console.log('[Vercel] ✅', url);

    return res.status(200).json({
      success: true,
      url,
      id: data.id,
      name: siteName,
      platform: 'vercel'
    });

  } catch (err) {
    console.error('[Vercel] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}