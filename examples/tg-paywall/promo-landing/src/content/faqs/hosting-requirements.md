---
question: "What are the hosting requirements?"
answer: |
  The system is designed to be **lightweight and flexible**:
  
  **Minimum Requirements:**
  - **CPU:** 1 core
  - **RAM:** 512MB
  - **Storage:** 1GB (for SQLite database and logs)
  - **Runtime:** Node.js 18+ or Bun 1.3+
  
  **Deployment Options:**
  
  | Option | Monthly Cost | Best For |
  |--------|-------------|----------|
  | Serverless (Vercel, Cloudflare) | $0-20 | < 10K users |
  | VPS (Hetzner, DigitalOcean) | $5-10 | 10K-100K users |
  | Managed (AWS, GCP) | $50+ | 100K+ users |
  
  **Database:** SQLite is used by default (file-based, no setup). For production with high traffic, you can switch to PostgreSQL by changing one line in the configuration.
category: "technical"
order: 5
featured: false
---
