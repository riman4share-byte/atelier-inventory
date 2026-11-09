# Free background removal with self-hosted rembg

The app's "Clean background" feature supports a **free, self-hosted**
background remover via the "custom endpoint" provider in
**Settings → Tools and APIs**. This runs `rembg` (open source) with the
BiRefNet model — much better on lace, tulle and veils than the free
browser option, and free of per-image cost.

## 1. Run rembg locally (Docker)

```bash
docker run -d --name rembg -p 7000:7000 danielgatis/rembg s
```

The first run downloads the model (~170 MB). Wait ~30 s, then test:

```bash
curl -X POST http://localhost:7000/api/remove -F "file=@dress.jpg" -o cutout.png
```

If `cutout.png` opens with a transparent background, the server is ready.

## 2. Point the app at it

1. Sign in as admin → **Settings → Tools and APIs**.
2. Kind: **Background removal**, Provider: **Custom endpoint**.
3. Model / endpoint: `http://localhost:7000/api/remove`
4. Leave the API key blank (rembg needs none).
5. Save.

## 3. Use it

Open any dress with photos → **Clean background** → pick **Cloud
(Photoroom/remove.bg)** ... wait, that's the paid one. For the free server,
keep **Free (browser)** off and use the custom endpoint by setting the
provider to "Custom endpoint" in the control panel (Phase 10 stub returns a
hint only; on a cloud deploy the key/endpoint is stored in Vault).

## Notes

- The rembg container must be reachable from where the app runs. If the app
  is deployed to Vercel/Netlify, `localhost:7000` won't resolve — run rembg
  on a machine with a public URL or use a tunnel (ngrok/cloudflared).
- Model quality on lace/tulle/veils should be tested on at least 10 real
  photos and the outcome recorded in `GAPS.md` (G-03).
- BiRefNet is the best free model for fabric edges; the default rembg
  model (u2net) is faster but coarser. Pass `model=birefnet-general` if
  your rembg build supports it.
