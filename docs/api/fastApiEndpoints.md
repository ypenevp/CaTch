# FastAPI Documentation

## Fall Detection Module 

- Base URL: `http://127.0.0.1:7070`

| Description | Method | Full URL | Required Role | Bearer JWT Required? | Expected Status | Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Analyze Sensor Records** (returns `activity`, `fall_detected`, `fall_probability`, `fall_assessment`) | `POST` | `/analyze` | `None` | No | `200` | **Body:** `records` (exactly `75` items with `ax`, `ay`, `az`, `droll`, `dpitch`, `dyaw`), `bpm` (optional) |
