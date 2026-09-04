# mqtt-server-watcher

A small Express service that subscribes to MQTT topics on HiveMQ Cloud,
buffers device readings, and forwards them to an HTTP API in batches.

It is the bridge between devices that speak MQTT and the record-storage API in
[esp32-control-server](https://github.com/BHS551/esp32-control-server).

## The problem it solves

A sensor publishing a voltage reading every few seconds produces a stream of
tiny messages. Forwarding each one as its own HTTP request means one Lambda
invocation, one S3 read-modify-write and one round trip per reading — the
overhead dwarfs the payload, and the cost scales with message count rather than
with data volume.

This service absorbs the stream and turns it into periodic batched writes.

## How it works

```
HiveMQ Cloud (mqtts, TLS with pinned CA)
   │
   ├── subscribe: presence, health, testTopic
   │
   ▼
on message
   ├── health   + "check"    ──► publish "Ok"        (liveness answer)
   └── testTopic + "voltage" ──► RecordsPile.addRecord(value)
                                      │
                                      │  buffer reaches MAX_RECORDS (5)
                                      ▼
                                POST /deviceRecords
                                { topic, deviceId, deviceRecords: [ {voltage}, … ] }
```

`RecordsPile` is the whole batching mechanism: readings accumulate in an array,
and when it reaches the threshold the batch is posted and the buffer cleared.

## Key technical decisions

**The buffer flushes on count, not on a timer.** A size threshold means the
batch size is predictable and no reading is left waiting on an idle interval.
The trade-off is that a device that goes quiet leaves its partial batch
unflushed — acceptable for a continuously reporting sensor, and the reason this
is a watcher rather than a general-purpose queue.

**The buffer is cleared only after the POST resolves**, so a slow request does
not drop the readings that arrive during it.

**A failed POST is logged, not thrown.** `processRecords` catches and logs, so
one API outage does not tear down the MQTT subscription — the connection stays
up and the next batch tries again.

**The broker connection is TLS with an explicit CA.** It connects over `mqtts`
with `ca` loaded from a certificate file rather than disabling verification,
and `reconnectPeriod` keeps it retrying after a drop.

**Health is answered, not just observed.** The service replies `Ok` to a
`check` on the `health` topic, so an external monitor can verify the bridge is
alive end-to-end through the broker.

## Running it

```bash
npm install
npm start          # http://localhost:3000
```

The Express app itself serves a single Jade-rendered index page; the MQTT
watcher is started separately from `routes/mqttWatcher.js`.

Configuration currently lives at the top of `routes/mqttWatcher.js` — broker
host, port, credentials and the target API URL — and the broker CA is read
from `./ca.crt`.

> **Note.** The broker credentials are literals in the source. Move them to
> environment variables before deploying this anywhere real, and rotate them if
> the repository has been public.
