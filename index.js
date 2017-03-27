'use strict';

let chalk = require('chalk');
let clear = require('clear');
let figlet = require('figlet');
let inquirer = require('inquirer');
let Translator = require('./translator');
let chimeTranslator = require('./chime-translator');

//Start up the utility
clear();
console.log(chalk.blue(figlet.textSync('Chime Translator', {
    horizontalLayout: 'full'
})));

inquirer.prompt({
    name: 'targetLang',
    type: 'input',
    message: 'Enter the target language code for this translation session:',
    validate: (value) => value.length ? true : 'Please enter a translation code'
}).then(userResponse =>
 //Translator.translate(userResponse.targetLang)
 chimeTranslator.translateDictionary(userResponse.targetLang)
 );