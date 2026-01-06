#!/bin/bash

# Test webhook without signature verification
curl -X POST http://localhost:8080/api/webhooks/sms \
  -H "Content-Type: application/json" \
  -d '{
  "deviceId":"_HHGhfi5jlfmB78Us7l7g",
  "event":"sms:received",
  "id":"TEST-WEBHOOK-001",
  "payload":{
    "message":"Your A/c XX6424 debited by Rs. 420.00 on 06/01/26; APNA DHABA TASTE OF credited. RRN 637200331357. Available balance Rs. 35,860.49. Team IDFC FIRST Bank",
    "receivedAt":"2026-01-06T22:00:09.000+05:30",
    "messageId":"1d937ed2",
    "phoneNumber":"JD-IDFCFB-S",
    "simNumber":1
  },
  "webhookId":"pixel9"
}'

echo ""
