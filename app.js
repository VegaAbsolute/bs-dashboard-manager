const fs = require('fs');
const path = require('path');

const startServerProcess = require('./src/start-server-process.js').startServerProcess;
const buttonObserver = require('./src/button-observer.js').buttonObserver;
const editSettings = require('./src/utils/edit-settings.js').editSettings;

const MAIN_DIR = path.join(__dirname, '..')
const initLogger = require('./src/utils/logger.js').logger(MAIN_DIR);

try {
    /**
     * read SETTINGS file
     */
    fs.readFile(MAIN_DIR + '/settings.json', {encoding: 'utf-8'}, (err, settings) => {
        initLogger.silly('reading settings.json')
        if (err) {
            initLogger.error(err.name + "\n\r" + err.message + "\n\r" + err.stack);
            process.exit(-1);
        } else {
            initLogger.silly(settings);
            const SETTINGS = Object.assign(
                JSON.parse(settings),
                {
                    MAIN_DIR
                }
            );

            const logger = require('./src/utils/logger.js').logger(MAIN_DIR, SETTINGS.loggerLevel, SETTINGS.maxLevelForConsoleLogger);

            /**
             * Dashboard startup methods
             */
            if (SETTINGS.isRebooting) {
                logger.debug('SETTINGS.isRebooting === true');
                editSettings(MAIN_DIR, 'isRebooting', false);

                startServerProcess(SETTINGS)(logger);
            } else {
                logger.debug('SETTINGS.isRebooting !== true');
                switch (SETTINGS.SERVER_STARTUP_METHOD) {
                    case 'automatically': {
                        logger.debug('switch SERVER_STARTUP_METHOD = automatically');
                        startServerProcess(SETTINGS)(logger);
                        break;
                    }
                    default: {
                        logger.debug('switch SERVER_STARTUP_METHOD = "button"');
                        buttonObserver(logger, ()=>startServerProcess(SETTINGS)(logger));
                    }
                }
            }
        }
    });

    /**
     *  Exit if parent process(Launcher) is disconnected
     *
     */
    process.on('disconnect', () => {
        logger.warn('Launcher was exited');
        process.exit(-1)
    });
} catch(err) {
    initLogger.error(err.name + "\n\r" + err.message + "\n\r" + err.stack);
    process.exit(-1);
}
