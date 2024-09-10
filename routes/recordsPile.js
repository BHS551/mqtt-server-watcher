const axios = require('axios');

class RecordsPile {
    MAX_RECORDS = 5;
    records;
    constructor() {
        this.records = []
    }
    async addRecord(record) {
        this.records.push(record);
        if (this.records.length >= this.MAX_RECORDS) {
            await this.processRecords();
            this.records = [];
        }
    }
    async processRecords() {
        const reqBody = {
            topic: 'reqTopic',
            deviceRecords: this.records.map(rec => ({
                voltage: rec
            })),
            deviceId: 'voltageMonitor01'
        }
        try {
            const result = await axios.post('https://dqye1uxl75.execute-api.us-east-1.amazonaws.com/deviceRecords', reqBody)
            return result;
        } catch (err) {
            console.log(err)
        }
    }
}

exports.default = RecordsPile;