const download = require('./download');
const exec = require('child_process').exec;
const setVersion = require('./version-file-actions').setVersion;
const changeVersionInPackageFile = require('./package-file-actions').changeVersionInPackageFile;

// TODO: make composer
const setupUpdate = (SETTINGS, lastVersionData, logger, next) => {
    logger.debug('setupUpdate');
    // Update both apps
    if (lastVersionData.dashboardVersion.isAvailableUpdate && lastVersionData.managerVersion.isAvailableUpdate) {
        logger.info('Update both app.');
        downloadNewUpdates(logger, SETTINGS.MAIN_DIR, SETTINGS.BS_DASHBOARD, (err) => {
            if (!err) {
                downloadNewUpdates(logger, SETTINGS.MAIN_DIR, SETTINGS.BS_DASHBOARD_MANAGER, (err) => {
                    if (!err) {
                        setupNewUpdates(logger, SETTINGS.MAIN_DIR, SETTINGS.BS_DASHBOARD.DIR, SETTINGS.BS_DASHBOARD, lastVersionData.dashboardVersion, (err) => {
                            if (!err) {
                                setupNewUpdates(logger, SETTINGS.MAIN_DIR, SETTINGS.MAIN_DIR + '/app', SETTINGS.BS_DASHBOARD_MANAGER, lastVersionData.managerVersion, (err) => {
                                    next(err);
                                })
                            } else {
                                next(err)
                            }
                        })
                    } else {
                        next(err)
                    }
                });
            } else {
                next(err)
            }
        });
    //update only app
    } else if (lastVersionData.dashboardVersion.isAvailableUpdate || lastVersionData.managerVersion.isAvailableUpdate) {
        logger.info('Update only app.');
        let settings;
        let dir;
        let lastVersion;
        if (lastVersionData.dashboardVersion.isAvailableUpdate) {
            logger.verbose('Update for BS_DASHBOARD');
            settings = SETTINGS.BS_DASHBOARD;
            dir = SETTINGS.BS_DASHBOARD.DIR;
            lastVersion = lastVersionData.dashboardVersion;
        } else {
            logger.verbose('Update for BS_DASHBOARD_MANAGER');
            settings = SETTINGS.BS_DASHBOARD_MANAGER;
            dir = SETTINGS.MAIN_DIR + '/app';
            lastVersion = lastVersionData.managerVersion;
        }
        downloadNewUpdates(logger, SETTINGS.MAIN_DIR, settings, (err) => {
            if (!err) {
                setupNewUpdates(logger, SETTINGS.MAIN_DIR, dir, settings, lastVersion, (err) => {
                    next(err);
                })
            } else {
                next(err)
            }
        });
    // Don't update
    } else {
        logger.info('Update is not required');
        next('update_is_not_required');
    }

}

/**
 *
 *  @return - run callback function with parameter: {String} error
 */
 // TODO: make composer
const downloadNewUpdates = (logger, MAIN_DIR, appSource, next) => {
    const { TEMP, GIT_NAME, GIT_REPO, GIT_PROVIDER, GIT_DOMAIN } = appSource;
    logger.info('Download update for [' + GIT_REPO + '] is begun...');
    // clear temporary folder
    exec(
        'rm -r' + ' ' + MAIN_DIR + '/' + TEMP + '/*',
        (error, stdout, stderr) => {
            // download and unpack new wersion
            let gitSource;
            switch (GIT_PROVIDER) {
                case 'GIT_LAB': {
                    gitSource = 'http://' + GIT_DOMAIN + '/' + GIT_NAME + '/' + GIT_REPO + '/-/archive/master/' + GIT_REPO + '-master.tar.gz';
                    break;
                }
                case 'GIT_HUB': {
                    gitSource = 'https://' + GIT_DOMAIN + '/' + GIT_NAME + '/' + GIT_REPO + '/archive/master.zip';
                    break;
                }
                default : {}
            }
            logger.silly('gitSource = ' + gitSource);
            download(
                'direct:' + gitSource,
                MAIN_DIR + '/' + TEMP,
                { headers: { 'PRIVATE-TOKEN': '' } },
                (err) => {
                    if (!err) {
                        logger.info('Download update for [' + GIT_REPO + '] is success.');
                    }
                    next(err);
                }
            );
        }
    );
};

// TODO: make composer
const setupNewUpdates = (logger, MAIN_DIR, DIR, appSource, lastVersion, next) => {
    const { TEMP, GIT_REPO, FILE } = appSource;
    logger.info('Setup update for [' + GIT_REPO + '] is begun...');
    // clear work folder
    exec(
        'rm -r' + ' ' + DIR + '/*',
        (error, stdout, stderr) => {
            // move new version from temporary folder to work folder
            exec(
                'mv ' + MAIN_DIR + '/' + TEMP + '/* ' + DIR,
                (error, stdout, stderr) => {
                    if ( !error ) {
                        // write new version in package file
                        const { date, message } = lastVersion;
                        changeVersionInPackageFile(logger, DIR, message, (err) => {
                            // write new version in version file
                            if (!err) {
                                logger.info('Setup update for [' + GIT_REPO + '] is success.');
                                setVersion(MAIN_DIR + '/' + FILE, {date, message}, () => {
                                    next();
                                });
                            } else {
                                next(err);
                            }
                        })
                    } else {
                        next(stderr+error);
                    }
                }
            );
        }
    );
}

exports.setupUpdate = setupUpdate;
