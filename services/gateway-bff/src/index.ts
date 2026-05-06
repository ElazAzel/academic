import express from "express";

const app = express();
app.use(express.json());
app.get("/healthz", (_request, response) => response.json({ service: "gateway-bff", status: "ok" }));
app.listen(process.env.PORT ?? 4100);

