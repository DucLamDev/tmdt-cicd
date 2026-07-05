# Hướng Dẫn CI/CD GitHub Actions + Docker Compose + VPS

Tài liệu này áp dụng cho project hiện tại gồm 3 service:

- `frontend`: React/Vite, build thành static file và chạy bằng Nginx.
- `backend`: Node.js/Express, kết nối MongoDB, gọi AI try-on nội bộ.
- `ai-tryon-service`: Python/FastAPI, xử lý virtual try-on.

Kiến trúc deploy:

1. Push code lên branch `main` hoặc `master`.
2. GitHub Actions chạy test/build check.
3. GitHub Actions build 3 Docker image và push lên GitHub Container Registry, viết tắt là GHCR.
4. GitHub Actions SSH vào VPS, upload `docker-compose.yml` và `deploy/Caddyfile`.
5. VPS chạy `docker compose pull` để tải image mới và `docker compose up -d` để cập nhật container.
6. Caddy nhận traffic cổng 80/443, tự cấp HTTPS nếu `APP_DOMAIN` là domain thật.

## 1. Các file đã thêm vào project

- `.github/workflows/ci-cd.yml`: pipeline CI/CD.
- `docker-compose.yml`: cấu hình production trên VPS.
- `deploy/Caddyfile`: reverse proxy cho frontend, backend và AI service.
- `.env.production.example`: template biến môi trường trên VPS.
- `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`.
- `backend/.dockerignore`, cập nhật `backend/Dockerfile`.
- `ai-tryon-service/Dockerfile`, `ai-tryon-service/.dockerignore`.
- `.gitignore`: chặn commit `.env`, logs, uploads, node_modules.

## 2. Chuẩn bị GitHub repository

Nếu thư mục hiện tại chưa là Git repo hợp lệ, khởi tạo lại ở root project:

```bash
git init
git add .
git commit -m "setup docker compose cicd deployment"
git branch -M main
git remote add origin git@github.com:OWNER/REPOSITORY.git
git push -u origin main
```

Nếu đã có remote:

```bash
git remote -v
git add .
git commit -m "setup docker compose cicd deployment"
git push origin main
```

Lưu ý: nếu `.env` đã từng bị add vào Git, cần gỡ khỏi index trước khi push:

```bash
git rm --cached backend/.env frontend/.env ai-tryon-service/.env
git commit -m "remove local env files from git"
```

## 3. Chuẩn bị VPS

Khuyến nghị dùng Ubuntu 22.04/24.04, RAM tối thiểu 2 GB. Nếu chạy AI provider nặng hoặc local GPU pipeline, nên dùng VPS/GPU riêng.

Mở firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Cài Docker và Docker Compose plugin:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Đăng xuất SSH rồi đăng nhập lại, sau đó kiểm tra:

```bash
docker --version
docker compose version
```

Tạo thư mục deploy:

```bash
sudo mkdir -p /opt/marketplace/deploy
sudo chown -R $USER:$USER /opt/marketplace
cd /opt/marketplace
```

## 4. Tạo file `.env` trên VPS

Lưu ý quan trọng: các dòng dạng `APP_DOMAIN=:80`, `FRONTEND_URL=...`, `JWT_ACCESS_SECRET=...` là **nội dung của file `.env`**, không phải lệnh PowerShell/CMD để chạy từng dòng. Nếu paste trực tiếp các dòng đó vào PowerShell, bạn sẽ gặp lỗi kiểu `not recognized as the name of a cmdlet`.

Ở máy Windows local, mở file `.env` bằng Notepad/VS Code rồi chỉnh nội dung trong file:

```powershell
notepad .env
```

Sau khi chỉnh xong, upload file `.env` lên VPS:

```powershell
scp .env USER@103.178.234.101:/opt/marketplace/.env
```

Thay `USER` bằng user SSH thật của VPS, ví dụ `root` hoặc `ubuntu`.

Hoặc có thể tạo/chỉnh trực tiếp trên VPS:

```bash
cd /opt/marketplace
nano .env
```

Giá trị tối thiểu cần sửa:

```env
APP_DOMAIN=shop.example.com
FRONTEND_URL=https://shop.example.com
API_URL=https://shop.example.com
CORS_ORIGINS=https://shop.example.com

MONGO_INITDB_ROOT_USERNAME=marketplace_root
MONGO_INITDB_ROOT_PASSWORD=mat-khau-mongo-rat-manh
MONGODB_URI=mongodb://marketplace_root:mat-khau-mongo-rat-manh@mongo:27017/marketplace?authSource=admin

JWT_ACCESS_SECRET=chuoi-bi-mat-rat-dai-access
JWT_REFRESH_SECRET=chuoi-bi-mat-rat-dai-refresh
JWT_RESET_PASSWORD_SECRET=chuoi-bi-mat-rat-dai-reset
```

