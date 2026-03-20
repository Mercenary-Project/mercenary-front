# Frontend Deployment

## 1. Environment Variables

Create a `.env.production` file from `.env.example` and set the deployed backend address.

```bash
VITE_API_BASE_URL=http://3.38.35.241:8080
VITE_API_PROXY_TARGET=http://3.38.35.241:8080
VITE_DEV_LOGIN_ENDPOINT=/api/auth/dev-login
VITE_KAKAO_CODE_EXCHANGE_ENDPOINT=/api/auth/kakao
VITE_KAKAO_LOGIN_URL=http://3.38.35.241:8080/oauth2/authorization/kakao
```

Notes:

- `VITE_API_BASE_URL` is the API base URL used by the production bundle.
- `VITE_KAKAO_LOGIN_URL` should point to the backend-managed Kakao login start URL when that flow is enabled.
- If the backend still uses the frontend callback flow, set `VITE_KAKAO_REST_API_KEY` and `VITE_KAKAO_REDIRECT_URI` instead.

## 2. Build

Use the following commands from the project root:

```bash
npm.cmd run lint
npm.cmd run build
```

The production assets are generated in `dist/`.

## 3. Static Hosting Checklist

- Upload the contents of `dist/` to your frontend hosting service.
- Configure SPA fallback so unknown routes rewrite to `/index.html`.
- After the frontend domain is fixed, ask the backend team to update `APP_CORS_ALLOWED_ORIGINS`.
- Reconfirm `KAKAO_REDIRECT_URI` if the final login flow uses the frontend domain.

## 4. Backend Coordination

Current backend details shared by the backend team:

- API base URL: `http://3.38.35.241:8080`
- Health check: `http://3.38.35.241:8080/actuator/health`
- Swagger UI: `http://3.38.35.241:8080/swagger-ui.html`

Observed on 2026-03-20:

- Health check returned `200 OK`.
- `GET /v3/api-docs` returned `500`, so Swagger-generated route verification is currently unreliable.

## 5. Smoke Test

- Confirm API requests are sent to `http://3.38.35.241:8080`.
- Confirm public APIs work before login.
- Confirm token save and authorized requests after login.
- Confirm Kakao login redirects and callback handling.
- Confirm there are no CORS errors in the browser console.
