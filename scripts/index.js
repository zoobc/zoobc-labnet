'use strict';

const fs = require('fs');

const balena = require('balena-sdk')({
    apiUrl: "https://api.raspi.zoobc.org",
});

const APP_NAME = 'zbcDev';
const SERVICE_NAME = 'main';
const FILE_NAME = process.argv[2] || '../zoobc-core/resource/cluster_config.json';

fs.readFile(FILE_NAME, (err, data) => {
    if (err) throw err;
    const configArr = JSON.parse(data);

    balena.models.device.getAllByApplication(APP_NAME).then(function(devices) {
        balena.models.service.getAllByApplication(APP_NAME).then(function(services) {
            // console.debug(services.map(s => ({service_name: s.service_name, id: s.id })));
            const [service] = services.filter(s => s.service_name === SERVICE_NAME);
            console.info(`Service Name: ${service.service_name}`);

            const setDevicePromises = devices.sort((a, b) => a.id - b.id).map((device, idx) => {
                const config = configArr[idx];
                if (!config) return;

                const setVarPromises = Object.entries(config).map(([key, value]) =>
                    balena.models.device.serviceVar.set(device.uuid, service.id, key, value)
                );

                return Promise.all(setVarPromises).then(() =>
                    balena.models.device.serviceVar.getAllByDevice(device.uuid)
                ).then((vars) =>
                    Object.assign({}, device, { serviceVars: vars })
                );
            });

            Promise.all(setDevicePromises).then(function(devices) {
                devices.filter(d => !!d).forEach((device) => {
                    console.info(`----- Device UUID: ${device.uuid.substr(0, 7)} -----`);
                    // console.debug(device);
                    device.serviceVars.forEach((sVar) => {
                        console.info(`[id: ${('000' + sVar.id).substr(-3)}] ${sVar.name}=${sVar.value}`);
                    });
                });
                // balena.models.device.serviceVar.getAllByApplication(APP_NAME).then(function(vars) {
                //     console.debug(vars.map(v => ({ id: v.id, name: v.name, value: v.value })));
                // });
            });
        });
    });
});
