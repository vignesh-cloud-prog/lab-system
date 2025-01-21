# Server Setup with Docker, Nginx, and Certbot

This guide will help you set up a secure server using **Docker Compose**, **Nginx**, and **Certbot** for automatic SSL certificate management.

---

## **Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Folder Structure](#folder-structure)
3. [Setup Steps](#setup-steps)
4. [Common Commands](#common-commands)
5. [Maintenance](#maintenance)
6. [Troubleshooting](#troubleshooting)

---

## **Prerequisites**
Before you begin, make sure you have:
1. **A domain name** pointing to your server's IP (e.g., `terminal-backend.vlsideepdive.com`).
2. **Docker and Docker Compose** installed on your server:
   - Install Docker: [Install Docker](https://docs.docker.com/get-docker/)
   - Install Docker Compose: [Install Docker Compose](https://docs.docker.com/compose/install/)

---

## **Folder Structure**
Here’s how your project directory should look:

```plaintext
project-root/
├── docker-compose.yml   # Docker Compose configuration
├── nginx/               # Nginx configuration
│   └── nginx.conf       # Main Nginx configuration file
├── certbot/             # Certbot-related data
│   ├── conf/            # Stores SSL certificates
│   └── www/             # Webroot for ACME challenges
├── app/                 # Your application code
│   ├── Dockerfile       # Dockerfile for building the app
│   └── server.js        # Example app server file
```

---

## **Setup Steps**

### 1. Clone the Repository
Clone this repository or set up the folder structure described above.

```bash
git clone <your-repository-url>
cd project-root
```

---

### 2. Configure Nginx
- Open `nginx/nginx.conf` and ensure your domain name is configured:
  ```nginx
  server_name terminal-backend.vlsideepdive.com;
  ```
- Nginx handles traffic on ports `80` (HTTP) and `443` (HTTPS).

---

### 3. Start the Services
Use Docker Compose to build and start the services.

```bash
docker-compose up --build -d
```

- **What happens here?**
  - The `app` container serves your backend on port 5000.
  - The `nginx` container acts as a reverse proxy and handles HTTPS using certificates from the `certbot` container.
  - The `certbot` container automatically fetches and renews SSL certificates.

---

### 4. Verify the Setup
1. Access your server via your domain:
   ```plaintext
   https://terminal-backend.vlsideepdive.com
   ```
2. Use a tool like [SSL Labs](https://www.ssllabs.com/ssltest/) to verify your HTTPS setup.

---

## **Common Commands**

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Check Logs
- View all logs:
  ```bash
  docker-compose logs
  ```
- Check logs for specific services (e.g., `nginx`):
  ```bash
  docker-compose logs nginx
  ```

### Restart Services
```bash
docker-compose restart
```

---

## **Maintenance**

### 1. Certificate Renewal
- Certificates are renewed automatically every 12 hours by the `certbot` service.
- To manually test certificate renewal:
  ```bash
  docker exec certbot certbot renew --dry-run
  ```

### 2. Update Your App or Configuration
- If you make changes to the `nginx.conf` file or your application code:
  1. Restart the services to apply the changes:
     ```bash
     docker-compose restart
     ```

### 3. Monitor Disk Space
- Certbot may accumulate old certificate files over time. Clear unused certificates:
  ```bash
  docker exec certbot certbot delete
  ```

---

## **Troubleshooting**

### 1. SSL Not Working
- Verify that the domain name resolves to your server's IP:
  ```bash
  dig terminal-backend.vlsideepdive.com
  ```
- Check that ports `80` and `443` are open in your firewall or cloud provider (e.g., AWS Security Groups).

### 2. Check Nginx Configuration
- Test your Nginx configuration:
  ```bash
  docker exec nginx nginx -t
  ```
- Restart the Nginx container:
  ```bash
  docker-compose restart nginx
  ```

### 3. Certbot Renewal Issues
- Check Certbot logs:
  ```bash
  docker logs certbot
  ```
- Ensure `.well-known/acme-challenge` requests are handled by Nginx.

---

## **Helpful Resources**
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Certbot Documentation](https://certbot.eff.org/)

---

