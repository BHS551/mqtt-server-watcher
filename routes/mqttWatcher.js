const fs = require('fs')
const mqtt = require('mqtt')

const protocol = 'mqtts'
const host = 'e5547786a1c644639b5584dd5bebea46.s1.eu.hivemq.cloud'
const port = '8883'
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const connectUrl = `${protocol}://${host}:${port}`

const createMqttConnection = () => {
  const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'bhs551',
    password: 'cualquierCosa551',
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
  });

  client.on("message", (topic, message) => {
    // message is Buffer
    console.log(message.toString());
    if (topic == 'health' && message.includes("check")) {
      client.publish("health", "Ok");
    }
  });
}

const mqttWatcher = () => {
  createMqttConnection();
};

module.exports = mqttWatcher;