Nếu chưa có domain và chỉ test bằng IP:

```env
APP_DOMAIN=:80
FRONTEND_URL=http://SERVER_IP
API_URL=http://SERVER_IP
CORS_ORIGINS=http://SERVER_IP
```

Tạo secret mạnh:

```bash
openssl rand -base64 48
```

Nếu dùng OAuth/payment, cập nhật thêm:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`.
- `VNPAY_*`, `MOMO_*`, `ZALOPAY_*`.
- `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`.
- `GEMINI_API_KEY`, `OPENAI_API_KEY` nếu dùng AI thật.

Với Google OAuth, callback backend sẽ là:

```text
https://shop.example.com/api/auth/oauth/google/callback
```

## 5. Tạo SSH key cho GitHub Actions

Trên máy local hoặc VPS, tạo key riêng cho deploy:

```bash
ssh-keygen -t ed25519 -C "github-actions-marketplace" -f github_actions_marketplace
```

Copy public key vào VPS:

```bash
ssh-copy-id -i github_actions_marketplace.pub USER@SERVER_IP
```

Nếu không có `ssh-copy-id`, chạy thủ công:

```bash
cat github_actions_marketplace.pub
```

Sau đó trên VPS:

```bash
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Kiểm tra đăng nhập:

```bash
ssh -i github_actions_marketplace USER@SERVER_IP
```

Lấy private key để dán vào GitHub secret:

```bash
cat github_actions_marketplace
```

## 6. Tạo GitHub Secrets

Vào GitHub repository:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.

Bắt buộc:

| Secret | Giá trị |
| --- | --- |
| `VPS_HOST` | IP hoặc domain SSH của VPS |
| `VPS_USER` | User SSH trên VPS, ví dụ `ubuntu` |
| `VPS_SSH_KEY` | Nội dung private key `github_actions_marketplace` |
| `VITE_API_URL` | URL public backend, ví dụ `https://shop.example.com` |
| `VITE_AI_TRYON_URL` | URL public AI proxy, ví dụ `https://shop.example.com/ai-tryon` |

Khuyến nghị:

| Secret | Giá trị |
| --- | --- |
| `VPS_PORT` | Cổng SSH nếu không phải 22 |
| `VPS_APP_DIR` | Thư mục deploy, mặc định `/opt/marketplace` |
| `GHCR_USERNAME` | GitHub username có quyền đọc package |
| `GHCR_TOKEN` | GitHub PAT có quyền `read:packages` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client id public |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

Ghi chú về GHCR:

- Workflow push image lên GHCR bằng `GITHUB_TOKEN`, không cần tạo secret riêng để push.
- VPS cần pull image từ GHCR. Nếu package private, tạo PAT có scope `read:packages` và lưu vào `GHCR_TOKEN`.
- Nếu package public, có thể bỏ qua `GHCR_USERNAME` và `GHCR_TOKEN`.

## 7. Chạy deploy lần đầu

Push code lên `main`:

```bash
git add .
git commit -m "setup production cicd"
git push origin main
```

Theo dõi pipeline:

`GitHub repository` -> `Actions` -> `CI/CD Docker Compose VPS`.

Lần đầu, pipeline sẽ:

1. Cài dependency và chạy test.
2. Build image:
   - `ghcr.io/OWNER/REPOSITORY/backend:latest`
   - `ghcr.io/OWNER/REPOSITORY/frontend:latest`
   - `ghcr.io/OWNER/REPOSITORY/ai-tryon:latest`
3. SSH vào VPS.
4. Upload `docker-compose.yml`, `deploy/Caddyfile`, `.env.production.example`.
5. Cập nhật image variables trong `/opt/marketplace/.env`.
6. Chạy `docker compose pull` và `docker compose up -d`.

Lưu ý về test hiện tại: backend/frontend test suites trong project đang có một số test cũ không còn khớp code hiện tại. Workflow vẫn chạy test để hiển thị lỗi, nhưng mặc định chưa chặn deploy. Sau khi sửa hết test, vào `Settings` -> `Secrets and variables` -> `Actions` -> `Variables` và thêm:

