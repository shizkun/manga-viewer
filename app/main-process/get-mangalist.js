const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const DataStore = require('nedb');
const Promise = require('bluebird');
const recursive = require('recursive-readdir');
const { requireTaskPool } = require('electron-remote');
const isDev = require('electron-is-dev');
const { ipcMain, app } = require('electron');
const ZipHandler = require('./archive-handlers/zip.handler');
const Errors = require('../common/errors');
const Regex = require('../common/regex');
const ipc = ipcMain;
const logger = require('electron-log');

const thread = requireTaskPool(require.resolve('./set-thumbnail.worker'));

if (process.env.SPECTRON) {
    app.setPath('userData', path.resolve(app.getAppPath(), ".data"))
}

const dataPath = app.getPath('userData');
const rarPath = isDev ? app.getAppPath() : app.getAppPath() + '.unpacked';
logger.error(dataPath);
logger.error(app.getAppPath());
logger.transports.file.level = 'debug';
logger.transports.console.level = 'debug';

const rarTool = path.join(rarPath, "UnRAR.exe");
logger.info('rarTool path', rarTool);
module.exports = (function () {
    function GetMangaList() {
        logger.debug("--dirname", path.join(__dirname, "/main-process/"));

        this.db = new DataStore({
            filename: path.join(app.getPath('userData'), "manga.db"),
            autoload: true
        });

        this.getMangas = this.getMangas.bind(this);
        this.getFiles = this.getFiles.bind(this);
        this.parseInfo = this.parseInfo.bind(this);
    }

    GetMangaList.prototype.initialize = function () {
        this.initializeOpenFile();
        this.initializeGetSubFolder();
        this.initializeGetMangaList();
        this.initializeGetFavoritesList();
        this.initializeGetPages();
    }


    GetMangaList.prototype.initializeOpenFile = function () {
        ipc.on('get-file-data', function (event) {
            let data = null;
            if (process.platform == 'win32' && process.argv.length >= 2) {
                data = process.argv[1];

                if (!Regex.SUPPORTED_FILES.test(data)) {
                    data = null;
                }
                logger.info("process args", process.argv[0], process.argv[1], data);
            }
            event.returnValue = data;
        })
    }
    GetMangaList.prototype.initializeGetSubFolder = function () {
        ipc.on('get-subfolders', function (event, rootFolder) {

            fs.readdir(rootFolder, {}, function (err, files) {
                if (err) {
                    logger.info("get-mangalist::get-subfolders", err);
                    return;
                }

                let folders = files.map(function (folderName) {
                    let folderPath = path.resolve(rootFolder, folderName);
                    let stat = fs.lstatSync(folderPath);
                    if (stat.isDirectory()) {
                        return {
                            folderName,
                            folderPath
                        }
                    }
                })

                folders = _.filter(folders, function (folder) {
                    return !!folder;
                });
                event.sender.send('get-subfolders-done', folders);
            });
        });
    }

    GetMangaList.prototype.initializeGetMangaList = function () {
        let processing = false;
        let self = this;
        ipc.on('get-manga-list', function (event, data) {
            if (processing) {
                return;
            }
            processing = true;
            logger.info("get-mangalist.js::ipc.on::get-manga-list");
            let rootFolder = data.rootFolder;
            let searchValue = data.searchValue;
            let isRecursive = data.isRecursive;
            let pagination = data.pagination;



            let start = pagination * 50;
            let end = Math.min((pagination + 1) * 50);

            self.getFiles(rootFolder, searchValue, isRecursive)
                .then(self.getMangas)
                .then(mangas => _.sortBy(mangas, 'titleShort'))
                .then(mangas => mangas.slice(start, end))
                .each(manga => {
                    return thread.setThumbnail(manga, dataPath, rarPath)
                        .then(manga => self.updateManga(manga))
                        .then(manga => event.sender.send('get-manga-list-progress', manga))
                        .catch(function (e) {
                            logger.error(e);
                            event.sender.send('get-mangalist-error', e.message.replace('{0}', manga.folderPath));
                        }).then(function () {
                            return logger.debug("done ", manga.folderPath);
                        });
                }).then(() => {
                    processing = false;
                    event.sender.send('get-manga-list-done');
                    logger.debug("get-manga-list::done");
                }).catch((err) => {
                    logger.error(err);
                    event.sender.send('get-mangalist-error', err.message);
                });
        });
    }


    GetMangaList.prototype.initializeGetFavoritesList = function () {
        let processing = false;
        let self = this;
        ipc.on('get-favorites-list', function (event, folderPaths) {
            if (processing) return;
            processing = true;

            logger.info('get-favorites-list::starting..');

            self.getMangas(folderPaths)
                .each(manga => {
                    return thread.setThumbnail(manga, dataPath, rarPath)
                        .then(manga => self.updateManga(manga))
                        .then(manga => event.sender.send('get-favorites-list-progress', manga))
                        .catch(err => { throw err });
                }).then(() => {
                    processing = false;
                    event.sender.send('get-favorites-list-done');
                    logger.debug("done");
                }).catch((err) => logger.info(err));

        });

        ipc.on('get-manga', function (event, folderPath) {
            logger.debug('get-manga::starting..', folderPath);
            let isSupported = Regex.SUPPORTED_FILES.test(folderPath);

            self.getMangas([folderPath])
                .each(manga => {
                    if (!fs.existsSync(manga.folderPath)) {
                        throw new Error(`${Errors.FileDoesNotExist} ${manga.folderPath}`);
                    } else if (!isSupported) {
                        logger.debug(`${manga.folderPath} not supported`)
                        throw new Error(`${Errors.NotSupported} ${manga.folderPath}`);
                    }
                    else {
                        if (!manga.pages) {
                            return thread.getImages(manga, rarPath)
                                .then(self.updateManga(manga))
                                .then(manga => event.sender.send('get-manga-done', manga))
                        } else {
                            return event.sender.send('get-manga-done', manga)
                        }
                    }
                })
                .catch((err) => {
                    logger.info(err);
                    event.sender.send('get-manga-error', `${err.message}`);
                });
        });
    }

    GetMangaList.prototype.initializeGetPages = function () {
        var self = this;
        ipc.on('get-pages', function (event, input) {
            logger.debug('get-pages::starting..');
            thread.getPages(input.folderPath, input.start, input.end, rarPath)
                .then(pages => {
                    logger.debug(`initializeGetPages`)
                    event.sender.send('get-pages-done', pages);
                })
                .catch((error) => {
                    logger.debug(`GetMangaList - ${error.message}`);
                    event.sender.send('get-pages-error', `${error.message}`);
                });
        });
    }

    GetMangaList.prototype.updateManga = function (manga) {
        let self = this;
        logger.debug("updating manga", manga.titleShort);
        return new Promise((resolve, reject) => {
            function handler(err, doc) {
                if (err) return reject(err);
                let obj = doc._id ? doc : manga;
                logger.debug("done updating manga", manga.titleShort);
                resolve(obj);
            }

            if (!manga._id) {
                self.db.insert(manga, handler);
            } else {
                self.db.update({ _id: manga._id }, manga, {}, handler);
            }
        });
    }

    GetMangaList.prototype.getFiles = function (rootFolder, searchValue, isRecursive) {
        let ignored = [];
        logger.debug(`getFiles ${rootFolder}, ${searchValue}, ${isRecursive}`);

        function isNotSearched(file, stats) {
            let filePath = path.basename(file).toLowerCase();
            let isNotSearched = stats.isFile() && filePath.indexOf(searchValue) < 0;
            let archiveRegex = /(\.zip$|\.rar$)/ig;
            let isNotSupportedFileFormat = stats.isFile() &&
                !archiveRegex.test(path.extname(file));
            return isNotSearched || isNotSupportedFileFormat;
        }

        function isDirectory(file, stats) {
            return stats.isDirectory();
        }

        ignored = [isNotSearched];
        if (!isRecursive) {
            ignored.push(isDirectory);
        }

        return new Promise(function (resolve, reject) {
            recursive(rootFolder, ignored, function (err, files) {
                if (err) {
                    logger.error(err);
                }
                resolve(files);
            });
        })
    };

    GetMangaList.prototype.getMangas = function (files) {
        let self = this;
        return Promise.map(files, function (filePath) {
            return new Promise(function (resolve, reject) {
                let mangaTitle = path.basename(filePath, ".zip");
                self.db.findOne({
                    folderPath: filePath
                }, function (err, manga) {
                    if (!manga) {
                        manga = {
                            mangaTitle: mangaTitle,
                            folderPath: filePath,
                            path: path.dirname(filePath)
                        }
                        self.parseInfo(manga);
                        self.db.insert(manga, function (err, doc) {
                            resolve(doc);
                        })
                    } else {
                        resolve(manga);
                    }
                });
            })
        });
    }

    GetMangaList.prototype.parseInfo = function (manga) {
        let title = manga.mangaTitle.trim();
        //parse event
        let event = _.first(title.match(/^\(.*?\)/g));
        manga.event = event;

        //parse circle
        title = title.replace(event, "").trim();
        let circle = _.first(title.match(/^\[.*?\]/g));
        manga.circle = circle;

        //parse language & translator - Limitation only english language for now
        title = title.replace(circle, "").trim();
        let languageAndScanlator = _.first(title.match(/[\[\(]eng.*/gi)) || "";

        //set title        
        title = title.replace(languageAndScanlator, "").trim();
        manga.titleShort = title;

        //parse language
        let language = _.first(languageAndScanlator.match(/[\[\(]Eng.*?[\]\)]/g));
        manga.language = language;

        //parse resolution
        let scanlatorAndResolution = languageAndScanlator.replace(language, "").trim();
        let resolution = _.first(scanlatorAndResolution.match(/[-][0-9]+[x]/g));
        manga.resolution = resolution;

        //set scanlator
        manga.scanlator = scanlatorAndResolution.replace(resolution, "");
    }

    return GetMangaList;
})();
