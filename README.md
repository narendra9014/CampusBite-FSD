<<<<<<< HEAD
# CampusBite — College Canteen Ordering Platform

A full-stack FSD project inspired by modern food-ordering apps, with a bold Indian-campus maximalist visual identity.

## Features
- Student registration and login
- Separate admin login
- Food menu with category filtering and search
- Cart quantity controls, item prices, total, and checkout
- My Orders with date, items, total, and live status
- Admin food CRUD (create, edit, delete)
- Admin order dashboard and status updates
- Express REST API with JSON-file persistence
- Responsive React UI

## Stack
- Frontend: React, Vite, HTML, CSS
- Backend: Node.js, Express
- Persistence: local JSON database file (`server/data/db.json`)
- Auth: bcrypt password hashing + JWT

## Requirements
Node.js 18+ and npm.

## Run locally
Open a terminal in this project folder:

```bash
npm run install:all
npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:5000/api  
Health check: http://localhost:5000/api/health

## Demo admin
- Email: `admin@campusbite.com`
- Password: `Admin@123`

Register a student account using the Student Register option.

## Project file structure
```text
CampusBite-FSD/
├── package.json
├── README.md
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
└── server/
    ├── package.json
    ├── server.js
    ├── .env.example
    └── data/
        └── db.json
```

## API overview
- `POST /api/auth/register` — student account creation
- `POST /api/auth/login` — student/admin login
- `GET /api/foods` — menu
- `POST /api/foods` — admin add food
- `PUT /api/foods/:id` — admin edit food
- `DELETE /api/foods/:id` — admin delete food
- `POST /api/orders` — student place order
- `GET /api/orders/my` — student order history
- `GET /api/orders` — admin all orders
- `PATCH /api/orders/:id/status` — admin update status

## Notes for academic demo
This is a local demonstration application. For real deployment, use a production database, HTTPS, environment-based secrets, stricter validation, and hardened rate limiting.
=======
# CampusBite-FSD
Full-Stack College Canteen Food Ordering System
>>>>>>> f15c49a6065299b99107e81d3e9a207ce7d9f864
