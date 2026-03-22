# Frontend Deployment

## 1. Recommended Architecture

For this project, the simplest production setup is:

- Deploy the frontend build output (`dist/`) as static files.
- Serve the frontend with `Nginx` on the same Lightsail Ubuntu server.
- Keep the backend app on port `8080`.
- Optionally proxy `/api` requests through `Nginx` to `http://127.0.0.1:8080`.

Recommended final structure:

- `http://3.38.35.241/` -> frontend static files
- `http://3.38.35.241/api/*` -> backend API
- `http://127.0.0.1:8080` -> backend app server

## 2. Kakao Login Flow

The backend clarified that the frontend should not use `/oauth2/authorization/kakao`.

Current login flow:

1. The frontend moves directly to the Kakao authorize URL.
2. Kakao redirects back to the frontend callback page.
3. The frontend reads the `code` value from the callback URL.
4. The frontend sends the code to the backend:

```http
POST http://3.38.35.241:8080/api/auth/kakao
Content-Type: application/json

{
  "code": "kakao-authorization-code"
}
```

The backend returns the service JWT in the response.

## 3. Environment Variables

Create a `.env.production` file from `.env.example`.

Current deployment example:

```bash
VITE_API_BASE_URL=http://3.38.35.241:8080
VITE_API_PROXY_TARGET=http://3.38.35.241:8080
VITE_DEV_LOGIN_ENDPOINT=/api/auth/dev-login
VITE_KAKAO_CODE_EXCHANGE_ENDPOINT=/api/auth/kakao
VITE_KAKAO_REST_API_KEY=7d14f9ab2e737ea77a60f2c1bffce860
VITE_KAKAO_REDIRECT_URI=http://3.38.35.241/login/callback
```

Notes:

- `VITE_API_BASE_URL` is baked into the production bundle at build time.
- `VITE_KAKAO_REST_API_KEY` is used to build the direct Kakao authorize URL in the frontend.
- `VITE_KAKAO_REDIRECT_URI` must point to the frontend callback page.
- If the frontend domain changes later, update `VITE_KAKAO_REDIRECT_URI` and rebuild.

## 4. Build

Run these commands from the project root:

```bash
npm.cmd run lint
npm.cmd run build
```

The production output is generated in `dist/`.

## 5. Lightsail Ubuntu Deployment Flow

### 5.1 Build locally

```bash
npm.cmd run build
```

### 5.2 Upload frontend files to the server

Example target directory:

```bash
/var/www/mercenary-front
```

Recommended copy flow:

```bash
scp -i C:\Users\user\Downloads\LightsailDefaultKey-ap-northeast-2.pem -r .\dist ubuntu@3.38.35.241:~
```

Then on the server:

```bash
cp -r ~/dist/* /var/www/mercenary-front/
```

### 5.3 Install Nginx on the server

```bash
sudo apt update
sudo apt install -y nginx
```

### 5.4 Create the frontend directory

```bash
sudo mkdir -p /var/www/mercenary-front
sudo chown -R $USER:$USER /var/www/mercenary-front
```

### 5.5 Fix file permissions

```bash
sudo find /var/www/mercenary-front -type d -exec chmod 755 {} \;
sudo find /var/www/mercenary-front -type f -exec chmod 644 {} \;
```

### 5.6 Create an Nginx site config

Suggested file:

```bash
sudo nano /etc/nginx/sites-available/mercenary-front
```

Example config:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/mercenary-front;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.7 Enable the site

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/mercenary-front /etc/nginx/sites-enabled/mercenary-front
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Domain and HTTPS

When a final domain is connected:

- Point the domain DNS to `3.38.35.241`
- Enable HTTPS with Certbot
- Update `VITE_KAKAO_REDIRECT_URI` to `https://your-domain.com/login/callback`
- Rebuild and re-upload the frontend
- Ask the backend team to update CORS and Kakao settings

Recommended HTTPS commands:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 7. Backend Coordination

Current backend details:

- API base URL: `http://3.38.35.241:8080`
- Health check: `http://3.38.35.241:8080/actuator/health`
- Swagger UI: `http://3.38.35.241:8080/swagger-ui.html`
- Kakao code exchange API: `POST http://3.38.35.241:8080/api/auth/kakao`

Backend changes needed after frontend domain is fixed:

- Update `APP_CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com`
- Reconfirm `KAKAO_REDIRECT_URI`
- Prefer HTTPS-based URLs after SSL is applied

## 8. Smoke Test Checklist

- Confirm the frontend main page loads through `Nginx`
- Confirm deep-link routes such as `/login` and `/mypage` open without `404`
- Confirm the Kakao button moves to the direct Kakao authorize URL
- Confirm the callback page receives the `code` value
- Confirm `POST /api/auth/kakao` returns the JWT successfully
- Confirm the access token is stored correctly
- Confirm authenticated APIs send the token correctly
- Confirm there are no browser CORS or mixed-content errors

## 9. Suggested Rollout Order

1. Set the correct Kakao env values in `.env.production`.
2. Run `npm.cmd run build`.
3. Upload `dist` to the Lightsail server.
4. Verify frontend access by server IP first.
5. Verify Kakao login end to end.
6. Connect the final domain.
7. Enable HTTPS with Certbot.
8. Update backend CORS and Kakao redirect settings.
9. Rebuild and redeploy with the final HTTPS callback URL.
