'use strict';

//dependancies
const fs = require('fs');
const path = require('path');
const through = require('through2');
const babel = require('babel-core');
const replaceExt = require('replace-ext');
const gutil = require('gulp-util');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

//promises
const transformTemplate = config => {
    return new Promise(function(fulfill, reject) {
        config.template = babel.transform(config.fileContents, {
            'presets': ['es2015', 'react'],
            'plugins': ['transform-es2015-modules-umd']
        }).code;
        fulfill(config);
    });
};

const writeTemporaryTemplate = config => {
    // use eval or vm to avoid this step?
    config.tempFilePath = __dirname + '/.tmp/' + config.filePath.split('/').pop();
    return new Promise(function(fulfill, reject) {
        fs.writeFile(config.tempFilePath, config.template, function(err) {
            if (err) {
                reject(err);
            } else {
                fulfill(config);
            }
        });
    });
};

const generateMarkup = config => {
    return new Promise(function(fulfill, reject) {
        let template = React.createElement(require(config.tempFilePath), config.data);
        fs.unlink(config.tempFilePath, (err) => {
            if (err) {
                reject(err);
            } else {
                fulfill(ReactDOMServer.renderToStaticMarkup(template));
            }
        });
    });
};

const replaceExtension = filePath => {
    if (path.extname(filePath)) {
        return replaceExt(filePath, '.html')
    } else {
        return filePath;
    }
}

module.exports = opts => {

    opts = opts || {};

    return through.obj(function(file, enc, callback) {

        if (file.isNull()) {
            cb(null, file);
            return;
        }

        try {

            transformTemplate({
                    fileContents: file.contents.toString(),
                    filePath: file.path,
                    data: {
                        name: 'Bill'
                    }
                })
                .then(writeTemporaryTemplate)
                .then(generateMarkup)
                .then(markup => {
                    file.contents = new Buffer(markup);
                    file.path = replaceExtension(file.path);
                    this.push(file);
                    callback();
                });

        } catch (err) {

            this.emit('error', new gutil.PluginError('gulp-jsx2html', err, {
                fileName: file.path,
                showProperties: false
            }));

            callback();

        }

    });
};
