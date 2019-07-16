const compareVersions = require('./check-updates-actions').compareVersions;
/**
 *  The interval between check for updates.
 *  Set as minutes.
 */
const checkUpdateInterval = 1440; //Minutes


const updater = (SETTINGS, logger, update) => {
    let minutes = 0;
    setInterval(() => {
        minutes += 1;
        if (minutes > checkUpdateInterval - 1) {
            logger.info('Interval updater.');
            compareVersions(SETTINGS, logger, (result) => {
                update(result);
            });
            minutes = 0;
        }
    }, 60000);
}

exports.updater = updater;
