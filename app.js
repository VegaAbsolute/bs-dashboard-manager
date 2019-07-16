const fs = require('fs');
const fork = require('child_process').fork;
const path = require('path');

const MAIN_DIR = path.join(__dirname, '..')

const compareVersions = require('./src/updater/check-updates-actions').compareVersions;
const setupUpdate = require('./src/updater/setup-update-actions').setupUpdate;
const readVersion = require('./src/updater/version-file-actions').readVersion;
const updater = require('./src/updater/updater').updater;
const logger = require('./src/utils/logger.js').logger(MAIN_DIR);

/**
 *  Exit if parent process(Launcher) is disconnected
 *
 */
process.on('disconnect', () => {
    logger.warn('Launcher was exited');
    process.exit(-1)
});

/**
 *  Prepare data and run dashboard process
 *
 */
fs.readFile(MAIN_DIR + '/settings.json', {encoding: 'utf-8'}, (err, settings) => {
    // TODO: error handler
    if (err) {
        // TODO: check format of 'err'
        logger.error(err);
        process.exit(-1);
    } else {
        const SETTINGS = Object.assign(
            JSON.parse(settings),
            {
                MAIN_DIR
            }
        );
        readVersion(logger, MAIN_DIR, SETTINGS.BS_DASHBOARD.FILE, (currentDashboardVersion) => {
            readVersion(logger, MAIN_DIR, SETTINGS.BS_DASHBOARD_MANAGER.FILE, (currentManagerVersion) => {
                dashboardProcess(Object.assign(
                    SETTINGS,
                    { CURRENT_MANAGER_VERSION: currentManagerVersion },
                    { CURRENT_DASHBOARD_VERSION: currentDashboardVersion }
                ));
            })
        })
    }
});


const dashboardProcess = (SETTINGS, currentManagerVersion, currentDashboardVersion) => {
    let lastVersionData;

    /**
     *  Initial check for updates
     *
     */
    logger.info('Initial updater.');
    compareVersions(SETTINGS, logger, (newUpdateData) => {
        lastVersionData = newUpdateData;
        // TODO: debug console.log();
        //console.log(lastVersionData);
        child.send({ cmd: 'update_is_available', data: newUpdateData });
    });
    /**
     *  Start update requester
     *
     */
    updater(SETTINGS, logger, (newUpdateData) => {
        lastVersionData = newUpdateData;
        // TODO: debug console.log();
        //console.log(lastVersionData);
        if(newUpdateData.isAvailableUpdate) {
            child.send({ cmd: 'update_is_available', data: newUpdateData });
        }
    });

    /**
     *  Run bs-dashboard
     *
     */
    logger.info('Starting bs-dashboard...');
    child = fork(SETTINGS.BS_DASHBOARD.DIR+'/app.js');

    /**
     *  Send initial data
     *
     */
    child.send({
        cmd: 'initial_data',
        data: {
            managerVersion: SETTINGS.CURRENT_MANAGER_VERSION
        }
    });


    child.on('message', (message) => {
        switch (message.cmd) {
            case 'update_confirmed': {
                setupUpdate(SETTINGS, lastVersionData, logger, (err) => {
                    if (err) {
                        // TODO: check format of 'err'
                        logger.warn('Setup update error: ' + err);
                        child.send({ cmd: 'update', result: err });
                    } else {
                        child.send({ cmd: 'update', result: 'update_completed' });
                    }
                });
                break;
            }
            default: {
                logger.warn('I got unknown command from bs-dashboard: ' + message.cmd);
            }
        }
    });

    child.on('close', (code) => {
      logger.warn(`bs-dashboard exited with code: ${code}`);
      process.exit(code);
    });
}
