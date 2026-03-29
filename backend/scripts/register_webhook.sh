#!/bin/bash

curl --location 'https://sms.kshitizagrawal.in:443/api/3rdparty/v1/webhooks' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic *' \
--data '{
    "id":"pixel9",
    "url": "https://expenses-api.kshitizagrawal.in/api/webhooks/sms",
    "event": "sms:received",
    "deviceId": "_HHGhfi5jlfmB78Us7l7g"
}'