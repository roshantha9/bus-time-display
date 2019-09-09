/*jshint esversion: 6 */
const https = require('https');
const querystring = require('querystring');
const AWS = require('aws-sdk');
AWS.config.update({region: 'ap-northeast-1'});

// Create DynamoDB document client
const docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

// local imports
const priData = require('./pri-settings');
const utilTime = require('./util-time');


/* global variables */
var globalCompletedReqs = 0;
var globalBusStopReqData = {}; // key : bus stop names
var globalCurrentTime = {};



/****************************************************
 * Construct GET/POST req params
 ****************************************************/
function constructPOSTData(stopName){
  var pdatastr = querystring.stringify({
      'Mode' : '10',
      'StopName': stopName,
      'Lang': 'En'
  });
  return pdatastr;
}

function constructPOSTOptions(sessionID){
  var poptsstr = {
    hostname: priData.BUSDATA_HOSTNAME,
    path: priData.BUSDATA_PATH,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        //'Content-Length': Buffer.byteLength(postData),
        'Cookie': `Language=en_us; ASP.NET_SessionId=${sessionID}; googtrans=/en/en`,
    }
  };
  return poptsstr;
}


function constructGETOptions(){
  var getopts = {
      'hostname': priData.SESSIONID_HOSTNAME,
      'path' : priData.SESSIONID_PATH,
      'user-agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0',
      'referer' : 'https://www.google.com.tw/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Pragma': 'no-cache',
  };
  return getopts;
}

/****************************************************
 * DB related function
 ****************************************************/
function addToDynamoDB(busData, month, ts, callback){

  var itemData = {
    "month" : month,
    "timestamp" : ts,
    "busData" : busData
  };

  console.log("addToDynamoDB:: going to do the insert");

  docClient.put({
        TableName: priData.TBL_TRACKING,
        Item: itemData
    }, function(err, data) {
        if (err) {
            console.log(err.stack);
            callback(null, {statusCode: '500', body:err.stack});
        } else {
          console.log("DynamoDB [tbl-tybus-track] - item added successfully");
          // send response
          var response_success = {
                "statusCode": 200,
                "headers": {
                    "x-custom-header" : "my custom header value"
                },
                "body": JSON.stringify(busData, undefined, 2),
                "isBase64Encoded": false
          };
          callback(null, response_success);
        }
    });
}


function createBusStopReq(sessionID, stopName, context, callback) {

  var postData = constructPOSTData(stopName); // construct POST data
  var postOptions = constructPOSTOptions(sessionID); // construct POST options

  // Set up the request
  var postReq = https.request(postOptions, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {

          console.log("createBusStopReq:: data received");
          //console.log('Response: ' + chunk);
          globalBusStopReqData[stopName] = chunk;
          globalCompletedReqs++;

          // the end - we report
          if (globalCompletedReqs == priData.BUS_STOP_NAMES.length){
            console.log("createBusStopReq:: all reqs done !");
            var bdata = getBusStopData(globalBusStopReqData);

            // save in DB
            console.log("going to add to DB");
            addToDynamoDB(bdata, globalCurrentTime.month, globalCurrentTime.formatUnix, callback);

          }
      });
  });

  postReq.on('error', error => {
    console.error(error);
    callback(null, { statusCode: '500', body: error });
  });

  // post the data
  postReq.write(postData);
  postReq.end();

}



/*
 * Format Responses
 */
function getBusStopData(allRespData){
  var dataByBusKey = {};
  var empty = {};
  var countAdded=0, countTotal=0;

  Object.keys(allRespData).forEach(function(key) {
      var val = allRespData[key];
      var filtData = val.split("|")[1];
      if (filtData !== ""){
          filtData = filtData.split("@");
          for (var i = 0; i < filtData.length; i++){
            // add to dict
            var record = filtData[i].split(',');
            bus = record[1];
            route = record[2];
            time = record[3];

            routeSrcStr = route.substring(0,10).toLowerCase();

            if (bus !== "") {
              countTotal++;
              if (isRouteInBlacklist(bus, priData.BUSROUTE_BLACKLIST) === false){
                // check if first portion of the string contains zhongli
                if ( routeSrcStr.includes("zhongli") === false ){
                  countAdded++;
                  if (bus in dataByBusKey){
                    dataByBusKey[bus].push(time);
                  }else{
                    dataByBusKey[bus] = [time];
                  }
                }else{
                  // ignore where zhongli station is source
                  console.log(bus + "--" + route.substring(0,route.length).toLowerCase() + " --- " + time);
                }
              }
            }
          }

      }else{
        console.log("Error:: " + key + "=> NO DATA" );
      }
    });

    console.log("countAdded = " + countAdded + "/" + countTotal);

    return dataByBusKey;
}

/******************************************************
 * HELPERS
 ******************************************************/
 function resetGlobals(){
  globalCompletedReqs = 0;
  globalBusStopReqData = {};
}

function isRouteInBlacklist(r, bl){
  try{
    for (var i = 0; i < bl.length; i++){
      if (r == bl[i]){
        return true;
      }
    }

    // extra check for "L" buses
    if (r.includes("L") === true){
      return true;
    }

    return false;
  }catch (e){
    return false;
  }

}








/******************************************************
 * MAIN
 ******************************************************/
exports.handler = function(event, context, callback) {
  console.log('start request to ' + priData.SESSIONID_URL);

  globalCurrentTime = utilTime.findCurrentTime();

  /* only continue if it's active time to store bus time */
  //if (false){ // < -- testing
  if (utilTime.isNowActiveTime(globalCurrentTime.hours,globalCurrentTime.minutes) === false){
    addToDynamoDB({}, globalCurrentTime.month, globalCurrentTime.formatUnix, callback);
  }else{


    https.get(constructGETOptions(), function(res) {

      console.log('End request to ' + priData.SESSIONID_URL);
      console.log("Got response: " + res.statusCode);

      var cookieData = res.headers['set-cookie'];

      var regex = /SessionId=(.*?);/;
      var sessionID = regex.exec(cookieData)[1];
      console.log(sessionID);

      resetGlobals();

      // send off one request for each bus stop
      for (var i = 0; i < priData.BUS_STOP_NAMES.length; i++) {
        createBusStopReq(sessionID, priData.BUS_STOP_NAMES[i], context, callback);
      }



    }).on('error', function(e) {
      console.log("Got error: " + e.message);
      context.done(null, 'FAILURE');
    });


  }

};
