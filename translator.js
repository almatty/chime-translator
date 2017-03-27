'use strict';

let chalk = require('chalk');
let _ = require('lodash');
let fs = require('fs');
let config = require('./config');
const translateClient = require('@google-cloud/translate')({
    projectId: config.googleProjectID,
    keyFilename: config.googleKeyFilePath
});

function Translator() {
    let targetLang = '';
    let translatedResource = {};
    let tempObj = {};

    console.log(chalk.green('Loading base english resource file'));

    let englishFile = fs.readFileSync(config.dictionary); // fs.readFileSync('./translations/locale-en.json');
    let resource = JSON.parse(englishFile);
    console.log(chalk.green('Base text loaded'));

    //Exposed translate function.
    this.translate = (targetLanguage) => {
        targetLang = targetLanguage;
        console.log(chalk.green('Beginning translation'));
        translateResources();
    };

    //VOID: Main function -
    // Iterates over values in the tempObj and submits them to translation API
    // Collects all promises for translation, and writes out files upon completion
    function translateResources() {
        unwrapResourceObj(resource);

        let promises = [];

        _.forEach(tempObj, (value, key) => promises.push(translateString(value, key)));

        Promise.all(promises).then(() => {
            console.log(chalk.green('All promises resolved'));
            writeFile();
        }).catch(() => console.log(chalk.red('Something went wrong during translation')));

        console.log(chalk.green('All resources submitted for translation'));
    }

    // Promise<gTranslate>:
    function translateString(str, key) {
        console.log(chalk.cyan('Submitting string for translation'), key, chalk.green(str));
        let opts = { from: config.baseLang, to: targetLang };
        return translateClient.translate(str, opts)
            .then(result => {
                translatedResource[key] = result[0];
                console.log(chalk.cyan('Translation completed'), key, chalk.magenta(result[0]));
            })
            .catch(err => console.log(chalk.red('Error translating resource "' + key + '" :: ' + err.message)))
    }

    //VOID: Writes the translated resource file out to the destination directory.
    function writeFile() {
        console.log(chalk.green('Writing resource file'));
        let outputFile = `${config.dist}/locale-${targetLang}.json`;
        fs.writeFile(outputFile, JSON.stringify(translatedResource, null, 4), err =>
            (err) ? console.log(chalk.red('Error outputting translated resource'), (err))
                : console.log(chalk.green('Translated resource saved to ' + outputFile)));
        console.log('Resources have been translated. You may need to check variables used in expressions.')
    }

    //VOID: recursively reads the resource object, and stores it in a flat object (tempObj)
    function unwrapResourceObj(obj, root) {
        let objRoot = root || '';

        _.forOwn(obj, (value, key) => {
            let _key = objRoot ? `${objRoot}.${key}` : key;
            typeof value === 'object' ? unwrapResourceObj(value, _key) : toTempObj(_key, value);
        });
    }

    //VOID: Writes the key/value pair into the flat tempObj
    function toTempObj(key, value) {
        tempObj[key] = value;
    }
}



module.exports = new Translator();