This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Fullstack GIS webapp built using deck.gl.

## Getting Started

First, download the URA masterplan geojson from https://data.gov.sg/datasets/d_90d86daa5bfaa371668b84fa5f01424f/view and add it to your public folder. (the folder with file.svg, globe.svg etc).

Second, run the development server:

```bash
npm install

npm run dev

# then run backend server on local
source api/start-backend.sh
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

This project's next.js frontend is deployed on vercel

A separate python backend (/api in this repo) is deployed on railway to serve geospatial functions.