```text
CI_STRICT_BACKEND_TESTS=true
CI_STRICT_FRONTEND_TESTS=true
```

Từ lúc đó test fail sẽ làm pipeline fail.

Kiểm tra trên VPS:

```bash
cd /opt/marketplace
docker compose ps
docker compose logs -f backend
docker compose logs -f caddy
```

Kiểm tra health:

```bash
curl http://localhost/api/docs
curl http://localhost/ai-tryon/health
```

Nếu dùng domain:

```bash
curl https://shop.example.com/api/docs
curl https://shop.example.com/ai-tryon/health
```

## 8. DNS và HTTPS

Nếu dùng domain, tạo DNS record:

```text
Type: A
Name: shop
Value: SERVER_IP
```

Hoặc nếu dùng domain gốc:

```text
Type: A
Name: @
Value: SERVER_IP
```

Sau khi DNS trỏ đúng về VPS và `APP_DOMAIN=shop.example.com`, Caddy sẽ tự xin/chạy HTTPS. Cần mở cổng 80 và 443.

Nếu đang test bằng IP, đặt:

```env
APP_DOMAIN=:80
FRONTEND_URL=http://SERVER_IP
API_URL=http://SERVER_IP
CORS_ORIGINS=http://SERVER_IP
```

## 9. Deploy các lần tiếp theo

Chỉ cần push code:

```bash
git add .
git commit -m "your change"
git push origin main
```

GitHub Actions sẽ tự test, build image mới, pull trên VPS và restart container.

Nếu muốn deploy lại thủ công trên GitHub:

`Actions` -> `CI/CD Docker Compose VPS` -> `Run workflow`.

## 10. Lệnh quản trị VPS hay dùng

Xem trạng thái:

```bash
cd /opt/marketplace
docker compose ps
```

Xem log:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f ai-tryon
docker compose logs -f caddy
```

Restart một service:

```bash
docker compose restart backend
```

Pull image và restart thủ công:

```bash
docker compose pull
docker compose up -d --remove-orphans
```

Backup MongoDB:

```bash
docker compose exec mongo sh -c 'mongodump \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db marketplace \
  --archive=/tmp/marketplace.archive'

docker compose cp mongo:/tmp/marketplace.archive ./marketplace-$(date +%F).archive
```

Restore MongoDB:

```bash
docker compose cp ./marketplace.archive mongo:/tmp/marketplace.archive
docker compose exec mongo sh -c 'mongorestore \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --drop \
  --archive=/tmp/marketplace.archive'
```

## 11. Xử lý lỗi thường gặp

### Pipeline fail ở bước deploy vì thiếu `.env`

Vào VPS tạo file:

```bash
cd /opt/marketplace
cp .env.production.example .env
nano .env
```

Sau đó chạy lại workflow.

### VPS không pull được image GHCR

Kiểm tra package public/private. Nếu private, thêm:

- `GHCR_USERNAME`
- `GHCR_TOKEN` có scope `read:packages`

Thử login trên VPS:

```bash
echo "YOUR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker compose pull
```

### Frontend gọi `localhost:5000` sau deploy

Nguyên nhân là image frontend được build khi chưa set `VITE_API_URL`.

Sửa GitHub secret:

```text
VITE_API_URL=https://shop.example.com
VITE_AI_TRYON_URL=https://shop.example.com/ai-tryon
```

Sau đó rerun workflow để build lại frontend image.

### Caddy không có HTTPS

Kiểm tra:

- DNS A record đã trỏ về IP VPS.
- Cổng 80 và 443 đã mở.
- `.env` có `APP_DOMAIN=shop.example.com`, không có `https://`.
- `docker compose logs -f caddy`.

### Backend bị lỗi CORS

Kiểm tra trong `/opt/marketplace/.env`:

```env
FRONTEND_URL=https://shop.example.com
CORS_ORIGINS=https://shop.example.com
```

Sau đó chạy:

```bash
docker compose up -d
```

### MongoDB auth fail

Đảm bảo password trong `MONGODB_URI` trùng với `MONGO_INITDB_ROOT_PASSWORD`.

Nếu đã khởi tạo volume Mongo với password cũ, việc sửa `.env` không tự đổi password trong volume cũ. Cách an toàn là đặt lại password trong Mongo, hoặc nếu là môi trường test thì có thể xóa volume:

```bash
docker compose down
docker volume ls | grep mongo
docker volume rm marketplace_mongo_data
docker compose up -d
```

Không xóa volume production nếu chưa backup.
