/*jshint esversion: 6 */
const https = require('https');
const querystring = require('querystring');
const AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-1'});

// Create DynamoDB document client
const docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

// local imports
const utilTime = require('./util-time');
const priData = require('./pri-settings');

/* global variables */
var globalCurrentTime = {};
var globalDBResponse = {};


var hashKey = "month";
var rangeKey = null;
var tableName = priData.TBL_TRACKING;




 function buildKey(obj){
     var key = {};
     key[hashKey] = obj[hashKey];
     if(rangeKey){
         key[rangeKey] = obj[rangeKey];
     }

     return key;
 }




function emptyDynamoDB(month, callback){



  var scanParams = {
      TableName: tableName,
  };

  docClient.scan(scanParams, function(err, data) {
      if (err) console.log(err.stack); // an error occurred
      else {
         data.Items.forEach(function(obj,i){
             console.log(i);
              console.log(obj);
              var params = {
                  TableName: scanParams.TableName,
                  Key: buildKey(obj),
                  ReturnValues: 'NONE', // optional (NONE | ALL_OLD)
                  ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
                  ReturnItemCollectionMetrics: 'NONE', // optional (NONE | SIZE)
              };

              docClient.delete(params, function(err, data) {
                  if (err){
                    console.log(err.stack); // an error occurred
                    callback(null, {statusCode: '500', body:err.stack});
                  }
                  else{
                    console.log(data); // successful response
                    var response_success = {
                          "statusCode": 200,
                          "body": JSON.stringify({}, undefined, 2),
                          "isBase64Encoded": false
                    };
                    callback(null, response_success);
                  }
              });

         });
      }
  });

}


function createTable(){
  
}


/******************************************************
 * HELPERS
 ******************************************************/




/******************************************************
 * MAIN
 ******************************************************/
exports.handler = function(event, context, callback) {
  console.log('starting response handling');

  globalCurrentTime = utilTime.findCurrentTime();


  deleteTable(callback);

  createTable(callback);


};
