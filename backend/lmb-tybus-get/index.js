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
var globalDBResponse = {
  'ts' : 1234,
  'tsObj' : null,
  'busData' : {}
};


const TIME_FILTER_MAX_DELAY = 60;
const OUTPUT_BUS_LABEL_COL_WIDTH = 4; // chars wide

// for debug
const DEBUG_SEND_DUMMY_DATA = false;

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
      console.log (data);
      
      var latestTimeStamp = parseInt(data.Items[0].timestamp);
      var latestBusData = data.Items[0].busData;

      var d = new Date(latestTimeStamp *1000);

      //console.log(" TS =" +  utilTime.convertDateTimeObjtoStr(d));

      // save db query response
      globalDBResponse.ts = parseInt(latestTimeStamp);
      globalDBResponse.tsObj = d;
      globalDBResponse.busData = latestBusData;
      

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
            "body": JSON.stringify(generateGETResponseBodyText(latestBusDataF), undefined, 2),
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


function _busLabelFormat(b){
  var lbl='';
  if (b.length == 3){
    lbl = b + ' ';
  }
  else if (b.length == 4){
    lbl = b;
  }else{
    lbl = b;
  }
  return lbl;
}


 // filter out:
 // - 'Service Over'
 // - buses in the far future 
function busTimeFilter(busData, nowObj){
  var busDataF = {}; // filtered result
  //console.log(nowObj.getHours() + ":" + nowObj.getMinutes());

  if (DEBUG_SEND_DUMMY_DATA){
    return busTimeFilterDummyData();
  }

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
          if (utilTime.isTimeWithinRange(val, nowObj, TIME_FILTER_MAX_DELAY) === true){
            valF.push(val);
          }else{
            // pass
          }
        }
      }else{
        // pass
      }
    }

    // get rid of duplicates
    if (valF.length > 0){
        var uniqueValF = [... new Set(valF)];
        // sort and convert to uniform units
        busDataF[key] = utilTime.sortTimeListAscending(nowObj, uniqueValF);
    }
  });

  return busDataF;
}



function busTimeFilterDummyData(){
  var busDataF = {};
  for (var i = 0; i < priData.BUSROUTE_OUTPUT_ORDER.length; i++){
    var k = priData.BUSROUTE_OUTPUT_ORDER[i];
    busDataF[k] = ["10m", "10m", "10m"];    
  }
  return busDataF;
}

/*
// multiline text response to be displayed by the client
function generateGETResponseBodyDict(busData){
  var replyBody = {};  
  if (Object.keys(busData).length > 0){       
    for (var i = 0; i < priData.BUSROUTE_OUTPUT_ORDER.length; i++){
      var k = priData.BUSROUTE_OUTPUT_ORDER[i];
      var times = busData[k].join(',');
      replyBody['ln'+i] = k + ": " + times;
    }
  }else{
    // pass
  }

  return replyBody;
}
*/


function generateGETResponseBodyText(busData){
  var replyBody = "";
  // add timestamp (from DB entry)
  replyBody += "Time: " + utilTime.convertDateTimeObjtoStr(globalDBResponse.tsObj) + "**";

  if (Object.keys(busData).length > 0){        
    for (var i = 0; i < priData.BUSROUTE_OUTPUT_ORDER.length; i++){
      var k = priData.BUSROUTE_OUTPUT_ORDER[i];
      if (k in busData){
        if (busData[k].length>1){
          var times = busData[k].join(',');
          replyBody += _busLabelFormat(k) + ": " + times + "**";
        }else{
          replyBody += _busLabelFormat(k) + ": " + busData[k] + "**";
        }   
      }         
    }    
  }else{
    // pass
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
