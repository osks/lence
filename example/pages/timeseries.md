---
title: High Resolution
---

# High Resolution

Charts with 2000 data points.

```sql timeseries
SELECT
  '2024-01-01 00:00:00'::TIMESTAMP + INTERVAL (i) SECOND AS time,
  100 + (random() * 10) + (i * 0.01) + (sin(i / 60.0) * 20) AS value,
  80 + (random() * 10) + (i * 0.005) + (cos(i / 50.0) * 15) AS value2
FROM generate_series(0, 1999) AS t(i)
```

{% chart
    data="timeseries"
    type="line"
    x="time"
    y="value"
/%}

{% areaChart
    data="timeseries"
    x="time"
    y="value,value2"
/%}
