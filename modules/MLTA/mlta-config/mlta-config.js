#!/usr/bin/env node
var mkdirp = require('mkdirp'); //For making the ~/.mlta folder
var path = require('path'); //Handles path naming
var prompt = require('prompt') //Gets user input
var colors = require("colors/safe"); //Makes user input pretty
var jsonfile = require('jsonfile') //Config files are in JSON format
var fs = require('fs') //fs = filesystem, used for creating files
var _ = require("underscore"); //Various useful utils. Used here to make sure the fields array are all unique

var cm = require('../mlta/config-manager.js');
var fb = require('../mlta/firebase-manager');

var mltaDirPath = path.join(process.env.HOME, '.mlta'); //This basically holds this: ~/.mlta

//Used to create the MLTA home directory if it doesn't already exists. Think of bash's command 'mkdir -p'
mkdirp(mltaDirPath, function(err){
  if (err) {
    console.error(err);
    process.exit(1);
  }
});

//Helper function for handling errors
function onError(err){
  console.log(err);
  return 1;
}

//Helper function for logging
function log(message){
  console.log(message);
}

//Get user input
prompt.message = ("MLTA");
prompt.delimiter = colors.green(":");
prompt.start(); //Doesn't need to be called again
prompt.get({
  properties: {
    name: {
      description: colors.magenta("Project Name:"),
      required: true,
      pattern:  /^\w+$/, //The message below should give a hint as to what this pattern is
      message: 'Project name must be letters, numbers, and underscore only.'
    }
  }
}, function (err, result) {
  if(err){return onError(err);}
  var configFileDir = path.join(mltaDirPath,result.name);
  var configFilePath = configFileDir+'.config';
  cm.getConfigIfExists(result.name,function(err,config){
    if (err) {
      createNewConfig(result.name,configFilePath);//If that file does NOT exist, then it must be a new project
    } else {
      console.log("Config already exists")
      //modifyExistConfig(result.name,configFilePath); //If that file does exist, then this is an existing project
    }
  })
});

//First try and refresh the config file from the DB, TODO: Complete this.
function modifyExistConfig(name,configFile){
  log("Loading configuration for " + name);
  var obj = jsonfile.readFileSync(configFile.toString());
  log(obj);
}


//Get user input to create new project. This will include connecting it to firebase and creating local files for the project.
function createNewConfig(name,configFile){
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
        before: function(value){
          //Check to see if service account file exists
          try{
            fs.accessSync(value, fs.F_OK)
          } catch(e){
            log("Could not find file: " + value);
            process.exit(1);
          }
          return value;
        }
      }

    }
  }, function(err, result){
    if(err){return onError(err);}
    newConfig.author = result.author;
    newConfig.databaseURL = result.db;
    newConfig.serviceAccount = result.sa;

    console.log("Connecting to Firebase")
    fb.connectToFirebase(newConfig,function(err){
      if(err){
        console.log(err);
        process.exit();
      }

      console.log("Connected!");

      cm.saveConfig(newConfig,function(err){
        if(err){
          console.log(err);
        } else {
          log("Configuration saved!");
        }
          process.exit();
      });
    });

  });
}
