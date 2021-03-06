#!/usr/bin/env node

var mkdirp = require('mkdirp'); //For making the ~/.mlta folder
var path = require('path'); //Handles path naming
var prompt = require('prompt') //Gets user input
var colors = require("colors/safe"); //Makes user input pretty
var jsonfile = require('jsonfile') //Config files are in JSON format
var fs = require('fs') //fs = filesystem, used for creating files
var _ = require("underscore"); //Various useful utils. Used here to make sure the fields array are all unique
var program = require('commander'); //For taking arguments

//Logging stuff
var tracer = require('tracer');
tracer.setLevel(5) //'log':0, 'trace':1, 'debug':2, 'info':3, 'warn':4, 'error':5
var logger = tracer.console({
    format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
    dateformat: "HH:MM:ss.L"
});


//Other MLTA modules
var cm = require('../mlta/config-manager.js');
var fb = require('../mlta/firebase-manager');

var mltaDirPath = path.join(process.env.HOME, '.mlta'); //This basically holds this: ~/.mlta

//Used to create the MLTA home directory if it doesn't already exists. Think of bash's command 'mkdir -p'
mkdirp(mltaDirPath, function(err) {
    if(err) {
        logger.error("Unable to create MLTA folder at %s", mltaDirPath);
        return onError(err)
    }
});

//Helper function for handling errors
function onError(err) {
    logger.error('Message: %s', err.message)
    logger.debug('Stack: %j', err);
    return 1;
}

function listSavedConfigurations() {
  console.log("Listing saved configurations:")
  list = fs.readdirSync(mltaDirPath)
  for(i=0; i <list.length; i++){
    console.log('\t'+list[i].substring(0,list[i].length-7)); //7 = length of ".config"
  }
}

function deleteSavedConfiguration(name) {
  deletePath = mltaDirPath + '/' + name + '.config'
  fs.unlinkSync(deletePath)
}

program
    .version('0.0.1')
    .option('-l, --list', 'Lists saved configurations')
    .option('-d, --delete <config>', 'Name of configuration to delete.')
    .parse(process.argv);


if(program.list) {
    listSavedConfigurations();
} else if(program.delete){
  console.log('Deleting ' + program.delete);
  deleteSavedConfiguration(program.delete);
} else {
    //Get user input
    prompt.message = ("MLTA");
    prompt.delimiter = colors.green(":");
    prompt.start(); //Doesn't need to be called again
    prompt.get({
        properties: {
            name: {
                description: colors.magenta("Project Name:"),
                required: true,
                pattern: /^\w+$/, //The message below should give a hint as to what this pattern is
                message: 'Project name must be letters, numbers, and underscore only.'
            }
        }
    }, function(err, result) {
        if(err) {
            return onError(err);
        }
        var configFileDir = path.join(mltaDirPath, result.name);
        var configFilePath = configFileDir + '.config';
        cm.getConfigIfExists(result.name, function(err, config) {
            if(err) {
                createNewConfig(result.name, configFilePath, function(err) {
                    if(err) {
                        return onError(err);
                    }

                }); //If that file does NOT exist, then it must be a new project
            } else {
                logger.info('Config file with name %s already exists.', result.name)
                modifyExistConfig(result.name,configFilePath); //If that file does exist, then this is an existing project
            }
        })
    });

}

//First try and refresh the config file from the DB
function modifyExistConfig(name, configFile) {
    logger.info('Loading config file for %s', name);
    var vim = require('child_process').spawn('vi', [configFile], {stdio: 'inherit'});
    vim.on('exit', process.exit);
}


//Get user input to create new project. This will include connecting it to firebase and creating local files for the project.
function createNewConfig(name, configFile, done) {
    var newConfig = new Object();
    newConfig.name = name;
    prompt.get({
        properties: {
            author: {
                description: colors.magenta("Your Name:"),
                required: true
            },
            db: {
                description: colors.magenta("Firebase Database URL:"),
                required: true
            },
            sa: {
                description: colors.magenta("Firebase Service Account JSON File Location (Please enter full path name):"),
                required: true,
                before: function(value) {
                    //Check to see if service account file exists
                    try {
                        fs.accessSync(value, fs.F_OK)
                    } catch(e) {
                        return done(new Error("Could not find file " + value));
                    }
                    return value;
                }
            }

        }
    }, function(err, result) {
        if(err) {
            return onError(err);
        }
        newConfig.author = result.author;
        newConfig.databaseURL = result.db;
        newConfig.serviceAccount = result.sa;
        logger.info('Connecting to Firebase')
        fb.connectToFirebase(newConfig, function(err) {
            if(err) {
                return onError(err);
            }

            logger.info('Connected!');

            cm.saveConfig(newConfig, function(err) {
                if(err) {
                    return onError(err);
                } else {
                    logger.info('Configuration saved!')
                    logger.debug('Saved configuration: %j', newConfig);
                    return;
                }
            });
        });

    });
}
