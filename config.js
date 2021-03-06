'use strict';

const config = {
    googleProjectID: 'chimetranslator', // Google dev project ID
    googleKeyFilePath: './src/ChimeTranslator-2e5de9ddd46f.json', // Path to keyfile downloaded from google app portal
    dictionary: '../Chime_2.6_Dev/chimesh/content/localizations/locale-en.json', //  './src/locale-en.json', // Path to base text resource file
    dist: '../Chime_2.6_Dev/chimesh/content/localizations', // './translations', // Where will we write out the translated resource files
    baseLang: 'en'
};

module.exports = config;