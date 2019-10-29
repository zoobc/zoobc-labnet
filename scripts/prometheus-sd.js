'use strict';

const fs = require('fs');

const balena = require('balena-sdk')({
    apiUrl: "https://api.raspi.zoobc.org",
});

// See: https://prometheus.io/docs/guides/file-sd/
const FILE_PATH = process.argv[2] || '../prometheus/targets.json';
const APP_NAME = process.argv[3] || 'zbcDev';
const SERVICE_MONITORING_PORTS = {
    main: 9090,
    n2: 9091,
    n3: 9092,
};

function writeJsonArray(stream, arr) {
    function writeNext(reject) {
        try {
            const obj = arr.shift();
            if (arr.length > 0) {
                stream.write(`${JSON.stringify(obj)},\n`);
                setImmediate(writeNext, reject);
            } else {
                stream.end(`${JSON.stringify(obj)}\n]`);
            }
        } catch(err) {
            reject(err);
        }
    }

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(stream));
        stream.on('error', (err) => reject(err));
        stream.write('[\n'); // Begin array
        writeNext(reject);
    });
}

Promise.all([
    balena.models.device.getAllByApplication(APP_NAME), // devices
    balena.models.service.getAllByApplication(APP_NAME), // services
]).then(([devices, services]) => {
    const sdConfig = [];
    devices.forEach((device) => {
        const entries = Object.entries(SERVICE_MONITORING_PORTS).map(([serviceName, monitoringPort]) => {
            const service = services.find(s => s.service_name === serviceName);
            if (service) {
                const labels = {
                    cluster_name: APP_NAME,
                    service_name: service.service_name,
                    device_uuid_short: device.uuid.substr(0, 7),
                    device_uuid: device.uuid,
                    device_name: device.device_name,
                    device_type: device.device_type,
                    device_os_version: device.os_version,
                    device_os_variant: device.os_variant,
                    device_supervisor_version: device.supervisor_version,
                    device_is_online: device.is_online,
                    device_status: device.status,
                };
                const targets = [];
                if (device.public_address) targets.push(`${device.public_address}:${monitoringPort}`);
                if (device.ip_address) targets.push(`${device.ip_address}:${monitoringPort}`);
                if (device.vpn_address) targets.push(`${device.vpn_address}:${monitoringPort}`);
                return { labels, targets };
            }
        }).filter(val => !!val);
        sdConfig.push(...entries);
    });
    return sdConfig;
}).then((sdConfig) => {
    return writeJsonArray(fs.createWriteStream(FILE_PATH), sdConfig);
}).then(({path, bytesWritten}) => {
    console.info(path, bytesWritten);
}).catch(err => console.error(err));
