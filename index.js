export default function handler(req, res) {
  return Response.json({
    ok: true,
    message: 'gen-img serverless app is running',
    method: req.method,
  });
}
