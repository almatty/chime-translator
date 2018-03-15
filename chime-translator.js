'use strict';

let chalk = require('chalk');
let _ = require('lodash');
let fs = require('fs');
let config = require('./config');
let flatten = require('flat');
let unflatten = require('flat').unflatten;

const translateClient = require('@google-cloud/translate')({
    projectId: config.googleProjectID,
    keyFilename: config.googleKeyFilePath
});

let debugArr = [];

const logger = {
    log: function() {
        console.log.apply(console, arguments);
        debugArr.push(arguments)
    }
}

function ChimeTranslator() {
    let targetLanguage = '';
    let translatedResource = {};
    let deepTranslatedResource = {};
    let tempObj = {};
    let resource = {};
    let variableDictionary = {};
    let failedTranslations = {};
    let opts = {
        from: config.baseLang,
        to: ''
    };
    
    logger.log(chalk.green('Loading base resource file'));
    resource = JSON.parse(fs.readFileSync(config.dictionary));
    logger.log(chalk.green('Base resource dictionary loaded'))

    this.translateDictionary = (targetLang) => {
        targetLanguage = targetLang;
        opts.to = targetLang;
        translate();
    }

    function translate() {
        flattenResourceObject(resource);
        buildVariableDictionary();

        let promises = [];

        _.forEach(tempObj, (value, key) => promises.push(translateString(value, key)));
        
        _.forEach(variableDictionary, (value, key) => 
            _.forEach(value, (v, k) => promises.push(translateVariable(v.variable, key)))
        );

        Promise.all(promises)
            .then(() => {
                logger.log(chalk.green('All promises resolved!'));
                reorderTranslationObject();
                cleanUpVariables();
                finisher();
            }).catch(err => logger.log(chalk.red('Something went wrong during translation'), err))
    }

    function finisher() {
        fs.writeFile(`${config.dist}/locale-${targetLanguage}-failed.json`,
            JSON.stringify(failedTranslations, null, 2), err => err ? logger.log('Error writing failed translation file') : logger.log('Failed translations logged'));
        let originalSize = _.size(tempObj);
        let translatedSize = _.size(translatedResource);
        let failedSize = _.size(failedTranslations);
        logger.log(chalk.yellow(`Original resource size: ${originalSize}. Translated resource size: ${translatedSize}`));
        logger.log(chalk.red(`${failedSize} translations failed. Please review the locale-${targetLanguage}-failed.json file for failed translations`));

        writeFile();
        writeDebug();
    }

    function writeDebug() {
        let debugOutput = '';
        _.forEach(debugArr, elem => {
            let line = '';
            _.forEach(elem, v =>  line += v.replace(/\[\d\d\w/ig, '') + ' ');
            debugOutput += line + '\n'
        });

        fs.writeFile(`${config.dist}/locale-${targetLanguage}-debug.txt`, debugOutput, err => err ? console.log(err) : true);
    }

    function reorderTranslationObject() {
        let pairArr = _.toPairs(translatedResource);
        let sortedPairs = _.sortBy(pairArr, o => o[0]);
        translatedResource = _.fromPairs(sortedPairs);
        deepTranslatedResource = unflatten(translatedResource);
        // fs.writeFile(`${config.dist}/locale-${targetLanguage}-deep.json`, JSON.stringify(deepTranslatedResource, null, 2))
    }


    function translateString(str, key) {
        logger.log(chalk.cyan('Submitting string for translation'), key, chalk.green(str));

        return translateClient.translate(str, opts)
            .then(result => {
                translatedResource[key] = result[0];
                logger.log(chalk.cyan('Translation completed for'), key, chalk.magenta(result[0]))
            }).catch(err => {
                logger.log(chalk.red(`Error translating ${key} :: ${err.message}`));
                failedTranslations[key] = str;
            });
    }

    function translateVariable(str, key) {
        logger.log(chalk.cyan(`Translating variable`), str);
        return translateClient.translate(str, opts)
            .then(result => {
                logger.log(chalk.cyan(`Translated variable`), str, result[0]);
                let idx = _.findIndex(variableDictionary[key], e => e.variable == str);
                variableDictionary[key][idx].translated = result[0];
            }).catch(err => {
                logger.log(chalk.red(`Error translating variable: ${str}`))
                failedTranslations[key] = str;
            });
    }

    function flattenResourceObject(obj, root) {
        let objRoot = root || '';

        _.forOwn(obj, (value, key) => {
            let _key = objRoot ? `${objRoot}.${key}` : key;
            typeof value === 'object' ? flattenResourceObject(value, _key) : tempObj[_key] = value;
        });
    }

    function writeFile() {
        logger.log(chalk.green('Writing translated resource file'));
        let outputFilePath = `${config.dist}/locale-${targetLanguage}.json`;

        fs.writeFile(outputFilePath, JSON.stringify(deepTranslatedResource, null, 2), err => {
            err ?
                logger.log(chalk.red(`Error writing translated resource file`), err) :
                logger.log(chalk.green(`Translated resource file saved to ${outputFilePath}`))
        });
    }

    function writeVariableFile() {
        fs.writeFile(`${config.dist}/locale-${targetLanguage}-var.json`, JSON.stringify(variableDictionary, null, 2), err => {
            err ?
                logger.log(chalk.red(`Error writing translated resource variable file`), err) :
                logger.log(chalk.green(`Translated resource variables file saved`))
        });
        logger.log(chalk.yellow(`Please verify variable translations utilizing the locale-${targetLanguage}-var.json file`))
    }

    function buildVariableDictionary() {
        _.forEach(tempObj, (value, key) => {
            let matches = value.match(/{{(\w*)}}/ig);
            if (matches) {
                _.forEach(matches, match => addVariableToDictionary(key, match));
            }
        });
    }

    function addVariableToDictionary(key, variable) {
        if (!variableDictionary.hasOwnProperty(key)) {
            variableDictionary[key] = [];
        }
        variableDictionary[key].push({variable: variable, translated: ''});
    }

    function cleanUpVariables() {
        let varArr = _.toArray(variableDictionary);
        let flatVarArr = _.flattenDeep(varArr);

        logger.log(chalk.magenta('Attempting to clean up variables'));

        _.forEach(translatedResource, (value, key) => {
            let matches = value.match(/{{(\w*)}}/ig)
            if (matches) {
                _.forEach(variableDictionary[key], (elem) => {
                    if (translatedResource[key]) {
                        let replaceRegex = new RegExp(elem.translated, 'ig')
                        translatedResource[key] = _.replace(value, replaceRegex, elem.variable)
                    }
                })

                // _.forEach(matches, (match) => {                 
                //     let idx = _.findIndex(flatVarArr, e => e.translated === match);
                //     if (idx !== -1) {                        
                //         translatedResource[key] = value.replace(match, flatVarArr[idx].variable);
                //     }
                // });
            }
        });
        writeVariableFile();
    }
}

module.exports = new ChimeTranslator();