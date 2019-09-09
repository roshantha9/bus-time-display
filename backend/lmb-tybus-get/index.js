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


/****************************************************
 * Construct GET reponse params
 ****************************************************/

/****************************************************
 * DB related function
 ****************************************************/
function queryDynamoDB(month, callback){

  console.log("queryDynamoDB:: get sorted item from dynamodb");
  var params = {
    TableName: priData.TBL_TRACKING,
    KeyConditionExpression: '#month = :month',
    ExpressionAttributeNames: {
              '#month': 'month'
    },
    ExpressionAttributeValues: {
            ":month": month
    },
    ScanIndexForward: false,
    Limit: 1
  };

  //console.log(params);

  docClient.query(params, function(err, data) {
    if (err){
      console.log(err);
      callback(null, {statusCode: '500', body:err.stack});
    }
    else{
      var latestTimeStamp = parseInt(data.Items[0].timestamp);
      var latestBusData = data.Items[0].busData;

      var d = new Date(latestTimeStamp *1000);

      //console.log(d.getUTCFullYear() + "-" + d.getUTCMonth() + '-' + d.getUTCDate() + '- ' + d.getUTCHours() + ':' + d.getUTCMinutes());

      // save db query response
      globalDBResponse = {
        'ts' : parseInt(latestTimeStamp),
        'tsObj' : d,
        'busData' : latestBusData
      };

      var latestBusDataF = busTimeFilter(latestBusData, globalDBResponse.tsObj);

      console.log("latestTimeStamp = " + latestTimeStamp);
      console.log("before filtering ===============>");
      console.log(latestBusData);
      console.log("after filtering ===============>");
      console.log(latestBusDataF);

      // send response
      var response_success = {
            "statusCode": 200,
            // "headers": {
            //     "x-custom-header" : "my custom header value"
            // },
            "body": JSON.stringify(generateTextResponse(latestBusDataF), undefined, 2),
            "isBase64Encoded": false
      };
      callback(null, response_success);
    }
  });


}





/******************************************************
 * HELPERS
 ******************************************************/
function resetGlobals(){

}


 // filter out:
 // - 'Service Over'
 // - buses in the far future
 // -
function busTimeFilter(busData, nowObj){
  var busDataF = {}; // filtered result


  //console.log(nowObj.getHours() + ":" + nowObj.getMinutes());


  Object.keys(busData).forEach(function(key) {
    var busTimes = busData[key];

    // for each bus time for this bus route
    var valF = [];
    for(let val of busTimes) {

      if (val.toLowerCase().includes('over') === false){ // if not 'service over'
        if (val.includes('min') === true){
          if (utilTime.getMinsFromString(val) >= 3){
              valF.push(val);
          }else{
            // pass
          }
        }else{
          //console.log(val);
          if (utilTime.isTimeWithinRange(val, nowObj, 60) === true){
            valF.push(val);
          }else{
            // pass
          }
        }
      }else{
        // pass
      }
    }

    //console.log(valF);

    // get rid of duplicates
    if (valF.length > 0){
        var uniqueValF = [... new Set(valF)];
        // sort and convert to uniform units
        busDataF[key] = utilTime.sortTimeListAscending(nowObj, uniqueValF);
    }


    //console.log(busDataF[key]);


  });

  return busDataF;
}




// multiline text response to be displayed by the client
function generateTextResponse(busData){
  var replyBody = {};
  var sortedBuses = Object.keys(busData);
  sortedBuses.sort();

  for (var i = 0; i < sortedBuses.length; i++){
    var k = sortedBuses[i];
    var times = busData[k].join(' , ');
    replyBody['ln'+i] = k + ": " + times;
  }

  return replyBody;
}





/******************************************************
 * MAIN
 ******************************************************/
exports.handler = function(event, context, callback) {
  console.log('starting response handling');

  globalCurrentTime = utilTime.findCurrentTime();


  queryDynamoDB(globalCurrentTime.month, callback);


};
