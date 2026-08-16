export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'x-influencer-automation',
    monitoredInfluencers: 11,
    autoPosting: false
  });
}
