const fs = require('fs')
const mqtt = require('mqtt')
const { default: RecordsPile } = require('./recordsPile')

const protocol = 'mqtts'
const host = '5188977cda41495fa6804228c07f7d59.s1.eu.hivemq.cloud'
const port = '8883'
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const connectUrl = `${protocol}://${host}:${port}`

const recodsPile = new RecordsPile();

const createMqttConnection = () => {
  const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'lonedevvs',
    password: 'Secreto123',
    reconnectPeriod: 1000,

    // If the server is using a self-signed certificate, you need to pass the CA.
    ca: fs.readFileSync('./ca.crt'),
  })

  client.on("connect", () => {
    client.subscribe("presence", (err) => {
      if (!err) {
        client.publish("presence", "Hello mqtt");
      }
    });
    client.subscribe("health", (err) => {
      if (!err) {
        client.publish("health", "subscribed");
      }
    });
    client.subscribe("testTopic", (err) => {
      if (!err) {
        client.publish("health", "subscribed to testTopic topic");
      }
    });
  });

  client.on("message", (topic, message) => {
    // message is Buffer
    console.log(message.toString());
    if (topic == 'health' && message.includes("check")) {
      client.publish("health", "Ok");
    }
    if (topic == 'testTopic' && message.includes("voltage")) {
      const voltage = message.toString().split(': ')[1];
      console.log(voltage)
      recodsPile.addRecord(voltage)
    }
  });
}

const mqttWatcher = () => {
  createMqttConnection();
};

module.exports = mqttWatcher;