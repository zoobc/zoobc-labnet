'use strict';

const fs = require('fs');

const balena = require('balena-sdk')({
    apiUrl: "https://api.raspi.zoobc.org",
});

const pLimit = require('p-limit');

const APP_NAME = 'zbcDev';
const SERVICE_NAME = 'main';
const FILE_NAME = process.argv[2] || '../zoobc-core/resource_cluster/cluster_config.json';
const API_LIMIT_CONCURRENT = 10;

Promise.all([
    balena.models.device.getAllByApplication(APP_NAME), // devices
    balena.models.service.getAllByApplication(APP_NAME), // services
    new Promise((resolve, reject) => {
        fs.readFile(FILE_NAME, (err, data) => {
            if (err) { reject(err); }
            else { resolve(data); }
        })
    }) // Json
]).then(([devices, services, configJson]) => {
    const configArr = JSON.parse(configJson);
    const limit = pLimit(API_LIMIT_CONCURRENT);

    // console.debug(services.map(s => ({service_name: s.service_name, id: s.id })));
    const [service] = services.filter(s => s.service_name === SERVICE_NAME);
    console.info(`Service Name: ${service.service_name}`);
    console.info(configArr);

    const setDevicePromises = devices.sort((a, b) => a.id - b.id).map((device, idx) => {
        const config = configArr[idx];
        if (!config) return;

        const setVarPromises = Object.entries(config).map(([key, value]) =>
            limit(() => balena.models.device.serviceVar.set(device.uuid, service.id, key, value).catch((err) => console.warn(err.message)))
        );

        return Promise.all(setVarPromises).then(() =>
            balena.models.device.serviceVar.getAllByDevice(device.uuid)
        ).then((vars) => {
            const orphanedVars = vars.filter(v => !(v.name in config));
            const removeVarPromises = orphanedVars.map((v) =>
                limit(() => balena.models.device.serviceVar.remove(device.uuid, service.id, v.name).catch((err) => console.warn(err.message)))
            );
            return Promise.all(removeVarPromises).then(() => {
                return vars.filter(v => (v.name in config))
            });
        }).then((vars) => {
            return Object.assign({}, device, { serviceVars: vars })
        });
    });

    return Promise.all(setDevicePromises);
}).then((devices) => {
    devices.filter(d => !!d).forEach((device) => {
        console.info(`----- Device UUID: ${device.uuid.substr(0, 7)} -----`);
        // console.debug(device);
        device.serviceVars.forEach((sVar) => {
            console.info(`[${sVar.service_install.__id}][id: ${('000' + sVar.id).substr(-3)}] ${sVar.name}=${sVar.value}`);
        });
    });
    // balena.models.device.serviceVar.getAllByApplication(APP_NAME).then(function(vars) {
    //     console.debug(vars.map(v => ({ id: v.id, name: v.name, value: v.value })));
    // });
}).catch(err => console.error(err));
